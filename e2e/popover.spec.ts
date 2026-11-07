import { expect, test } from "./fixtures";

test("share button morphs into the panel and collapses back on close", async ({ page }) => {
  await page.goto("/components/popover");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  await expect(frame.getByRole("switch", { name: "Morph" })).toBeChecked();
  const trigger = frame.getByRole("button", { name: "Share" });
  const start = (await trigger.boundingBox())!;

  const widths = await trigger.evaluate(async (element: HTMLElement) => {
    element.click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 600) {
      const surface = document.querySelector('[role="dialog"] [data-slot="popover-surface"]');
      if (surface) samples.push(surface.getBoundingClientRect().width);
      await new Promise(requestAnimationFrame);
    }
    return samples;
  });
  const dialog = frame.getByRole("dialog", { name: "Share this project" });
  await expect(dialog).toBeVisible();
  const panel = (await dialog.boundingBox())!;
  // The shape starts at the trigger's size and grows in place from its top edge, centered on it.
  expect(widths.some((width) => width > start.width + 4 && width < panel.width - 4)).toBe(true);
  // Focusing the copy button can scroll the page, so compare against where the trigger is now.
  const anchor = (await trigger.boundingBox())!;
  expect(Math.abs(panel.x + panel.width / 2 - (anchor.x + anchor.width / 2))).toBeLessThan(2);
  expect(Math.abs(panel.y - anchor.y)).toBeLessThan(2);
  await expect(frame.getByRole("button", { name: "Copy link" })).toBeFocused();

  const sampling = page.evaluate(async () => {
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 600) {
      const surface = document.querySelector('[data-slot="popover-trigger"] [data-slot="popover-surface"]');
      if (surface) samples.push(surface.getBoundingClientRect().width);
      await new Promise(requestAnimationFrame);
    }
    return samples;
  });
  await page.keyboard.press("Escape");
  const closing = await sampling;
  expect(closing.some((width) => width > start.width + 4)).toBe(true);
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("morph panel stays visible when reopened while it is still closing", async ({ page }) => {
  await page.goto("/components/popover");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const trigger = frame.getByRole("button", { name: "Share" });
  const dialog = frame.getByRole("dialog", { name: "Share this project" });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(500);
  // Measure after opening: focusing the copy button can scroll the page.
  const box = (await trigger.boundingBox())!;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
});

test("with morph off, the panel grows out of its trigger and closes on Escape", async ({ page }) => {
  await page.goto("/components/popover");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  await frame.getByRole("switch", { name: "Morph" }).click();
  const trigger = frame.getByRole("button", { name: "Share", exact: true });
  const scales = await trigger.evaluate(async (element: HTMLElement) => {
    element.click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 600) {
      const popup = document.querySelector<HTMLElement>('[role="dialog"]');
      if (popup) samples.push(new DOMMatrix(getComputedStyle(popup).transform).a);
      await new Promise(requestAnimationFrame);
    }
    return samples;
  });
  expect(scales.some((scale) => scale > 0.89 && scale < 0.99)).toBe(true);
  const dialog = page.getByRole("dialog", { name: "Share this project" });
  await expect(dialog).toBeVisible();
  const [panel, anchor] = await Promise.all([dialog.boundingBox(), trigger.boundingBox()]);
  expect(panel!.y).toBeGreaterThan(anchor!.y + anchor!.height);
  await expect(dialog.getByRole("button", { name: "Copy link" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("morph panel fits a 390px screen and opens instantly with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/popover");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  await frame.getByRole("button", { name: "Share" }).click();
  const dialog = frame.getByRole("dialog", { name: "Share this project" });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((element) =>
      [...element.querySelectorAll("*")].every((node) => getComputedStyle(node).opacity === "1"),
    ),
  ).toBe(true);
  const [panel, box] = await Promise.all([dialog.boundingBox(), frame.boundingBox()]);
  expect(panel!.x).toBeGreaterThanOrEqual(box!.x);
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(box!.x + box!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("catalog, registry, and agent docs include the popover", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/popover"]').click();
  await expect(page.getByRole("heading", { name: "Popover", exact: true })).toBeVisible();
  const item = await (await request.get("/r/popover.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/popover.tsx");
  expect(item.files[0].content).toContain("export function PopoverContent");
  const guide = await request.get("/docs/components/popover.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/popover");
});
