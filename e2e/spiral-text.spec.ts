import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/spiral-text");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

for (const releaseOutside of [false, true]) {
  test(`spiral text moves and returns to rest after releasing ${releaseOutside ? "outside" : "inside"}`, async ({
    page,
  }) => {
    const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
    await spiral.scrollIntoViewIfNeeded();
    const text = spiral.locator("text");
    const restingX = await text.getAttribute("x");
    const restingY = await text.getAttribute("y");
    if (!restingX || !restingY) throw new Error("Spiral Text has no glyph coordinates");

    await spiral.hover();
    await page.mouse.down();
    await expect(spiral).toHaveAttribute("data-interaction", "tightening");
    await expect(text).not.toHaveAttribute("x", restingX);
    await expect(text).not.toHaveAttribute("y", restingY);

    if (releaseOutside) {
      const box = await spiral.boundingBox();
      if (!box) throw new Error("Spiral Text has no visible bounds");
      await page.mouse.move(box.x - 10, box.y + box.height / 2);
    }
    await page.mouse.up();
    await expect(spiral).toHaveAttribute("data-interaction", "releasing");
    await expect(spiral).toHaveAttribute("data-interaction", "resting");
    await expect(text).toHaveAttribute("x", restingX);
    await expect(text).toHaveAttribute("y", restingY);
  });
}

test("reduced motion keeps the spiral still throughout a press and release", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.scrollIntoViewIfNeeded();
  const text = spiral.locator("text");
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
