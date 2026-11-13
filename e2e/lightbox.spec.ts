import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

type Box = { x: number; y: number; width: number; height: number };
type Frame = { box: Box; visible: Box; scrim: number } | null;

const thumbnail = '.demo-frame [data-slot="lightbox-thumbnail"]';
const stage = '[data-slot="lightbox-stage"]';
const counter = '[data-slot="lightbox-counter"]';

// Reads the open image in the page: its transformed box, the part its clip leaves visible, and
// the scrim's opacity.
function snapshot(): Frame {
  const element = document.querySelector<HTMLElement>('[data-slot="lightbox-image"][data-current]');
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const scale = rect.width / element.offsetWidth;
  const inset = /inset\(([\d.e-]+)px(?: ([\d.e-]+)px)?/.exec(getComputedStyle(element).clipPath);
  const insetY = inset ? Number(inset[1]) * scale : 0;
  const insetX = inset ? Number(inset[2] ?? inset[1]) * scale : 0;
  const scrim = document.querySelector('[data-slot="lightbox-scrim"]');
  return {
    box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    visible: {
      x: rect.x + insetX,
      y: rect.y + insetY,
      width: rect.width - insetX * 2,
      height: rect.height - insetY * 2,
    },
    scrim: scrim ? Number(getComputedStyle(scrim).opacity) : 0,
  };
}

/** Samples the image on every frame for `ms` while `act` runs. */
async function record(page: Page, ms: number, act: () => Promise<unknown>) {
  await page.evaluate(
    ({ ms, read }) => {
      const snapshot = new Function(`return (${read})()`) as () => Frame;
      (window as unknown as { frames: Promise<Frame[]> }).frames = (async () => {
        const frames: Frame[] = [];
        const began = performance.now();
        while (performance.now() - began < ms) {
          await new Promise(requestAnimationFrame);
          frames.push(snapshot());
        }
        return frames;
      })();
    },
    { ms, read: snapshot.toString() },
  );
  await act();
  return page.evaluate(() => (window as unknown as { frames: Promise<Frame[]> }).frames);
}

const read = (page: Page) => page.evaluate(snapshot);

async function box(page: Page, selector: string, nth = 0): Promise<Box> {
  const bounds = await page.locator(selector).nth(nth).boundingBox();
  if (!bounds) throw new Error(`Expected ${selector}`);
  return bounds;
}

/** Resolves once the image has stopped moving, and returns where it rests. */
async function settled(page: Page) {
  let last = "";
  await expect
    .poll(async () => {
      const before = last;
      last = JSON.stringify((await read(page))?.box ?? null);
      return last !== "null" && last === before;
    })
    .toBe(true);
  return (await read(page))!;
}

async function open(page: Page, nth = 0) {
  await page.goto("/components/lightbox");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.locator(thumbnail).nth(nth).scrollIntoViewIfNeeded();
  await page.locator(thumbnail).nth(nth).click();
  await expect(page.getByRole("dialog", { name: "Image viewer" })).toBeVisible();
  return settled(page);
}

/**
 * A quick swipe timed inside the page, so its release velocity does not depend on how fast the
 * test runner delivers each move.
 */
async function flick(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.evaluate(
    async ({ from, to }) => {
      const target = document.elementFromPoint(from.x, from.y)!;
      const fire = (type: string, x: number, y: number) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 7,
            pointerType: "touch",
            isPrimary: true,
            clientX: x,
            clientY: y,
          }),
        );
      fire("pointerdown", from.x, from.y);
      for (let step = 1; step <= 6; step++) {
        await new Promise((resolve) => setTimeout(resolve, 8));
        fire("pointermove", from.x + ((to.x - from.x) * step) / 6, from.y + ((to.y - from.y) * step) / 6);
      }
      fire("pointerup", to.x, to.y);
    },
    { from, to },
  );
}

