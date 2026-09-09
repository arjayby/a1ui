import { expect, test, type Locator } from "@playwright/test";

const pixels = (canvas: Locator) => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
const sampleAfter = (canvas: Locator, delay = 180) =>
  canvas.evaluate(async (element: HTMLCanvasElement, milliseconds) => {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
    return element.toDataURL();
  }, delay);

test.beforeEach(async ({ page }) => {
  await page.goto("/components/ascii-terrain");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
  await page.evaluate(() => document.fonts.ready);
});

test("draws, pauses in place, resumes, and creates a new landscape", async ({ page }) => {
  const canvas = page.locator("canvas");
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => {
      const data = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
      return data.some((value, index) => index % 4 === 3 && value > 0);
    }),
  ).toBe(true);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator('[data-slot="ascii-terrain"]')).toHaveAttribute("data-motion", "paused");
  const stopped = await pixels(canvas);
  expect(await sampleAfter(canvas)).toBe(stopped);
  await page.getByRole("button", { name: "New terrain" }).click();
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const regenerated = await pixels(canvas);
  expect(regenerated).not.toBe(stopped);
  expect(await sampleAfter(canvas)).toBe(regenerated);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  expect(await sampleAfter(canvas)).not.toBe(regenerated);
});

test("reduced motion is static through pointer and keyboard input and can be changed live", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-slot="ascii-terrain"]')).toHaveAttribute("data-motion", "reduced");
  const canvas = page.locator("canvas");
  const stopped = await pixels(canvas);
  const control = page.getByRole("button", { name: "Interact with terrain" });
  await control.click({ position: { x: 150, y: 150 } });
  await control.press("ArrowRight");
  await control.press("Enter");
  expect(await sampleAfter(canvas)).toBe(stopped);
  await expect(page.getByText("Static terrain. Reduced motion is on.")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await sampleAfter(canvas)).not.toBe(stopped);
});

test("resizes without overflow and repaints inherited colors while paused", async ({ page }) => {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  for (const width of [390, 1920, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(async () => {
      const dimensions = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => ({
        css: canvas.getBoundingClientRect().width,
        backing: canvas.width,
        parent: canvas.parentElement!.clientWidth,
        viewport: window.innerWidth,
        right: canvas.getBoundingClientRect().right,
      }));
      expect(dimensions.css).toBe(dimensions.parent);
      expect(dimensions.backing).toBeGreaterThan(0);
      expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport);
    }).toPass();
  }
  const before = await pixels(page.locator("canvas"));
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect.poll(() => pixels(page.locator("canvas"))).not.toBe(before);
});

test("catalog includes a painted static preview and a working component link", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "ASCII Terrain", exact: true });
  const card = page.locator("article").filter({ has: link });
  const canvas = card.locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const before = await pixels(canvas);
  expect(await sampleAfter(canvas)).toBe(before);
  await card.getByRole("link", { name: "ASCII Terrain", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ASCII Terrain", exact: true })).toBeVisible();
});

test("paints interaction changes on consecutive browser frames", async ({ page }, testInfo) => {
  const control = page.getByRole("button", { name: "Interact with terrain" });
  const bounds = (await control.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.35, bounds.y + bounds.height * 0.55);
  const sampling = page.locator("canvas").evaluate(
    (canvas: HTMLCanvasElement) =>
      new Promise<{
        changed: number;
        frames: number;
        medianMs: number;
        p95Ms: number;
      }>((resolve) => {
        const context = canvas.getContext("2d")!;
        const intervals: number[] = [];
        let previousTime = 0;
        let previousHash = 0;
        let changed = 0;
        function sample(time: number) {
          const data = context.getImageData(0, Math.floor(canvas.height * 0.55), canvas.width, 1).data;
          let hash = 0;
          for (let index = 3; index < data.length; index += 4) hash = (hash * 31 + data[index]) | 0;
          if (previousTime) {
            intervals.push(time - previousTime);
            if (hash !== previousHash) changed++;
          }
          previousTime = time;
          previousHash = hash;
          if (intervals.length < 60) requestAnimationFrame(sample);
          else {
            const sorted = intervals.toSorted((a, b) => a - b);
            resolve({ changed, frames: intervals.length, medianMs: sorted[30], p95Ms: sorted[57] });
          }
        }
        requestAnimationFrame(sample);
      }),
  );
  await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.45, { steps: 20 });
  await control.click({ clickCount: 3 });
  const result = await sampling;
  await testInfo.attach("terrain-frame-pacing", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  console.log("Terrain browser frame sample:", result);
  expect(result.changed / result.frames).toBeGreaterThan(0.85);
});
