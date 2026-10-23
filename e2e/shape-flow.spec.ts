import { expect, test, type Locator } from "@playwright/test";

async function expectReadableFlow(flow: Locator) {
  const result = await flow.evaluate((element) => {
    const glyphRows = [...element.querySelectorAll('[data-slot="shape-flow-duck-row"]')];
    const container = element.getBoundingClientRect();
    const lines = [...element.querySelectorAll('[data-slot="shape-flow-line"]')];
    return {
      original: element.querySelector("p")!.textContent!.replace(/\s/g, ""),
      rendered: lines
        .map((line) => line.textContent)
        .join("")
        .replace(/\s/g, ""),
      overlaps: lines.some((line) => {
        const bounds = line.getBoundingClientRect();
        // Inspect rendered glyph bounds independently of the wrapping geometry.
        return glyphRows.some((row) => {
          const glyphs = row.getBoundingClientRect();
          return (
            bounds.left < glyphs.right &&
            bounds.right > glyphs.left &&
            bounds.top < glyphs.bottom &&
            bounds.bottom > glyphs.top
          );
        });
      }),
      overflows: lines.some((line) => {
        const bounds = line.getBoundingClientRect();
        return bounds.left < container.left - 1 || bounds.right > container.right + 1;
      }),
    };
  });
  expect(result.rendered).toBe(result.original);
  expect(result.overlaps).toBe(false);
  expect(result.overflows).toBe(false);
}

test("text follows the ASCII duck silhouette and idle motion respects reduced motion", async ({ page }) => {
  await page.goto("/blocks/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const besideHead = await flow.evaluate((element) => {
    const shape = element.querySelector('[data-slot="shape-flow-handle"]')!.getBoundingClientRect();
    return [...element.querySelectorAll('[data-slot="shape-flow-line"]')].some((line) => {
      const rect = line.getBoundingClientRect();
      return (
        line.textContent!.trim().length > 0 &&
        rect.left > shape.left + shape.width / 2 &&
        rect.left < shape.right - shape.width * 0.1 &&
        rect.top < shape.top + shape.height * 0.45 &&
        rect.bottom > shape.top + shape.height * 0.1
      );
    });
  });
  expect(besideHead).toBe(true);
  const duck = flow.locator('[data-slot="shape-flow-duck"]');
  await expect(duck).toHaveCSS("animation-name", "a1ui-shape-flow-float");
  await expectReadableFlow(flow);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(duck).toHaveCSS("animation-name", "none");
  await expectReadableFlow(flow);
});

test("dragging reflows every word around the duck and releases pointer capture", async ({ page }) => {
  await page.goto("/blocks/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  await expectReadableFlow(flow);
  const handle = flow.getByRole("button", { name: "Move duck" });
  await handle.scrollIntoViewIfNeeded();
  const before = await handle.boundingBox();
  const initialLines = await flow.locator('[data-slot="shape-flow-line"]').allTextContents();
  await page.mouse.move(before!.x + before!.width / 4, before!.y + before!.height / 4);
  await page.mouse.down();
  await page.mouse.move(before!.x + before!.width / 4 - 90, before!.y + before!.height / 4 + 70, {
    steps: 12,
  });
  await expect(handle).toHaveAttribute("data-dragging", "true");
  await expect(handle.locator('[data-slot="shape-flow-duck"]')).toHaveCSS("animation-play-state", "paused");
  await page.mouse.up();
  await expect(handle).toHaveAttribute("data-dragging", "false");
  await expect(handle).toHaveCSS("outline-style", "none");
  expect((await handle.boundingBox())!.x).toBeLessThan(before!.x - 60);
  expect(await flow.locator('[data-slot="shape-flow-line"]').allTextContents()).not.toEqual(initialLines);
  await expectReadableFlow(flow);
});

test("keyboard movement, reset and responsive layout preserve readable text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blocks/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const handle = flow.getByRole("button", { name: "Move duck" });
  await handle.focus();
  const initial = await handle.boundingBox();
  const area = await flow.boundingBox();
  expect(initial!.x + initial!.width / 2).toBeCloseTo(area!.x + area!.width / 2, 0);
  expect(initial!.y + initial!.height / 2).toBeCloseTo(area!.y + area!.height / 2, 0);
  await page.keyboard.press("Shift+ArrowRight");
  await expect(handle).toHaveCSS("outline-style", "solid");
  expect((await handle.boundingBox())!.x - initial!.x).toBeCloseTo(32, 0);
  await page.keyboard.press("Home");
  expect((await handle.boundingBox())!.x).toBeCloseTo(initial!.x, 0);
  for (const width of [752, 390, 280, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => (await flow.boundingBox())!.width).toBeLessThan(width);
    await expect(async () => {
      await expectReadableFlow(flow);
    }).toPass();
    const duck = await handle.boundingBox();
    const bounds = await flow.boundingBox();
    expect(duck!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(duck!.x + duck!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    expect(duck!.x + duck!.width / 2).toBeCloseTo(bounds!.x + bounds!.width / 2, 0);
    expect(duck!.y + duck!.height / 2).toBeCloseTo(bounds!.y + bounds!.height / 2, 0);
  }
});

test("catalog preview fits its card and centers the duck on desktop and mobile", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const card = page.locator(".catalog-card").filter({
      has: page.getByRole("link", { name: "Shape Flow", exact: true }),
    });
    const flow = card.locator('[data-slot="shape-flow"]');
    await expect(flow).toHaveAttribute("data-state", "ready");
    const preview = await card.locator(".catalog-preview").boundingBox();
    const shape = await card.locator('[data-slot="shape-flow-handle"]').boundingBox();
    expect(shape!.x + shape!.width / 2).toBeCloseTo(preview!.x + preview!.width / 2, 0);
    expect(shape!.y + shape!.height / 2).toBeCloseTo(preview!.y + preview!.height / 2, 0);
    const clipsText = await card.evaluate((element) => {
      const bounds = element.querySelector(".catalog-preview")!.getBoundingClientRect();
      return [...element.querySelectorAll('[data-slot="shape-flow-line"]')].some((line) => {
        const rect = line.getBoundingClientRect();
        return rect.top < bounds.top || rect.bottom > bounds.bottom - 20;
      });
    });
    expect(clipsText).toBe(false);
    await expectReadableFlow(flow);
  }
});

test("server-rendered text remains readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/blocks/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "fallback");
  await expect(flow.locator("p")).toBeVisible();
  await expect(flow.locator("p")).toContainText("more than one shape a story can take.");
  await context.close();
});

test("touch dragging and cancellation release the duck", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/blocks/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const handle = flow.getByRole("button", { name: "Move duck" });
  await handle.scrollIntoViewIfNeeded();
  const before = await handle.boundingBox();
  const x = before!.x + before!.width / 4;
  const y = before!.y + before!.height / 4;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x - 30, y: y + 35 }],
  });
  await expect(handle).toHaveAttribute("data-dragging", "true");
  await expect(handle.locator('[data-slot="shape-flow-duck"]')).toHaveCSS("animation-play-state", "paused");
  expect((await handle.boundingBox())!.x).toBeLessThan(before!.x - 20);
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(handle).toHaveAttribute("data-dragging", "false");
  await expectReadableFlow(flow);
  await context.close();
});