const centre = (bounds: Box) => ({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) <= tolerance;

test("grows out of the thumbnail, traps focus, and returns to the thumbnail it ended on", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/lightbox");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.locator(thumbnail).first().scrollIntoViewIfNeeded();
  const from = await box(page, thumbnail);

  const opening = (await record(page, 700, () => page.locator(thumbnail).first().click())).filter(
    (frame) => frame !== null,
  );
  // The first frames sit on the thumbnail, cropped to its square, and the image grows from there.
  const first = opening[0]!;
  expect(near(centre(first.visible).x, centre(from).x, 12)).toBe(true);
  expect(near(centre(first.visible).y, centre(from).y, 12)).toBe(true);
  expect(first.visible.width).toBeLessThan(from.width * 1.4);
  expect(first.visible.height).toBeLessThan(from.height * 1.4);
  const rest = await settled(page);
  expect(rest.box.width).toBeGreaterThan(from.width * 2);
  expect(
    opening.some(
      (frame) => frame!.box.width > first.box.width * 1.2 && frame!.box.width < rest.box.width * 0.95,
    ),
  ).toBe(true);
  expect(rest.scrim).toBe(1);
  // The image is centred and uncropped at rest.
  const viewport = page.viewportSize()!;
  expect(near(centre(rest.box).x, viewport.width / 2, 1)).toBe(true);
  expect(near(rest.visible.width, rest.box.width, 0.5)).toBe(true);
  await expect(page.locator(thumbnail).first()).toHaveAttribute("data-covered", "true");
  await expect(page.locator(thumbnail).first()).toHaveCSS("opacity", "0");

  const dialog = page.getByRole("dialog", { name: "Image viewer" });
  await expect(dialog.getByRole("img")).toHaveAttribute("alt", "A four-petal chrome flower on a violet haze");
  await expect(dialog.locator('[data-slot="lightbox-caption"]')).toHaveText("Chrome bloom");
  // Tab at a human pace: Base UI's focus guards hand focus back asynchronously.
  for (let step = 0; step < 5; step++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
  }

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(counter)).toHaveText("3 / 6");
  await expect(dialog.getByRole("img")).toHaveAttribute(
    "alt",
    "A red fox in profile, its fur streaking into motion blur",
  );
  await settled(page);
  await expect(page.locator(thumbnail).nth(2)).toHaveAttribute("data-covered", "true");
  await expect(page.locator(thumbnail).first()).not.toHaveAttribute("data-covered");

  const target = await box(page, thumbnail, 2);
  const closing = (await record(page, 700, () => page.keyboard.press("Escape"))).filter(
    (frame) => frame !== null,
  );
  const last = closing[closing.length - 1]!;
  expect(near(centre(last.visible).x, centre(target).x, 6)).toBe(true);
  expect(near(centre(last.visible).y, centre(target).y, 6)).toBe(true);
  expect(near(last.visible.width, target.width, 8)).toBe(true);
  expect(near(last.visible.height, target.height, 8)).toBe(true);
  expect(last.scrim).toBeLessThan(0.05);
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);
  await expect(page.locator(thumbnail).nth(2)).toBeFocused();
  await expect(page.locator(thumbnail).nth(2)).not.toHaveAttribute("data-covered");
  expect(errors).toEqual([]);
});

test("reverses from the live position when interrupted, and lands on a thumbnail that moved", async ({
  page,
}) => {
  const rest = await open(page);
  const from = await box(page, thumbnail);
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);

  // Close while the image is still on its way up: it turns around from where it is, without
  // first jumping to full size or back to the thumbnail. The click and the Escape are timed in
  // the page so the interruption always lands mid-flight.
  const frames = await record(page, 1300, () =>
    page.evaluate(() => {
      document.querySelector<HTMLElement>('.demo-frame [data-slot="lightbox-thumbnail"]')!.click();
      setTimeout(() => {
        document
          .querySelector('[data-slot="lightbox"]')!
          .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      }, 150);
    }),
  );
  const widths = frames.filter((frame) => frame !== null).map((frame) => frame!.box.width);
  const peak = Math.max(...widths);
  const turn = widths.indexOf(peak);
  expect(peak).toBeGreaterThan(from.width * 1.5);
  expect(peak).toBeLessThan(rest.box.width * 0.97);
  // After the turn the image only ever shrinks, all the way back onto the thumbnail.
  for (let frame = turn + 1; frame < widths.length; frame++) {
    expect(widths[frame]).toBeLessThanOrEqual(widths[frame - 1] + 0.5);
  }
  expect(widths[widths.length - 1]).toBeLessThan(from.width * 1.6);
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);

  // Reopen mid-close by clicking the thumbnail the image is flying back to.
  await page.locator(thumbnail).first().click();
  await settled(page);
  await page.keyboard.press("Escape");
  await expect.poll(async () => ((await read(page))?.box.width ?? 0) < rest.box.width * 0.8).toBe(true);
  await page.mouse.click(centre(from).x, centre(from).y);
  await expect(page.getByRole("dialog", { name: "Image viewer" })).toBeVisible();
  expect(near((await settled(page)).box.width, rest.box.width, 1)).toBe(true);

  // Scroll the page under the open viewer: closing lands on where the thumbnail is now.
  await page.evaluate(() => scrollBy(0, 90));
  const moved = await box(page, thumbnail);
  expect(Math.abs(moved.y - from.y)).toBeGreaterThan(40);
  const closing = (await record(page, 700, () => page.keyboard.press("Escape"))).filter(
    (frame) => frame !== null,
  );
  const last = closing[closing.length - 1]!;
  expect(near(centre(last.visible).y, centre(moved).y, 6)).toBe(true);
  expect(near(centre(last.visible).x, centre(moved).x, 6)).toBe(true);
});

