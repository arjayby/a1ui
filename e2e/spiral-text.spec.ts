import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/spiral-text");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("the shockwave stays circular and centered throughout release", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await page.clock.install();
  await spiral.hover();
  await page.mouse.down();
  await page.clock.runFor(1300);
  await page.mouse.up();

  for (const step of [300, 300, 500]) {
    await page.clock.runFor(step);
    const radiusSpreads = await spiral.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      return Array.from(element.querySelectorAll("text"), (text) => {
        const matrix = text.getScreenCTM();
        if (!matrix) throw new Error("Text has no screen transform");
        const x = text.getAttribute("x")!.split(" ").map(Number);
        const y = text.getAttribute("y")!.split(" ").map(Number);
        const radii = x.map((value, index) => {
          const point = new DOMPoint(value, y[index]).matrixTransform(matrix);
          return Math.hypot(point.x - center.x, point.y - center.y);
        });
        return Math.max(...radii) - Math.min(...radii);
      });
    });
    expect(radiusSpreads.length).toBeGreaterThan(1);
    expect(Math.max(...radiusSpreads)).toBeLessThan(0.1);
  }
});

test("press and release animate without rebuilding glyph layout", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.evaluate((element) => {
    const observer = new MutationObserver((records) => {
      if (records.some((record) => ["x", "y", "rotate"].includes(record.attributeName ?? ""))) {
        element.setAttribute("data-glyph-layout-changed", "true");
      }
    });
    observer.observe(element, { subtree: true, attributes: true, attributeFilter: ["x", "y", "rotate"] });
  });
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  await page.waitForTimeout(600);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await expect(spiral).not.toHaveAttribute("data-glyph-layout-changed", "true");
});

test("text rotates by default while the background stays fixed", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotatingLayer = spiral.locator("div").first();
  const transform = () => rotatingLayer.evaluate((element) => getComputedStyle(element).transform);

  await expect(page.getByRole("button", { name: "Rotate text" })).toHaveCount(0);
  await expect(rotatingLayer).toHaveCSS("animation-play-state", "running");
  const restingTransform = await transform();
  await expect.poll(transform).not.toBe(restingTransform);

  // Tightening and release must still work while rotation is running.
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");

  await expect(spiral.locator(":scope > svg")).toHaveCSS("transform", "none");
});

test("rotation respects changes to reduced motion", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotatingLayer = spiral.locator("div").first();
  await expect(rotatingLayer).toHaveCSS("animation-name", "spin");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rotatingLayer).toHaveCSS("animation-name", "none");
  await expect(rotatingLayer).toHaveCSS("transform", "none");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(rotatingLayer).toHaveCSS("animation-name", "spin");
});

test("rotation pauses offscreen and resumes when visible", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotation = spiral.locator("[data-spiral-rotation]");
  await spiral.scrollIntoViewIfNeeded();
  await expect(rotation).toHaveCSS("animation-play-state", "running");
  await page.getByRole("heading", { name: "API reference" }).scrollIntoViewIfNeeded();
  await expect(rotation).toHaveCSS("animation-play-state", "paused");
  await spiral.scrollIntoViewIfNeeded();
  await expect(rotation).toHaveCSS("animation-play-state", "running");
});

for (const releaseOutside of [false, true]) {
  test(`spiral text moves and returns to rest after releasing ${releaseOutside ? "outside" : "inside"}`, async ({
    page,
  }) => {
    const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
    await spiral.scrollIntoViewIfNeeded();
    const text = spiral.locator("text").first();
    const coil = spiral.locator("[data-spiral-coil]").nth(5);
    const restingTransform = await coil.evaluate((element) => getComputedStyle(element).transform);
    const restingX = await text.getAttribute("x");
    const restingY = await text.getAttribute("y");
    if (!restingX || !restingY) throw new Error("Spiral Text has no glyph coordinates");

    await spiral.hover();
    await page.mouse.down();
    await expect(spiral).toHaveAttribute("data-interaction", "tightening");
    await expect(coil).not.toHaveCSS("transform", restingTransform);

    if (releaseOutside) {
      const box = await spiral.boundingBox();
      if (!box) throw new Error("Spiral Text has no visible bounds");
      await page.mouse.move(box.x - 10, box.y + box.height / 2);
    }
    await page.mouse.up();
    await expect(spiral).toHaveAttribute("data-interaction", "releasing");
    await expect(spiral).toHaveAttribute("data-interaction", "resting");
    await expect(coil).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await expect(text).toHaveAttribute("x", restingX);
    await expect(text).toHaveAttribute("y", restingY);
  });
}

test("reduced motion keeps the spiral still throughout a press and release", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.scrollIntoViewIfNeeded();
  const text = spiral.locator("text").first();
  // Observe the entire interaction so a transient geometry change also fails the test.
  await text.evaluate((element) => {
    const observer = new MutationObserver((records) => {
      if (records.some((record) => ["x", "y"].includes(record.attributeName ?? ""))) {
        element.setAttribute("data-geometry-changed", "true");
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ["x", "y"] });
  });
  await page.clock.install();
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "pressed-reduced");
  await page.clock.runFor(1300);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await page.clock.runFor(1300);
  await expect(text).not.toHaveAttribute("data-geometry-changed", "true");
});
