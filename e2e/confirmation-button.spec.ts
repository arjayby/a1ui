import { expect, test, type Page } from "@playwright/test";

const controlSelector = '[data-slot="confirmation-button"]';
const handleSelector = '[data-slot="confirmation-button-handle"]';

async function startDrag(page: Page, fraction: number) {
  const handle = page.locator(handleSelector);
  await handle.scrollIntoViewIfNeeded();
  const thumb = (await handle.boundingBox())!;
  const track = (await page.locator(controlSelector).boundingBox())!;
  const x = thumb.x + thumb.width / 2;
  const y = thumb.y + thumb.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + (track.width - thumb.width - 14) * fraction, y, { steps: 12 });
  return { thumb, track };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/components/confirmation-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("a complete drag runs the action on release, shows success, and resets", async ({ page }) => {
  const control = page.locator(controlSelector);
  const handle = page.locator(handleSelector);
  const { track } = await startDrag(page, 1);
  await expect(control).toHaveAttribute("data-state", "idle");
  await expect(control).toHaveAttribute("data-dragging", "true");
  await page.mouse.up();
  await expect(control).toHaveAttribute("data-state", "pending");
  await expect(control).toHaveAttribute("data-dragging", "false");
  await expect(control).toHaveAttribute("data-state", "confirmed");
  await expect(handle).toHaveAccessibleName("Confirmed");
  const after = (await handle.boundingBox())!;
  expect(after.x + after.width).toBeCloseTo(track.x + track.width - 7, 0);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(control).toHaveAttribute("data-state", "idle");
  expect((await handle.boundingBox())!.x).toBeCloseTo(track.x + 7, 0);
});

test("clicks, partial drags, and Escape do not confirm", async ({ page }) => {
  const handle = page.locator(handleSelector);
  const control = page.locator(controlSelector);
  await handle.click();
  await expect(control).toHaveAttribute("data-state", "idle");
  const { thumb } = await startDrag(page, 0.55);
  await page.mouse.up();
  await expect.poll(async () => (await handle.boundingBox())!.x).toBeCloseTo(thumb.x, 0);
  await startDrag(page, 1);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(control).toHaveAttribute("data-state", "idle");
  await expect(control).toHaveAttribute("data-dragging", "false");
  await expect.poll(async () => (await handle.boundingBox())!.x).toBeCloseTo(thumb.x, 0);
});

test("Enter and Space confirm without dragging and respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const handle = page.locator(handleSelector);
  for (const key of ["Enter", "Space"]) {
    await handle.focus();
    await page.keyboard.press(key);
    await expect(page.locator(controlSelector)).toHaveAttribute("data-state", "pending");
    expect(await handle.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe("none");
    await expect(page.locator(controlSelector)).toHaveAttribute("data-state", "confirmed");
    await page.getByRole("button", { name: "Reset demo" }).click();
  }
});

test("the control and its label fit a narrow screen in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const dark of [false, true]) {
    await page
      .locator("html")
      .evaluate((element, enabled) => element.classList.toggle("dark", enabled), dark);
    const control = page.locator(controlSelector);
    const bounds = (await control.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    const label = control.locator(".truncate");
    expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const { thumb } = await startDrag(page, 1);
    await page.mouse.up();
    await expect(control).toHaveAttribute("data-state", "confirmed");
    expect((await page.locator(handleSelector).boundingBox())!.x).toBeGreaterThan(thumb.x);
    await page.getByRole("button", { name: "Reset demo" }).click();
  }
});

test("touch cancellation returns the handle and a touch drag confirms", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/components/confirmation-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const handle = page.locator(handleSelector);
  const control = page.locator(controlSelector);
  await handle.scrollIntoViewIfNeeded();
  const thumb = (await handle.boundingBox())!;
  const track = (await control.boundingBox())!;
  const x = thumb.x + thumb.width / 2;
  const y = thumb.y + thumb.height / 2;
  const endX = track.x + track.width - 7 - thumb.width / 2;
  const session = await context.newCDPSession(page);
  for (const cancel of [true, false]) {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: endX, y }] });
    await expect(control).toHaveAttribute("data-dragging", "true");
    await session.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
    await expect(control).toHaveAttribute("data-state", cancel ? "idle" : "confirmed");
    if (cancel) await expect.poll(async () => (await handle.boundingBox())!.x).toBeCloseTo(thumb.x, 0);
  }
  await context.close();
});

test("the catalog links to the new component and keeps its preview inside the card", async ({ page }) => {
  await page.goto("/");
  const card = page
    .locator(".catalog-card")
    .filter({ has: page.getByRole("link", { name: "Confirmation Button", exact: true }) });
  const preview = (await card.locator(".catalog-preview").boundingBox())!;
  const control = (await card.locator(controlSelector).boundingBox())!;
  expect(control.x).toBeGreaterThan(preview.x);
  expect(control.x + control.width).toBeLessThan(preview.x + preview.width);
  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/components\/confirmation-button$/);
});