test("opening another thumbnail mid-close grows it in place without paging across", async ({ page }) => {
  await open(page);
  await page.keyboard.press("Escape");
  // Still flying home when the next thumbnail is clicked.
  await expect.poll(async () => ((await read(page))?.box.width ?? 0) < 200).toBe(true);
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(1);

  const target = await box(page, thumbnail, 3);
  const frames = await record(page, 700, () =>
    page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('.demo-frame [data-slot="lightbox-thumbnail"]')[3]!.click();
    }),
  );
  const shown = frames.filter((frame) => frame !== null);
  // The first frame sits on the clicked thumbnail, and the image only ever grows from there.
  expect(near(centre(shown[0]!.visible).x, centre(target).x, 6)).toBe(true);
  expect(near(centre(shown[0]!.visible).y, centre(target).y, 6)).toBe(true);
  // Paging across would carry it sideways past the middle of the screen first.
  const middle = page.viewportSize()!.width / 2;
  const [low, high] = [Math.min(centre(target).x, middle) - 6, Math.max(centre(target).x, middle) + 6];
  for (let frame = 1; frame < shown.length; frame++) {
    expect(shown[frame]!.box.width).toBeGreaterThanOrEqual(shown[frame - 1]!.box.width - 0.5);
    const x = centre(shown[frame]!.visible).x;
    expect(x >= low && x <= high).toBe(true);
  }
  const dialog = page.getByRole("dialog", { name: "Image viewer" });
  await expect(dialog.locator(counter)).toHaveText("4 / 6");
  const rest = await settled(page);
  expect(near(centre(rest.box).x, middle, 1)).toBe(true);
});

test("follows a dismiss drag 1:1, springs back from a short one, and closes on a long or fast one", async ({
  page,
}) => {
  const rest = await open(page);
  const start = centre(rest.box);
  const viewport = page.viewportSize()!;

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 2, start.y + 20, { steps: 4 });
  const a = (await read(page))!;
  await page.mouse.move(start.x + 12, start.y + 80, { steps: 4 });
  const b = (await read(page))!;
  // The grabbed point stays under the pointer while the image shrinks a little around it.
  const grab = (frame: NonNullable<Frame>, pointer: { x: number; y: number }) => ({
    x: (pointer.x - frame.box.x) / frame.box.width,
    y: (pointer.y - frame.box.y) / frame.box.height,
  });
  expect(
    near(
      grab(a, { x: start.x + 2, y: start.y + 20 }).x,
      grab(b, { x: start.x + 12, y: start.y + 80 }).x,
      0.01,
    ),
  ).toBe(true);
  expect(
    near(
      grab(a, { x: start.x + 2, y: start.y + 20 }).y,
      grab(b, { x: start.x + 12, y: start.y + 80 }).y,
      0.01,
    ),
  ).toBe(true);
  expect(b.box.width).toBeLessThan(a.box.width);
  expect(b.scrim).toBeLessThan(a.scrim);
  expect(b.scrim).toBeGreaterThan(0.5);
  // The drag is locked to dismissing: the track has not paged.
  await expect(page.locator('[data-slot="lightbox-track"]')).toHaveCSS("transform", "none");
  // Held still, a short drag springs back.
  await page.waitForTimeout(160);
  await page.mouse.up();
  const back = await settled(page);
  expect(near(back.box.y, rest.box.y, 1)).toBe(true);
  expect(back.scrim).toBe(1);
  await expect(page.getByRole("dialog", { name: "Image viewer" })).toBeVisible();

  // Held still, a drag past a quarter of the screen dismisses.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + viewport.height * 0.25 + 30, { steps: 8 });
  await page.waitForTimeout(160);
  await page.mouse.up();
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);

  // A short flick carries enough momentum to dismiss on its own.
  await page.locator(thumbnail).first().click();
  await settled(page);
  await flick(page, start, { x: start.x, y: start.y - 110 });
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);
  await expect(page.locator(thumbnail).first()).toBeFocused();

  // A tap beside the image closes too.
  await page.locator(thumbnail).first().click();
  await settled(page);
  await page.mouse.click(8, viewport.height / 2);
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);
});

