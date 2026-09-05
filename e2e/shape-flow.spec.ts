import { expect, test, type Locator } from "@playwright/test";

async function expectReadableFlow(flow: Locator) {
  const result = await flow.evaluate((element) => {
    const circle = element.querySelector('[data-slot="shape-flow-handle"]')!.getBoundingClientRect();
    const container = element.getBoundingClientRect();
    const center = { x: circle.x + circle.width / 2, y: circle.y + circle.height / 2 };
    const lines = [...element.querySelectorAll('[data-slot="shape-flow-line"]')];
    return {
      original: element.querySelector("p")!.textContent!.replace(/\s/g, ""),
      rendered: lines
        .map((line) => line.textContent)
        .join("")
        .replace(/\s/g, ""),
      overlaps: lines.some((line) => {
        const bounds = line.getBoundingClientRect();
        const x = Math.max(bounds.left, Math.min(center.x, bounds.right));
        const y = Math.max(bounds.top, Math.min(center.y, bounds.bottom));
        return Math.hypot(center.x - x, center.y - y) < circle.width / 2;
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

test("dragging reflows every word around the circle and releases pointer capture", async ({ page }) => {
  await page.goto("/components/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  await expectReadableFlow(flow);
  const handle = flow.getByRole("button", { name: "Move circle" });
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
  const handle = flow.getByRole("button", { name: "Move circle" });
  await handle.focus();
  const initial = await handle.boundingBox();
  await page.keyboard.press("Shift+ArrowRight");
  expect((await handle.boundingBox())!.x - initial!.x).toBeCloseTo(32, 0);
  await page.keyboard.press("Home");
  expect((await handle.boundingBox())!.x).toBeCloseTo(initial!.x, 0);
  for (const width of [390, 280, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => (await flow.boundingBox())!.width).toBeLessThan(width);
    await expect(async () => {
      await expectReadableFlow(flow);
    }).toPass();
    const circle = await handle.boundingBox();
    const bounds = await flow.boundingBox();
    expect(circle!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(circle!.x + circle!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
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

test("touch dragging and cancellation release the circle", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/components/shape-flow");
  const flow = page.locator('[data-slot="shape-flow"]');
  await expect(flow).toHaveAttribute("data-state", "ready");
  const handle = flow.getByRole("button", { name: "Move circle" });
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
