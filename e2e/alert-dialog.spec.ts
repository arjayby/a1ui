import { expect, test } from "./fixtures";

const POPUP = '[data-slot="alert-dialog-content"]';

test("popup springs in, shakes on a backdrop click, and fades out before unmounting", async ({ page }) => {
  await page.goto("/components/alert-dialog");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");

  const opening = await frame.evaluate(async (element, popup) => {
    element.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    const samples: { opacity: number; scale: number }[] = [];
    const began = performance.now();
    while (performance.now() - began < 250) {
      const node = document.querySelector<HTMLElement>(popup);
      if (node) {
        const style = getComputedStyle(node);
        samples.push({ opacity: Number(style.opacity), scale: new DOMMatrix(style.transform).a });
      }
      await new Promise(requestAnimationFrame);
    }
    return samples;
  }, POPUP);
  expect(opening.some(({ opacity }) => opacity > 0.05 && opacity < 0.95)).toBe(true);
  expect(opening.some(({ scale }) => scale > 0.94 && scale < 0.995)).toBe(true);
  const dialog = page.getByRole("alertdialog", { name: "Delete this project?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Delete project" })).toHaveAttribute(
    "data-variant",
    "destructive",
  );

  // The backdrop covers the page; click its corner, well away from the centered popup.
  const shake = await page.evaluate(async (popup) => {
    const node = document.querySelector<HTMLElement>(popup)!;
    const start = node.getBoundingClientRect().left;
    document.querySelector<HTMLElement>('[data-slot="alert-dialog-backdrop"]')!.click();
    const offsets: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 300) {
      offsets.push(node.getBoundingClientRect().left - start);
      await new Promise(requestAnimationFrame);
    }
    return offsets;
  }, POPUP);
  expect(Math.min(...shake)).toBeLessThan(-3);
  expect(Math.max(...shake)).toBeGreaterThan(3);
  await page.mouse.click(8, 8);
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute("data-shaking");

  const closing = await page.evaluate(async (popup) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 400) {
      const node = document.querySelector<HTMLElement>(popup);
      samples.push(node ? Number(getComputedStyle(node).opacity) : -1);
      await new Promise(requestAnimationFrame);
    }
    return samples;
  }, POPUP);
  // Base UI keeps the popup mounted mid-fade, then it leaves the DOM.
  expect(closing.some((opacity) => opacity > 0.05 && opacity < 0.95)).toBe(true);
  await expect(page.locator(POPUP)).toHaveCount(0);
  await expect(page.locator('[data-slot="alert-dialog-backdrop"]')).toHaveCount(0);
  await expect(frame.getByRole("button", { name: "Delete project" })).toBeFocused();

  await frame.getByRole("button", { name: "Delete project" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete project" }).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
});

test("default action fits a phone and closes instantly with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/alert-dialog");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Action:/ }).click();
  await page.getByRole("menuitem", { name: "default", exact: true }).click();
  await page.locator(".demo-frame").getByRole("button", { name: "Delete project" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Delete project" })).toHaveAttribute(
    "data-variant",
    "default",
  );
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(15);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  await page.mouse.click(8, 8);
  await expect(dialog).not.toHaveAttribute("data-shaking");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(POPUP)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the alert dialog", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/alert-dialog"]').click();
  await expect(page.getByRole("heading", { name: "Alert Dialog", exact: true })).toBeVisible();
  const item = await (await request.get("/r/alert-dialog.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/alert-dialog.tsx");
  expect(item.files[0].content).toContain("export function AlertDialogAction");
  const guide = await request.get("/docs/components/alert-dialog.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/alert-dialog");
});