test("pages by swipe with momentum, rubber-bands at the ends, and pages from the arrow buttons", async ({
  page,
}) => {
  const rest = await open(page);
  const start = centre(rest.box);
  const viewport = page.viewportSize()!;
  const dialog = page.getByRole("dialog", { name: "Image viewer" });
  const trackX = () =>
    page
      .locator('[data-slot="lightbox-track"]')
      .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);

  // 1:1 once the drag has locked to paging.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 40, start.y + 3, { steps: 4 });
  const a = await trackX();
  await page.mouse.move(start.x - 140, start.y + 60, { steps: 4 });
  expect(near((await trackX()) - a, -100, 1)).toBe(true);
  // Locked to paging: the vertical travel did not start a dismiss.
  expect((await read(page))!.scrim).toBe(1);
  // Held still short of half way, it springs back to the same image.
  await page.waitForTimeout(160);
  await page.mouse.up();
  await expect.poll(trackX).toBe(0);
  await expect(dialog.locator(counter)).toHaveText("1 / 6");

  // Past the first image the track stretches with resistance, then returns.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 300, start.y, { steps: 6 });
  const stretched = await trackX();
  expect(stretched).toBeGreaterThan(40);
  expect(stretched).toBeLessThan(220);
  await page.waitForTimeout(160);
  await page.mouse.up();
  await expect.poll(trackX).toBe(0);
  await expect(dialog.locator(counter)).toHaveText("1 / 6");

  // A short flick pages on momentum alone.
  await flick(page, start, { x: start.x - 120, y: start.y });
  await expect(dialog.locator(counter)).toHaveText("2 / 6");
  await expect(dialog.getByRole("img")).toHaveAttribute(
    "alt",
    "Folds of iridescent film shifting from pink to green",
  );
  await expect.poll(async () => Math.round(await trackX())).toBe(-(viewport.width + 24));

  // A slow drag past half way pages too, and the buttons step back.
  const second = centre((await settled(page)).box);
  await page.mouse.move(second.x, second.y);
  await page.mouse.down();
  await page.mouse.move(second.x - viewport.width * 0.6, second.y, { steps: 8 });
  await page.waitForTimeout(160);
  await page.mouse.up();
  await expect(dialog.locator(counter)).toHaveText("3 / 6");
  await dialog.getByRole("button", { name: "Previous image" }).click();
  await dialog.getByRole("button", { name: "Previous image" }).click();
  await expect(dialog.locator(counter)).toHaveText("1 / 6");
  await expect(dialog.getByRole("button", { name: "Previous image" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await dialog.getByRole("button", { name: "Next image" }).click();
  await expect(dialog.locator(counter)).toHaveText("2 / 6");

  // The demo can hide the buttons.
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);
  await page.getByRole("switch", { name: "Arrow buttons" }).uncheck();
  await page.locator(thumbnail).first().click();
  await expect(dialog.locator(counter)).toHaveText("1 / 6");
  await expect(dialog.getByRole("button", { name: "Next image" })).toHaveCount(0);
});

test("zooms on the pointer by double-click and Ctrl+wheel, and pans within the image", async ({ page }) => {
  const rest = await open(page);
  const viewport = page.viewportSize()!;
  const point = { x: rest.box.x + rest.box.width * 0.4, y: rest.box.y + rest.box.height * 0.45 };
  const under = (frame: NonNullable<Frame>, at: { x: number; y: number }) => ({
    x: (at.x - frame.box.x) / frame.box.width,
    y: (at.y - frame.box.y) / frame.box.height,
  });

  await page.mouse.dblclick(point.x, point.y);
  await expect(page.locator(stage)).toHaveAttribute("data-zoomed", "true");
  const zoomed = await settled(page);
  expect(near(zoomed.box.width / rest.box.width, 2.5, 0.01)).toBe(true);
  // The image point that was under the pointer is still under it.
  expect(near(under(zoomed, point).x, 0.4, 0.01)).toBe(true);
  expect(near(under(zoomed, point).y, 0.45, 0.01)).toBe(true);

  // Zoomed, a drag pans 1:1 in any direction and neither pages nor dismisses.
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x - 60, point.y + 40, { steps: 5 });
  const panned = (await read(page))!;
  expect(near(panned.box.x - zoomed.box.x, -60, 1)).toBe(true);
  expect(near(panned.box.y - zoomed.box.y, 40, 1)).toBe(true);
  expect(panned.scrim).toBe(1);
  // Past the image's edge the pan resists, then springs back to the edge on release.
  await page.mouse.move(point.x + viewport.width * 1.5, point.y, { steps: 8 });
  const stretched = (await read(page))!;
  expect(stretched.box.x).toBeGreaterThan(20);
  expect(stretched.box.x).toBeLessThan(viewport.width * 0.6);
  await page.waitForTimeout(160);
  await page.mouse.up();
  expect(near((await settled(page)).box.x, 0, 1)).toBe(true);
  await expect(page.getByRole("dialog", { name: "Image viewer" })).toBeVisible();
  await expect(page.locator(counter)).toHaveText("1 / 6");

  // Double-click again to return to the fitted size.
  await page.mouse.dblclick(point.x, point.y);
  await expect(page.locator(stage)).not.toHaveAttribute("data-zoomed");
  expect(near((await settled(page)).box.width, rest.box.width, 1)).toBe(true);

  // Ctrl+wheel zooms on the pointer and stops at the fitted size on the way back out.
  const anchor = { x: rest.box.x + rest.box.width * 0.7, y: rest.box.y + rest.box.height * 0.3 };
  await page.mouse.move(anchor.x, anchor.y);
  await page.keyboard.down("Control");
  for (let notch = 0; notch < 3; notch++) await page.mouse.wheel(0, -100);
  await expect(page.locator(stage)).toHaveAttribute("data-zoomed", "true");
  // While the zoomed image is narrower than the screen it stays centred, so check the anchor on
  // a step where it is free to move: the image point under the pointer does not change.
  const wheeled = await settled(page);
  expect(wheeled.box.width).toBeGreaterThan(rest.box.width * 2);
  await page.mouse.wheel(0, -100);
  const deeper = await settled(page);
  expect(deeper.box.width).toBeGreaterThan(wheeled.box.width * 1.2);
  expect(near(under(deeper, anchor).x, under(wheeled, anchor).x, 0.005)).toBe(true);
  expect(near(under(deeper, anchor).y, under(wheeled, anchor).y, 0.005)).toBe(true);
  for (let notch = 0; notch < 10; notch++) await page.mouse.wheel(0, 100);
  await page.keyboard.up("Control");
  await expect(page.locator(stage)).not.toHaveAttribute("data-zoomed");
  const reset = await settled(page);
  expect(near(reset.box.width, rest.box.width, 1)).toBe(true);
  expect(near(reset.box.x, rest.box.x, 1)).toBe(true);
  // The wheel never scrolled or zoomed the page behind the viewer.
  expect(await page.evaluate(() => visualViewport?.scale ?? 1)).toBe(1);

  // The keyboard zooms too, and paging resets it.
  await page.keyboard.press("+");
  await expect(page.locator(stage)).toHaveAttribute("data-zoomed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(stage)).not.toHaveAttribute("data-zoomed");
  await expect(page.locator(counter)).toHaveText("2 / 6");
});

test("cross-fades in place with reduced motion, and pinches and swipes by touch", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/components/lightbox");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.locator(thumbnail).first().scrollIntoViewIfNeeded();

  const opening = (await record(page, 400, () => page.locator(thumbnail).first().tap())).filter(
    (frame) => frame !== null,
  );
  const dialog = page.getByRole("dialog", { name: "Image viewer" });
  await expect(dialog).toBeVisible();
  const rest = await settled(page);
  // Nothing travels: every frame is already at the fitted size, and the thumbnail stays put.
  for (const frame of opening) {
    expect(near(frame!.box.width, rest.box.width, 0.5)).toBe(true);
    expect(near(frame!.box.x, rest.box.x, 0.5)).toBe(true);
  }
  expect(near(rest.box.width, 390, 0.5)).toBe(true);
  await expect(page.locator(thumbnail).first()).not.toHaveAttribute("data-covered");
  await expect(page.locator('[data-slot="lightbox-track"]')).toHaveCSS("transform", "none");

  const client = await context.newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", points: { x: number; y: number }[]) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map((point, id) => ({ ...point, id })),
    });
  const middle = centre(rest.box);

  // Pinch out: the image follows the fingers and stays zoomed on release.
  await touch("touchStart", [{ x: middle.x - 30, y: middle.y }]);
  await touch("touchStart", [
    { x: middle.x - 30, y: middle.y },
    { x: middle.x + 30, y: middle.y },
  ]);
  await touch("touchMove", [
    { x: middle.x - 60, y: middle.y },
    { x: middle.x + 60, y: middle.y },
  ]);
  await expect(page.locator(stage)).toHaveAttribute("data-zoomed", "true");
  // Touch moves reach the page on its next frame, so these readings are polled.
  const ratio = async () => (await read(page))!.box.width / rest.box.width;
  await expect.poll(async () => near(await ratio(), 2, 0.02)).toBe(true);
  await touch("touchEnd", []);
  expect(near((await settled(page)).box.width / rest.box.width, 2, 0.02)).toBe(true);
  // Pinch in past the fitted size: it resists, then returns to fitted.
  await touch("touchStart", [{ x: middle.x - 80, y: middle.y }]);
  await touch("touchStart", [
    { x: middle.x - 80, y: middle.y },
    { x: middle.x + 80, y: middle.y },
  ]);
  await touch("touchMove", [
    { x: middle.x - 20, y: middle.y },
    { x: middle.x + 20, y: middle.y },
  ]);
  await expect.poll(ratio).toBeLessThan(1);
  expect(await ratio()).toBeGreaterThan(0.6);
  await touch("touchEnd", []);
  await expect(page.locator(stage)).not.toHaveAttribute("data-zoomed");
  expect(near((await settled(page)).box.width, rest.box.width, 0.5)).toBe(true);

  // A swipe changes the image without sliding anything.
  await touch("touchStart", [{ x: 300, y: middle.y }]);
  await touch("touchMove", [{ x: 260, y: middle.y }]);
  await touch("touchMove", [{ x: 120, y: middle.y + 4 }]);
  await expect(page.locator('[data-slot="lightbox-track"]')).toHaveCSS("transform", "none");
  await page.waitForTimeout(160);
  await touch("touchEnd", []);
  await expect(dialog.locator(counter)).toHaveText("2 / 6");
  await expect(dialog.getByRole("img")).toHaveAttribute(
    "alt",
    "Folds of iridescent film shifting from pink to green",
  );
  await expect(page.locator('[data-slot="lightbox-slide"]:not([aria-hidden])')).toHaveCSS("opacity", "1");

  // Dragging down fades the viewer where it is, and a long drag closes it.
  const second = await settled(page);
  await touch("touchStart", [{ x: middle.x, y: middle.y }]);
  await touch("touchMove", [{ x: middle.x, y: middle.y + 30 }]);
  await touch("touchMove", [{ x: middle.x, y: middle.y + 300 }]);
  await expect.poll(async () => (await read(page))!.scrim).toBeLessThan(0.7);
  expect(near((await read(page))!.box.y, second.box.y, 0.5)).toBe(true);
  await page.waitForTimeout(160);
  await touch("touchEnd", []);
  await expect(page.locator('[data-slot="lightbox"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/lightbox"]').click();
  await expect(page.getByRole("heading", { name: "Lightbox", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "breadcrumb", exact: true })
      .locator('[data-slot="breadcrumb-page"]'),
  ).toHaveText("Lightbox");
  const item = await (await request.get("/r/lightbox.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/lightbox.tsx");
  expect(item.files[0].content).toContain("export function Lightbox");
  const guide = await request.get("/docs/components/lightbox.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/lightbox");
});
