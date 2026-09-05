import { expect, test, type Locator } from "@playwright/test";

async function expectReadableFlow(flow: Locator) {
  const result = await flow.evaluate((element) => {
    const shape = element.querySelector('[data-slot="shape-flow-handle"]')!.getBoundingClientRect();
    const polygons = [...element.querySelectorAll("polygon")];
    const toLocal = polygons[0].getScreenCTM()!.inverse();
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
        // Test the actual SVG fill, independently of the layout's geometry.
        for (let y = Math.max(bounds.top, shape.top); y < Math.min(bounds.bottom, shape.bottom); y++) {
          for (let x = Math.max(bounds.left, shape.left); x < Math.min(bounds.right, shape.right); x++) {
            const point = new DOMPoint(x, y).matrixTransform(toLocal);
            if (polygons.some((polygon) => polygon.isPointInFill(point))) return true;
          }
        }
        return false;
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

test("text fills the gaps between the X arms", async ({ page }) => {
  await page.goto("/components/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const gaps = await flow.evaluate((element) => {
    const shape = element.querySelector('[data-slot="shape-flow-handle"]')!.getBoundingClientRect();
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const lines = [...element.querySelectorAll('[data-slot="shape-flow-line"]')];
    const inner = lines.filter((line) => {
      const rect = line.getBoundingClientRect();
      return (
        line.textContent!.trim().length > 0 &&
        rect.left > shape.left &&
        rect.right < shape.right &&
        rect.left < centerX &&
        rect.right > shape.left + shape.width * 0.3
      );
    });
    return {
      top: inner.some((line) => {
        const rect = line.getBoundingClientRect();
        return rect.bottom > shape.top && rect.bottom < centerY;
      }),
      bottom: inner.some((line) => {
        const rect = line.getBoundingClientRect();
        return rect.top > centerY && rect.top < shape.bottom;
      }),
    };
  });
  expect(gaps).toEqual({ top: true, bottom: true });
  await expectReadableFlow(flow);
});

test("dragging reflows every word around the X and releases pointer capture", async ({ page }) => {
  await page.goto("/components/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  await expectReadableFlow(flow);
  const handle = flow.getByRole("button", { name: "Move X" });
  const before = await handle.boundingBox();
  const initialLines = await flow.locator('[data-slot="shape-flow-line"]').allTextContents();
  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
  await page.mouse.down();
  await page.mouse.move(before!.x + before!.width / 2 - 90, before!.y + before!.height / 2 + 70, {
    steps: 12,
  });
  await expect(handle).toHaveAttribute("data-dragging", "true");
  await page.mouse.up();
  await expect(handle).toHaveAttribute("data-dragging", "false");
  expect((await handle.boundingBox())!.x).toBeLessThan(before!.x - 60);
  expect(await flow.locator('[data-slot="shape-flow-line"]').allTextContents()).not.toEqual(initialLines);
  await expectReadableFlow(flow);
});

test("keyboard movement, reset and responsive layout preserve readable text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const handle = flow.getByRole("button", { name: "Move X" });
  await handle.focus();
  const initial = await handle.boundingBox();
  const area = await flow.boundingBox();
  expect(initial!.x + initial!.width / 2).toBeCloseTo(area!.x + area!.width / 2, 0);
  expect(initial!.y + initial!.height / 2).toBeCloseTo(area!.y + area!.height / 2, 0);
  await page.keyboard.press("Shift+ArrowRight");
  expect((await handle.boundingBox())!.x - initial!.x).toBeCloseTo(32, 0);
  await page.keyboard.press("Home");
  expect((await handle.boundingBox())!.x).toBeCloseTo(initial!.x, 0);
  for (const width of [752, 390, 280, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => (await flow.boundingBox())!.width).toBeLessThan(width);
    await expect(async () => {
      await expectReadableFlow(flow);
    }).toPass();
    const circle = await handle.boundingBox();
    const bounds = await flow.boundingBox();
    expect(circle!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(circle!.x + circle!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    expect(circle!.x + circle!.width / 2).toBeCloseTo(bounds!.x + bounds!.width / 2, 0);
    expect(circle!.y + circle!.height / 2).toBeCloseTo(bounds!.y + bounds!.height / 2, 0);
  }
});

test("catalog preview fits its card and centers the X on desktop and mobile", async ({ page }) => {
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
  await page.goto("/components/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "fallback");
  await expect(flow.locator("p")).toBeVisible();
  await expect(flow.locator("p")).toContainText("more than one shape a story can take.");
  await context.close();
});

test("touch dragging and cancellation release the X", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/components/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const handle = flow.getByRole("button", { name: "Move X" });
  await handle.scrollIntoViewIfNeeded();
  const before = await handle.boundingBox();
  const x = before!.x + before!.width / 2;
  const y = before!.y + before!.height / 2;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x - 30, y: y + 35 }],
  });
  await expect(handle).toHaveAttribute("data-dragging", "true");
  expect((await handle.boundingBox())!.x).toBeLessThan(before!.x - 20);
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(handle).toHaveAttribute("data-dragging", "false");
  await expectReadableFlow(flow);
  await context.close();
});
