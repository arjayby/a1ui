import { expect, test, type Page } from "@playwright/test";

type Sample = { count: number; x: number; width: number; scale: number; opacity: number; text: string };

// Samples the tooltip on every frame for the given time, counted from when it first appears.
function sample(page: Page, ms: number) {
  return page.evaluate(async (ms) => {
    const samples: Sample[] = [];
    const began = performance.now();
    let appeared: number | undefined;
    while (appeared === undefined ? performance.now() - began < 5000 : performance.now() - appeared < ms) {
      const popups = document.querySelectorAll<HTMLElement>('[data-slot="tooltip-content"]');
      const popup = popups[0];
      if (popup) {
        appeared ??= performance.now();
        const rect = popup.getBoundingClientRect();
        const style = getComputedStyle(popup);
        samples.push({
          count: popups.length,
          x: rect.x,
          width: rect.width,
          scale: style.transform === "none" ? 1 : new DOMMatrix(style.transform).a,
          opacity: Number(style.opacity),
          text: popup.textContent ?? "",
        });
      }
      await new Promise(requestAnimationFrame);
    }
    return samples;
  }, ms);
}

// Waits until the demo answers hover, then lets the tooltip close so the next open is a fresh one.
async function openDemo(page: Page) {
  await page.goto("/components/tooltip");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const tooltip = page.getByRole("tooltip");
  await expect(async () => {
    await page.mouse.move(0, 0);
    await frame.getByRole("button", { name: "Strikethrough" }).hover();
    await expect(tooltip).toBeVisible({ timeout: 1500 });
  }).toPass();
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  await page.waitForTimeout(500);
  return { frame, tooltip };
}

test("springs out of its trigger and glides to the next one as a single tooltip", async ({ page }) => {
  const { frame, tooltip } = await openDemo(page);

  await frame.getByRole("button", { name: "Bold" }).hover();
  const opening = await sample(page, 600);
  expect(opening.some((frame) => frame.scale > 0.88 && frame.scale < 0.99)).toBe(true);
  await expect(tooltip).toHaveText("Bold⌘B");
  const start = await tooltip.boundingBox();

  await frame.getByRole("button", { name: "Link" }).hover();
  const gliding = await sample(page, 450);
  await expect(tooltip).toHaveText("Add a link to the selected text⌘K");
  const end = (await tooltip.boundingBox())!;
  expect(gliding.every((frame) => frame.count === 1 && frame.opacity === 1)).toBe(true);
  expect(gliding.some((frame) => frame.x > start!.x + 4 && frame.x < end.x - 4)).toBe(true);
  expect(gliding.some((frame) => frame.width > start!.width + 4 && frame.width < end.width - 4)).toBe(true);
  expect(gliding.some((frame) => frame.text.includes("Bold") && frame.text.includes("Add a link"))).toBe(
    true,
  );
  await expect(frame.getByRole("button", { name: "Link" })).toHaveAccessibleDescription(
    "Add a link to the selected text ⌘K",
  );

  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
});

test("moves instantly on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { frame, tooltip } = await openDemo(page);

  await frame.getByRole("button", { name: "Italic" }).hover();
  await expect(tooltip).toHaveText("Italic⌘I");
  const start = (await tooltip.boundingBox())!;
  await frame.getByRole("button", { name: "Inline code" }).hover();
  const moving = await sample(page, 300);
  await expect(tooltip).toHaveText("Format as inline code");
  const end = (await tooltip.boundingBox())!;
  expect(moving.every((frame) => frame.scale === 1 && frame.opacity === 1)).toBe(true);
  expect(moving.some((frame) => frame.x > start.x + 4 && frame.x < end.x - 4)).toBe(false);
  expect(end.x).toBeGreaterThanOrEqual(0);
  expect(end.x + end.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the tooltip", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/tooltip"]').click();
  await expect(page.getByRole("heading", { name: "Tooltip", exact: true })).toBeVisible();
  const item = await (await request.get("/r/tooltip.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/tooltip.tsx");
  expect(item.files[0].content).toContain("export function TooltipProvider");
  const guide = await request.get("/docs/components/tooltip.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/tooltip");
});
