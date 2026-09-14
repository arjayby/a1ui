import { expect, test, type Locator } from "@playwright/test";

const coordinates = (art: Locator) =>
  art
    .locator("text")
    .evaluateAll((nodes) =>
      nodes.map((node) => [Number(node.getAttribute("x")), Number(node.getAttribute("y"))]),
    );

test.beforeEach(async ({ page }) => {
  await page.goto("/components/ascii-morph");
  await expect(page.locator('[data-slot="ascii-morph"]')).toHaveAttribute("data-motion", "enabled");
});

test("renders without hydration errors and cycles with click, Enter, Space, and arrows", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.reload();
  const root = page.locator('[data-slot="ascii-morph"]');
  const art = root.locator("svg");
  const control = page.getByRole("button", { name: "Change ASCII shape" });
  await expect(root).toHaveAttribute("data-motion", "enabled");
  await expect(art.locator("text")).toHaveCount(512);
  const globe = await coordinates(art);
  await control.click();
  await expect(root).toHaveAttribute("data-shape", "flower");
  await expect(root).toHaveAttribute("data-state", "idle");
  const flower = await coordinates(art);
  expect(flower).not.toEqual(globe);
  await control.press("Enter");
  await expect(root).toHaveAttribute("data-shape", "a1");
  await expect(root).toHaveAttribute("data-state", "idle");
  expect(await coordinates(art)).not.toEqual(flower);
  await control.press("Space");
  await expect(root).toHaveAttribute("data-shape", "globe");
  await expect(root).toHaveAttribute("data-state", "idle");
  expect(await coordinates(art)).toEqual(globe);
  await control.press("ArrowLeft");
  await expect(root).toHaveAttribute("data-shape", "a1");
  await expect(control).toBeFocused();
  await expect(root.getByRole("status")).toHaveText("A1 monogram");
  expect(errors).toEqual([]);
});

test("paints continuous travel on display frames through rapid clicks", async ({ page }, testInfo) => {
  const root = page.locator('[data-slot="ascii-morph"]');
  const result = await root.evaluate(async (element) => {
    const nodes = [...element.querySelectorAll("svg text")];
    const button = element.querySelector("button")!;
    const sample = () =>
      nodes.map((node) => [Number(node.getAttribute("x")), Number(node.getAttribute("y"))]);
    const glyphs = nodes.map((node) => node.textContent);
    const intervals: number[] = [];
    let before = sample();
    let changed = 0;
    let maximumStep = 0;
    let last = 0;
    let index = 0;
    button.click();
    await new Promise<void>((resolve) => {
      function tick(time: number) {
        const next = sample();
        if (last) {
          intervals.push(time - last);
          const distance = Math.max(
            ...next.map((point, i) => Math.hypot(point[0] - before[i][0], point[1] - before[i][1])),
          );
          if (distance > 0.001) changed++;
          maximumStep = Math.max(maximumStep, distance);
        }
        before = next;
        last = time;
        if (++index % 12 === 0) button.click();
        if (index < 72) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    const sorted = intervals.toSorted((a, b) => a - b);
    return {
      changed,
      frames: intervals.length,
      maximumStep,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      sameGlyphs: nodes.every(
        (node, i) => node === element.querySelectorAll("svg text")[i] && node.textContent === glyphs[i],
      ),
    };
  });
  await testInfo.attach("ascii-morph-frame-pacing", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  console.log("ASCII Morph browser frames:", result);
  expect(result.changed / result.frames).toBeGreaterThan(0.95);
  expect(result.maximumStep).toBeLessThan(32);
  expect(result.sameGlyphs).toBe(true);
  await expect(root).toHaveAttribute("data-state", "idle");
});

test("honors live reduced motion and keeps both theme and responsive geometry", async ({ page }) => {
  const root = page.locator('[data-slot="ascii-morph"]');
  const art = root.locator("svg");
  await page.getByRole("button", { name: "Change ASCII shape" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(root).toHaveAttribute("data-motion", "reduced");
  await expect(root).toHaveAttribute("data-state", "idle");
  const flower = await coordinates(art);
  await page.getByRole("button", { name: "Change ASCII shape" }).press("Enter");
  await expect(root).toHaveAttribute("data-shape", "a1");
  await expect(root).toHaveAttribute("data-state", "idle");
  const monogram = await coordinates(art);
  expect(monogram).not.toEqual(flower);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const box = (await root.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await coordinates(art)).toEqual(monogram);
  }
  const beforeColor = await art.locator("g").evaluate((node) => getComputedStyle(node).fill);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect
    .poll(() => art.locator("g").evaluate((node) => getComputedStyle(node).fill))
    .not.toBe(beforeColor);
  expect(await coordinates(art)).toEqual(monogram);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Change ASCII shape" }).click();
  await expect(root).toHaveAttribute("data-state", "morphing");
});

test("catalog contains a static preview and links to the demo", async ({ page }) => {
  await page.goto("/");
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("link", { name: "ASCII Morph", exact: true }) });
  const root = card.locator('[data-slot="ascii-morph"]');
  await expect(root).toHaveAttribute("data-motion", "static");
  await expect(root.locator("text")).toHaveCount(512);
  await expect(root.locator("button")).toHaveCount(0);
  await card.getByRole("link").click();
  await expect(page.getByRole("button", { name: "Change ASCII shape" })).toBeVisible();
});
