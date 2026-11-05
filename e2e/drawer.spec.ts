import { expect, test, type Locator, type Page } from "@playwright/test";

/** Reads the drag offset the surface is translated by, along one axis. */
function translation(surface: Locator, axis: "x" | "y") {
  return surface.evaluate((element, horizontal) => {
    const transform = getComputedStyle(element).transform;
    if (transform === "none") return 0;
    const matrix = new DOMMatrixReadOnly(transform);
    return horizontal ? matrix.m41 : matrix.m42;
  }, axis === "x");
}

async function press(page: Page, surface: Locator) {
  const box = (await surface.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + 60 };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  return point;
}

test("sheet springs up, scales the stage, rubber-bands, and dismisses on a long drag", async ({ page }) => {
  await page.goto("/components/drawer");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");

  const tops = await frame.evaluate(async (element) => {
    element.querySelector<HTMLButtonElement>('[data-slot="drawer-trigger"]')!.click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 400) {
      const sheet = document.querySelector('[data-slot="drawer"]');
      if (sheet) samples.push(sheet.getBoundingClientRect().top / innerHeight);
      await new Promise(requestAnimationFrame);
    }
    return samples;
  });
  const dialog = page.getByRole("dialog", { name: "Move goal" });
  await expect(dialog).toBeVisible();
  const settled = (await dialog.boundingBox())!.y / page.viewportSize()!.height;
  expect(tops.some((top) => top > settled + 0.05 && top < 0.98)).toBe(true);

  const wrapper = frame.locator('[data-slot="drawer-scale-wrapper"]');
  await expect
    .poll(() => wrapper.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a))
    .toBeLessThan(0.95);

  const surface = page.locator('[data-slot="drawer-surface"]');
  const start = await press(page, surface);
  await page.mouse.move(start.x, start.y - 100, { steps: 5 });
  await page.mouse.move(start.x, start.y - 200, { steps: 5 });
  const pulled = await translation(surface, "y");
  expect(pulled).toBeLessThan(-10);
  expect(pulled).toBeGreaterThan(-120);
  await page.mouse.up();
  await expect.poll(() => translation(surface, "y")).toBeCloseTo(0, 0);
  await expect(dialog).toBeVisible();

  const grab = await press(page, surface);
  await page.mouse.move(grab.x, grab.y + 60, { steps: 4 });
  expect(await translation(surface, "y")).toBeGreaterThan(40);
  await page.waitForTimeout(100);
  await page.mouse.up();
  await expect.poll(() => translation(surface, "y")).toBeCloseTo(0, 0);
  await expect(dialog).toBeVisible();

  const drag = await press(page, surface);
  await page.mouse.move(drag.x, drag.y + 300, { steps: 12 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await expect(dialog).toBeHidden();
  await expect
    .poll(() => wrapper.evaluate((element) => getComputedStyle(element).transform))
    .toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
  await expect(frame.getByRole("button", { name: "Open drawer" })).toBeFocused();
});

test("right sheet opens instantly without a rubber band on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/drawer");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Side:/ }).click();
  await page.getByRole("menuitem", { name: "right", exact: true }).click();
  const frame = page.locator(".demo-frame");
  await frame.getByRole("button", { name: "Open drawer" }).click();

  const dialog = page.getByRole("dialog", { name: "Move goal" });
  await expect(dialog).toHaveAttribute("data-side", "right");
  const box = (await dialog.boundingBox())!;
  expect(box.x + box.width).toBeCloseTo(390, 0);
  expect(box.height).toBeCloseTo(844, 0);

  const surface = page.locator('[data-slot="drawer-surface"]');
  const start = await press(page, surface);
  await page.mouse.move(start.x - 120, start.y, { steps: 6 });
  expect(await translation(surface, "x")).toBe(0);
  await page.mouse.up();

  await dialog.getByRole("button", { name: "Increase goal" }).click();
  await expect(dialog).toContainText("360");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the drawer", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/drawer"]').click();
  await expect(page.getByRole("heading", { name: "Drawer", exact: true })).toBeVisible();
  const item = await (await request.get("/r/drawer.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/drawer.tsx");
  expect(item.files[0].content).toContain("export function Drawer");
  const guide = await request.get("/docs/components/drawer.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/drawer");
});
