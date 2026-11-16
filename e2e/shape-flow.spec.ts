import { type Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

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

async function duckScale(handle: Locator) {
  return handle
    .locator('[data-slot="shape-flow-duck"]')
    .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
}

test("text follows the ASCII duck silhouette and the duck rests without looping motion", async ({ page }) => {
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
  // No slow idle oscillation: the duck only moves when someone moves it.
  const duck = flow.locator('[data-slot="shape-flow-duck"]');
  await expect(duck).toHaveCSS("animation-name", "none");
  await expect(duck).toHaveCSS("transform", "none");
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
  await expect.poll(() => duckScale(handle)).toBeCloseTo(1.04, 2);
  // The duck stays under the pointer where it was grabbed, moved by its transform alone.
  await expect.poll(async () => (await handle.boundingBox())!.x).toBeCloseTo(before!.x - 90, 0);
  expect((await handle.boundingBox())!.y).toBeCloseTo(before!.y + 70, 0);
  expect(await handle.evaluate((element) => [element.style.left, element.style.top])).toEqual(["", ""]);
  await expectReadableFlow(flow);
  // Hold still before letting go, so the release carries no momentum.
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(handle).toHaveAttribute("data-dragging", "false");
  await expect(handle).toHaveCSS("outline-style", "none");
  expect((await handle.boundingBox())!.x).toBeCloseTo(before!.x - 90, 0);
  expect(await flow.locator('[data-slot="shape-flow-line"]').allTextContents()).not.toEqual(initialLines);
  await expectReadableFlow(flow);
  await expect.poll(() => duckScale(handle)).toBe(1);
  // The released duck settles inside the paragraph, however hard it was thrown.
  await expect(async () => {
    const duck = (await handle.boundingBox())!;
    const bounds = (await flow.boundingBox())!;
    expect(duck.x).toBeGreaterThanOrEqual(bounds.x - 0.5);
    expect(duck.y).toBeGreaterThanOrEqual(bounds.y - 0.5);
    expect(duck.x + duck.width).toBeLessThanOrEqual(bounds.x + bounds.width + 0.5);
    expect(duck.y + duck.height).toBeLessThanOrEqual(bounds.y + bounds.height + 0.5);
  }).toPass();
  await expectReadableFlow(flow);
});

test("a flick carries the duck past the release point, and reduced motion sets it down in place", async ({
  page,
}) => {
  await page.goto("/blocks/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const handle = flow.getByRole("button", { name: "Move duck" });
  await handle.scrollIntoViewIfNeeded();

  const throwDuck = async (distance: number) => {
    const start = (await handle.boundingBox())!;
    const x = start.x + start.width / 2;
    const y = start.y + start.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + distance, y, { steps: 4 });
    await page.mouse.up();
    // Let any momentum play out before measuring where the duck came to rest.
    await page.waitForTimeout(1200);
    // The duck tracks the pointer 1:1, so it was let go this far from where it started.
    return { released: start.x + distance, rested: (await handle.boundingBox())!.x };
  };

  const flick = await throwDuck(-60);
  expect(flick.rested).toBeLessThan(flick.released - 10);
  await expectReadableFlow(flow);

  // Motion reads the preference when the block mounts.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(flow).toHaveAttribute("data-state", "ready");
  await handle.scrollIntoViewIfNeeded();
  const still = await throwDuck(60);
  expect(still.rested).toBeCloseTo(still.released, 0);
  expect(await duckScale(handle)).toBe(1);
  await expectReadableFlow(flow);
});

test("an edge gives under the pointer, and stops the duck dead with reduced motion", async ({ page }) => {
  await page.goto("/blocks/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const handle = flow.getByRole("button", { name: "Move duck" });
  await handle.scrollIntoViewIfNeeded();

  // Drags the duck 300px past the paragraph's left edge and reports how far out it follows.
  const pullPastEdge = async () => {
    const start = (await handle.boundingBox())!;
    const bounds = (await flow.boundingBox())!;
    const x = start.x + start.width / 2;
    const y = start.y + start.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - (start.x - bounds.x) - 300, y, { steps: 6 });
    await expect(handle).toHaveAttribute("data-dragging", "true");
    return () => handle.boundingBox().then((duck) => bounds.x - duck!.x);
  };

  let overhang = await pullPastEdge();
  // It follows with growing resistance: well short of the pointer, and never a full duck out.
  await expect.poll(overhang).toBeGreaterThan(20);
  expect(await overhang()).toBeLessThan(80);
  await expectReadableFlow(flow);
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect.poll(overhang).toBeCloseTo(0, 0);
  await expectReadableFlow(flow);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(flow).toHaveAttribute("data-state", "ready");
  await handle.scrollIntoViewIfNeeded();
  overhang = await pullPastEdge();
  await expect.poll(overhang).toBeCloseTo(0, 0);
  // The held duck dims instead of lifting.
  await expect(handle.locator('[data-slot="shape-flow-duck"]')).toHaveCSS("opacity", "0.75");
  expect(await duckScale(handle)).toBe(1);
  await page.mouse.up();
  await expect(handle.locator('[data-slot="shape-flow-duck"]')).toHaveCSS("opacity", "1");
  expect(await overhang()).toBeCloseTo(0, 0);
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
  // With reduced motion a step is placed on the next frame, without a spring.
  await expect.poll(async () => (await handle.boundingBox())!.x - initial!.x).toBeCloseTo(32, 0);
  await page.keyboard.press("Home");
  await expect.poll(async () => (await handle.boundingBox())!.x).toBeCloseTo(initial!.x, 0);
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
  await expect.poll(() => duckScale(handle)).toBeCloseTo(1.04, 2);
  expect((await handle.boundingBox())!.x).toBeLessThan(before!.x - 20);
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(handle).toHaveAttribute("data-dragging", "false");
  await expectReadableFlow(flow);
  await context.close();
});
