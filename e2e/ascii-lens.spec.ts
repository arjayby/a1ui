import { type Locator, type Page } from "@playwright/test";
import { expect, revealed, test } from "./fixtures";

const pixels = (canvas: Locator) => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
// A hash of the canvas on each of the next animation frames.
const frames = (canvas: Locator, count: number) =>
  canvas.evaluate(
    (element: HTMLCanvasElement, total) =>
      new Promise<string[]>((resolve) => {
        const seen: string[] = [];
        function sample() {
          seen.push(element.toDataURL());
          if (seen.length < total) requestAnimationFrame(sample);
          else resolve(seen);
        }
        requestAnimationFrame(sample);
      }),
    count,
  );

async function open(page: Page) {
  const lens = page.locator('[data-slot="ascii-lens"]');
  await expect(lens).toHaveAttribute("data-state", "ready");
  await page.evaluate(() => document.fonts.ready);
  await revealed(page);
  const control = page.getByRole("button", { name: /^Explore .* with lens$/ });
  await control.scrollIntoViewIfNeeded();
  return { canvas: lens.locator("canvas"), control, bounds: (await control.boundingBox())! };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/ascii-lens");
});

test("opens under the pointer, follows it, and closes back to plain ASCII", async ({ page }) => {
  const { canvas, bounds } = await open(page);
  const plain = await pixels(canvas);
  await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + bounds.height * 0.5);
  // The lens settles, then holds still without drawing new frames.
  await expect.poll(async () => new Set(await frames(canvas, 4)).size).toBe(1);
  const opened = await pixels(canvas);
  expect(opened).not.toBe(plain);
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.5);
  await expect.poll(() => pixels(canvas)).not.toBe(opened);
  await page.mouse.move(bounds.x - 20, bounds.y - 20);
  await expect.poll(() => pixels(canvas)).toBe(plain);
});

test("steps with the keyboard and closes on Escape", async ({ page }) => {
  const { canvas, control } = await open(page);
  const plain = await pixels(canvas);
  await control.focus();
  await control.press("Home");
  await expect.poll(async () => new Set(await frames(canvas, 4)).size).toBe(1);
  const centered = await pixels(canvas);
  expect(centered).not.toBe(plain);
  await control.press("ArrowRight");
  await expect.poll(() => pixels(canvas)).not.toBe(centered);
  await control.press("Escape");
  await expect.poll(() => pixels(canvas)).toBe(plain);
});

test("reduced motion fades the lens in place and still closes it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { canvas, bounds } = await open(page);
  const plain = await pixels(canvas);
  await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + bounds.height * 0.5);
  await expect.poll(async () => new Set(await frames(canvas, 4)).size).toBe(1);
  expect(await pixels(canvas)).not.toBe(plain);
  await page.mouse.move(bounds.x - 20, bounds.y - 20);
  await expect.poll(() => pixels(canvas)).toBe(plain);
});
