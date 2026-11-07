import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const popup = '[data-slot="dialog-content"]';

// Samples the popup's scale for a few frames after `act` runs in the page.
async function sampleScale(page: Page, act: "open" | "close") {
  return page.evaluate(async (act) => {
    const trigger = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-trigger"]')].find(
      (button) => button.textContent?.includes("Edit project"),
    )!;
    if (act === "open") trigger.click();
    else document.querySelector<HTMLButtonElement>('[data-slot="dialog-corner-close"]')!.click();
    const scales: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 220) {
      await new Promise(requestAnimationFrame);
      const element = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
      if (!element) break;
      const transform = getComputedStyle(element).transform;
      scales.push(transform === "none" ? 1 : new DOMMatrix(transform).a);
    }
    const element = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
    const rect = trigger.getBoundingClientRect();
    const [x, y] = (element?.style.transformOrigin ?? "").split(" ").map(Number.parseFloat);
    return {
      scales,
      // Where the transform origin sits on screen, compared with the trigger's centre.
      origin: element ? { x: element.offsetLeft + x, y: element.offsetTop + y } : null,
      trigger: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    };
  }, act);
}

test("popup grows out of its trigger, traps focus, and shrinks back on close", async ({ page }) => {
  await page.goto("/components/dialog");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  const opening = await sampleScale(page, "open");
  expect(opening.scales.some((scale) => scale > 0.45 && scale < 0.95)).toBe(true);
  expect(Math.abs(opening.origin!.x - opening.trigger.x)).toBeLessThan(2);
  expect(Math.abs(opening.origin!.y - opening.trigger.y)).toBeLessThan(2);
  const dialog = page.getByRole("dialog", { name: "Edit project" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox")).toBeFocused();

  // Tab at a human pace: Base UI's focus guards hand focus back asynchronously, so keys
  // pressed faster than that hand-off can slip past the trap even on a plain Base UI dialog.
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
  }

  const closing = await sampleScale(page, "close");
  expect(closing.scales.some((scale) => scale > 0.45 && scale < 0.95)).toBe(true);
  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit project" })).toBeFocused();

  // Escape closes, and reopening while the exit plays reuses the same popup.
  await page.getByRole("button", { name: "Edit project" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(popup)).toHaveAttribute("data-state", "closed");
  await page.getByRole("button", { name: "Edit project" }).click();
  await expect(page.locator(popup)).toHaveCount(1);
  await expect(page.locator(popup)).toHaveAttribute("data-state", "open");

  // An outside click on the backdrop closes it.
  await page.mouse.click(8, 8);
  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.locator('[data-slot="dialog-backdrop"]')).toHaveCount(0);
});

test("buttons-only dialogs ignore outside clicks", async ({ page }) => {
  await page.goto("/components/dialog");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Dismiss:/ }).click();
  await page.getByRole("menuitem", { name: "buttons only", exact: true }).click();
  await page.getByRole("button", { name: "Edit project" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit project" });
  await expect(dialog).toHaveAttribute("data-state", "open");
  await page.mouse.click(8, 8);
  await page.waitForTimeout(400);
  await expect(dialog).toHaveAttribute("data-state", "open");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(popup)).toHaveCount(0);
});

test("rises as a bottom sheet on mobile and only fades with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/dialog");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const opening = await sampleScale(page, "open");
  expect(opening.scales.every((scale) => scale === 1)).toBe(true);
  const dialog = page.getByRole("dialog", { name: "Edit project" });
  await expect(dialog).toHaveAttribute("data-sheet", "true");
  await expect(dialog).toHaveCSS("opacity", "1");
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeCloseTo(390, 0);
  expect(box.y + box.height).toBeCloseTo(844, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(popup)).toHaveCount(0);
});

test("catalog, registry, and agent docs include the dialog", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/dialog"]').click();
  await expect(page.getByRole("heading", { name: "Dialog", exact: true })).toBeVisible();
  const item = await (await request.get("/r/dialog.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/dialog.tsx");
  expect(item.files[0].content).toContain("export function DialogContent");
  const guide = await request.get("/docs/components/dialog.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/dialog");
});
