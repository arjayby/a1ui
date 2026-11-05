import { expect, test, type Locator, type Page } from "@playwright/test";

// Under load the docs page can still shift after hydration, so wait for the target to hold still.
async function settledBox(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  let previous = "";
  await expect
    .poll(
      async () => {
        const box = await target.boundingBox();
        const current = JSON.stringify(box && [Math.round(box.x), Math.round(box.y)]);
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { intervals: [150] },
    )
    .toBe(true);
  return (await target.boundingBox())!;
}

// Base UI turns off pointer events on the other triggers while a hover-opened panel is up and turns
// them back on once the pointer leaves, so glide over like a person instead of using hover().
async function pointAt(page: Page, target: Locator) {
  const box = await settledBox(target);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
}

async function openDemo(page: Page) {
  await page.goto("/components/navigation-menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  return page.locator(".demo-frame");
}

test("one panel glides and resizes between sections while the content slides across", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const frame = await openDemo(page);
  const popup = page.locator('[data-slot="navigation-menu-popup"]');
  const products = frame.getByRole("button", { name: "Products" });

  await pointAt(page, products);
  await expect(products).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: /Edge Functions/ })).toBeVisible();
  const start = (await settledBox(popup))!;

  const samples = page.evaluate(async () => {
    const result: { left: number; contents: number; exitShift: number | null }[] = [];
    const began = performance.now();
    while (performance.now() - began < 900) {
      const panel = document.querySelector('[data-slot="navigation-menu-popup"]');
      const leaving = document.querySelector<HTMLElement>(
        '[data-slot="navigation-menu-content"][data-ending-style]',
      );
      if (panel) {
        result.push({
          left: panel.getBoundingClientRect().left,
          contents: document.querySelectorAll('[data-slot="navigation-menu-content"]').length,
          exitShift: leaving
            ? leaving.getBoundingClientRect().left - leaving.parentElement!.getBoundingClientRect().left
            : null,
        });
      }
      await new Promise(requestAnimationFrame);
    }
    return result;
  });
  await pointAt(page, frame.getByRole("button", { name: "Solutions" }));
  const frames = await samples;

  await expect(frame.getByRole("button", { name: "Solutions" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: /Enterprise/ })).toBeVisible();
  await expect(popup).toHaveCount(1);
  const end = (await settledBox(popup))!;
  expect(end.x).toBeGreaterThan(start.x + 20);
  // The single panel passed through positions between the two sections instead of jumping.
  expect(frames.some((f) => f.left > start.x + 4 && f.left < end.x - 4)).toBe(true);
  // Both sections were on screen at once, the old one sliding out to the left.
  expect(frames.some((f) => f.contents === 2)).toBe(true);
  expect(frames.some((f) => f.exitShift !== null && f.exitShift < -4)).toBe(true);
  await expect(frame.locator('[data-slot="navigation-menu-highlight"]')).toHaveCount(1);
  await expect(frame.getByRole("button", { name: "Solutions" }).locator("svg")).toHaveCSS(
    "transform",
    /matrix\(-1, .*\)/,
  );

  // Keyboard: move between triggers, open with Enter, close with Escape.
  await page.mouse.move(5, 5, { steps: 4 });
  await expect(popup).toHaveCount(0);
  await products.focus();
  await page.keyboard.press("ArrowRight", { delay: 40 });
  await page.waitForTimeout(120);
  await page.keyboard.press("ArrowRight", { delay: 40 });
  const resources = frame.getByRole("button", { name: "Resources" });
  await expect(resources).toBeFocused();
  await page.waitForTimeout(120);
  await page.keyboard.press("Enter", { delay: 40 });
  await expect(resources).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Changelog" })).toBeVisible();
  await page.waitForTimeout(120);
  await page.keyboard.press("Escape", { delay: 40 });
  await expect(resources).toHaveAttribute("aria-expanded", "false");
  await expect(resources).toBeFocused();
});

// Phones tap rather than hover, which Base UI opens on press without blocking the other triggers.
test.describe("on a phone", () => {
  test.use({ hasTouch: true });

  test("sections stack inside a 390px screen and swap instantly with reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const frame = await openDemo(page);
    const popup = page.locator('[data-slot="navigation-menu-popup"]');

    const products = frame.getByRole("button", { name: "Products" });
    await settledBox(products);
    await products.tap();
    await expect(products).toHaveAttribute("aria-expanded", "true");
    const panel = (await popup.boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(390);
    // The product cards stack in one column.
    const [first, second] = await Promise.all([
      page.getByRole("link", { name: /Edge Functions/ }).boundingBox(),
      page.getByRole("link", { name: /Postgres/ }).boundingBox(),
    ]);
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
    expect(await popup.evaluate((element) => getComputedStyle(element).transitionDuration)).toMatch(/^0s/);

    const resources = frame.getByRole("button", { name: "Resources" });
    await settledBox(resources);
    await resources.tap();
    await expect(resources).toHaveAttribute("aria-expanded", "true");
    const heights = await page.evaluate(async () => {
      const read = () =>
        document.querySelector('[data-slot="navigation-menu-popup"]')!.getBoundingClientRect().height;
      const now = read();
      await new Promise((resolve) => setTimeout(resolve, 400));
      return [now, read(), document.querySelectorAll('[data-slot="navigation-menu-content"]').length];
    });
    expect(heights[0]).toBe(heights[1]);
    expect(heights[2]).toBe(1);
    await expect(page.getByRole("link", { name: "Support" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test("catalog, registry, and agent docs include the navigation menu", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/navigation-menu"]').click();
  await expect(page.getByRole("heading", { name: "Navigation Menu", exact: true })).toBeVisible();
  const item = await (await request.get("/r/navigation-menu.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/navigation-menu.tsx");
  expect(item.files[0].content).toContain("export function NavigationMenuContent");
  const guide = await request.get("/docs/components/navigation-menu.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/navigation-menu");
});
