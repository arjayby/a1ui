import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const popup = '[data-slot="sheet-content"]';

type Reading = { offset: number; opacity: number; size: number; scrim: number; scale: string };

// The sheet's travel toward its edge, its size along that axis, and what follows them.
function read(page: Page) {
  return page.evaluate((): Reading | null => {
    const element = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
    if (!element) return null;
    const style = getComputedStyle(element);
    const matrix = new DOMMatrix(style.transform === "none" ? "" : style.transform);
    const side = element.dataset.side;
    const backdrop = document.querySelector('[data-slot="sheet-backdrop"]');
    return {
      offset: side === "bottom" ? matrix.f : side === "right" ? matrix.e : -matrix.e,
      opacity: Number(style.opacity),
      size: side === "bottom" ? element.offsetHeight : element.offsetWidth,
      scrim: backdrop ? Number(getComputedStyle(backdrop).opacity) : 0,
      scale: document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')?.style.scale ?? "",
    };
  });
}

/** Resolves once the sheet has come to rest at `offset`. */
async function rested(page: Page, offset: number) {
  await expect.poll(async () => (await read(page))?.offset, { timeout: 4000 }).toBeCloseTo(offset, 0);
}

/** Runs `act` in the page, then samples the sheet every frame until it leaves or `ms` pass. */
function sample(page: Page, act: "open" | "escape", ms = 500) {
  return page.evaluate(
    async ({ act, ms }) => {
      if (act === "open") {
        [...document.querySelectorAll<HTMLButtonElement>('[data-slot="sheet-trigger"]')]
          .find((button) => button.textContent?.includes("Bag"))!
          .click();
      } else {
        document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      }
      const frames: { offset: number; opacity: number }[] = [];
      const began = performance.now();
      while (performance.now() - began < ms) {
        // Read after the frame's own callbacks, so Motion has already written this frame's styles.
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        const element = document.querySelector<HTMLElement>('[data-slot="sheet-content"]');
        if (!element) {
          if (act === "open") continue;
          break;
        }
        const style = getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform === "none" ? "" : style.transform);
        frames.push({ offset: matrix.f, opacity: Number(style.opacity) });
      }
      return frames;
    },
    { act, ms },
  );
}

async function openDemo(page: Page) {
  await page.goto("/components/sheet");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: new RegExp(`^${label}:`) }).click();
  await page.getByRole("menuitem", { name: option, exact: true }).click();
}

/** Where the grab handle currently is. */
async function handlePoint(page: Page) {
  const box = (await page.locator('[data-slot="sheet-handle"]').boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("slides in from the bottom without overshoot, traps focus, and leaves the way it came", async ({
  page,
}) => {
  await openDemo(page);
  const opening = await sample(page, "open", 900);
  const sheet = page.getByRole("dialog", { name: "Your bag" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAccessibleDescription(/Free shipping/);
  const { size } = (await read(page))!;
  const half = size / 2;
  // It starts past the bottom edge, passes through the middle, and never rises above its detent.
  expect(opening[0].offset).toBeGreaterThan(half + 100);
  expect(opening.some(({ offset }) => offset > half + 20 && offset < size - 20)).toBe(true);
  expect(Math.min(...opening.map(({ offset }) => offset))).toBeGreaterThan(half - 1);
  await rested(page, half);
  await expect(sheet).toBeFocused();

  // The footer sits inside the visible half, and the page behind is dimmed and pushed back.
  const viewport = page.viewportSize()!;
  const done = (await sheet.getByRole("button", { name: "Checkout" }).boundingBox())!;
  expect(done.y + done.height).toBeLessThan(viewport.height);
  const resting = (await read(page))!;
  expect(resting.scrim).toBe(1);
  expect(Number(resting.scale)).toBeCloseTo(0.975, 3);

  for (let step = 0; step < 4; step++) {
    await page.keyboard.press("Tab");
    await expect.poll(() => sheet.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }

  const closing = await sample(page, "escape", 1500);
  expect(closing.some(({ offset }) => offset > half + 20 && offset < size - 20)).toBe(true);
  expect(Math.min(...closing.map(({ offset }) => offset))).toBeGreaterThan(half - 1);
  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.locator('[data-slot="sheet-backdrop"]')).toHaveCount(0);
  await expect(page.locator(".demo-frame").getByRole("button", { name: /^Bag/ })).toBeFocused();
  expect(await page.locator('[data-slot="sidebar-inset"]').evaluate((element) => element.style.scale)).toBe(
    "",
  );
});

test("tracks the pointer 1:1, rests at the nearest detent, resists past the largest, and is thrown away by a flick", async ({
  page,
}) => {
  await openDemo(page);
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  const sheet = page.getByRole("dialog", { name: "Your bag" });
  const { size } = (await read(page))!;
  const half = size / 2;
  await rested(page, half);
  const handle = page.getByRole("slider", { name: "Resize sheet" });
  await expect(handle).toHaveAttribute("aria-valuenow", "50");

  // Drag up by 100px: the sheet moves exactly 100px, and the scrim and push back follow.
  let grip = await handlePoint(page);
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(grip.x, grip.y - 100, { steps: 5 });
  await rested(page, half - 100);
  await expect(sheet).toHaveAttribute("data-dragging", "");
  expect(Number((await read(page))!.scale)).toBeCloseTo(1 - 0.05 * ((size - half + 100) / size), 3);
  // The handle is still under the pointer, where it was grabbed.
  expect((await handlePoint(page)).y).toBeCloseTo(grip.y - 100, 0);

  // Let go at rest near the top: no throw, so it settles on the nearest detent, the largest.
  await page.mouse.move(grip.x, grip.y - half + 40, { steps: 5 });
  await rested(page, 40);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(sheet).not.toHaveAttribute("data-dragging");
  await expect(handle).toHaveAttribute("aria-valuenow", "100");
  await rested(page, 0);
  // At the largest detent the content area fills the sheet again.
  const done = (await sheet.getByRole("button", { name: "Checkout" }).boundingBox())!;
  expect(done.y + done.height).toBeGreaterThan(page.viewportSize()!.height - 40);

  // Past the largest detent it follows less and less, then springs back.
  grip = await handlePoint(page);
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(grip.x, grip.y - 30, { steps: 4 });
  await expect.poll(async () => (await read(page))!.offset).toBeLessThan(-8);
  expect((await read(page))!.offset).toBeGreaterThan(-25);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await rested(page, 0);

  // A slow drag part of the way down returns to the detent it is nearest to.
  const title = (await sheet.getByRole("heading", { name: "Your bag" }).boundingBox())!;
  await page.mouse.move(title.x + 10, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x + 10, title.y + 130, { steps: 6 });
  await rested(page, 120);
  const dimmed = (await read(page))!;
  expect(dimmed.scrim).toBe(1);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await rested(page, 0);
  await expect(sheet).toHaveAttribute("data-state", "open");

  // The same distance as a flick carries it past every detent and off the screen.
  await page.mouse.move(title.x + 10, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x + 10, title.y + 130, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.locator(".demo-frame").getByRole("button", { name: /^Bag/ })).toBeFocused();
});

test("can be caught on its way out and dragged back open", async ({ page }) => {
  await openDemo(page);
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  const sheet = page.locator(popup);
  const { size } = (await read(page))!;
  await rested(page, size / 2);
  const box = (await sheet.boundingBox())!;
  const viewport = page.viewportSize()!;
  // Park the pointer low on the sheet, where it stays under the pointer for most of the exit.
  const x = box.x + 40;
  const y = viewport.height - 12;
  await page.mouse.move(x, y);
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveAttribute("data-state", "closed");
  await page.mouse.down();
  // Stopping brings the sheet up to the present moment; one frame later that is on screen.
  await page.waitForTimeout(60);
  const caught = (await read(page))!.offset;
  expect(caught).toBeGreaterThan(size / 2);
  expect(caught).toBeLessThan(size);
  // Held, it stays exactly where it was caught.
  await page.waitForTimeout(150);
  expect((await read(page))!.offset).toBeCloseTo(caught, 0);

  // Dragged, it is open again and continues from that position.
  await page.mouse.move(x, y - 120, { steps: 6 });
  await rested(page, caught - 120);
  await expect(sheet).toHaveAttribute("data-state", "open");
  await page.waitForTimeout(200);
  await page.mouse.up();
  await rested(page, size / 2);
  await expect(page.getByRole("dialog", { name: "Your bag" })).toBeVisible();

  // A press that only holds a moving sheet lets it carry on, and a button under it still clicks.
  await page.keyboard.press("Escape");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator(popup)).toHaveCount(0);
});

test("content scrolls first and hands the drag to the sheet only from its top", async ({ page }) => {
  await openDemo(page);
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  const { size } = (await read(page))!;
  await rested(page, size / 2);
  const body = page.locator('[data-slot="sheet-body"]');
  const row = (await body.getByText("Ink refill").boundingBox())!;
  const x = row.x + 20;
  const y = row.y + 10;

  // Below the largest detent, dragging content up grows the sheet instead of scrolling it.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 80, { steps: 5 });
  await rested(page, size / 2 - 80);
  expect(await body.evaluate((element) => element.scrollTop)).toBe(0);
  await page.mouse.move(x, y - size / 2 + 20, { steps: 5 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await rested(page, 0);

  // Scrolled content keeps the drag for itself.
  await body.evaluate((element) => (element.scrollTop = 120));
  const inside = (await body.boundingBox())!;
  await page.mouse.move(x, inside.y + 60);
  await page.mouse.down();
  await page.mouse.move(x, inside.y + 180, { steps: 5 });
  await page.waitForTimeout(100);
  expect((await read(page))!.offset).toBe(0);
  await page.mouse.up();

  // Back at its top, the same drag moves the sheet.
  await body.evaluate((element) => (element.scrollTop = 0));
  await page.mouse.move(x, inside.y + 60);
  await page.mouse.down();
  await page.mouse.move(x, inside.y + 180, { steps: 5 });
  await rested(page, 120);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await rested(page, 0);
});

test.describe("touch", () => {
  test.use({ hasTouch: true });

  test("a finger scrolls the content, and drags the sheet from the top of the content", async ({ page }) => {
    await openDemo(page);
    await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
    const { size } = (await read(page))!;
    await rested(page, size / 2);
    await page.getByRole("slider", { name: "Resize sheet" }).press("End");
    await rested(page, 0);
    const body = page.locator('[data-slot="sheet-body"]');
    const inside = (await body.boundingBox())!;
    const x = inside.x + 60;
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (from: number, to: number, hold = 0) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: from + ((to - from) * step) / 8 }],
        });
        await page.waitForTimeout(16);
      }
      if (hold) await page.waitForTimeout(hold);
    };
    const lift = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // A finger moving up scrolls the list natively and leaves the sheet where it is.
    await swipe(inside.y + 260, inside.y + 100, 100);
    await lift();
    await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(80);
    expect((await read(page))!.offset).toBe(0);

    // From the top of the list, a finger moving down takes the sheet with it instead.
    await body.evaluate((element) => (element.scrollTop = 0));
    await swipe(inside.y + 100, inside.y + 260, 250);
    await rested(page, 160);
    expect(await body.evaluate((element) => element.scrollTop)).toBe(0);
    await lift();
    await rested(page, 0);
  });
});

test("the handle moves between detents from the keyboard", async ({ page }) => {
  await openDemo(page);
  await choose(page, "Detents", "three stops");
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  const { size } = (await read(page))!;
  await rested(page, size * 0.7);
  const handle = page.getByRole("slider", { name: "Resize sheet" });
  await expect(handle).toHaveAttribute("aria-valuetext", "30%");
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  await expect(handle).toHaveAttribute("aria-valuenow", "60");
  await rested(page, size * 0.4);
  await page.keyboard.press("End");
  await rested(page, 0);
  await page.keyboard.press("ArrowDown");
  await rested(page, size * 0.4);
  await page.keyboard.press("Enter");
  await expect(handle).toHaveAttribute("aria-valuenow", "100");
  await page.keyboard.press("Home");
  await rested(page, size * 0.7);
  await expect(handle).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(popup)).toHaveCount(0);
});

test("a side sheet enters from its edge and is dragged back to it", async ({ page }) => {
  await openDemo(page);
  await choose(page, "Side", "right");
  await choose(page, "Detents", "fit content");
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  const sheet = page.getByRole("dialog", { name: "Your bag" });
  await expect(sheet).toHaveAttribute("data-side", "right");
  await rested(page, 0);
  const viewport = page.viewportSize()!;
  const box = (await sheet.boundingBox())!;
  expect(box.x + box.width).toBeCloseTo(viewport.width, 0);
  expect(box.height).toBeCloseTo(viewport.height, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // Toward the middle of the screen it resists; toward its own edge it follows and leaves.
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 60, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, y, { steps: 4 });
  await expect.poll(async () => (await read(page))!.offset).toBeLessThan(-10);
  expect((await read(page))!.offset).toBeGreaterThan(-30);
  await page.mouse.move(box.x + 60 + box.width * 0.7, y, { steps: 6 });
  await rested(page, box.width * 0.7);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(page.locator(popup)).toHaveCount(0);

  await choose(page, "Side", "left");
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  await expect(sheet).toHaveAttribute("data-side", "left");
  await rested(page, 0);
  expect((await sheet.boundingBox())!.x).toBeCloseTo(0, 0);
  await page.mouse.click(viewport.width - 8, viewport.height / 2);
  await expect(page.locator(popup)).toHaveCount(0);
});

test("reduced motion fades in place, and reduced transparency makes the surface solid", async ({ page }) => {
  await openDemo(page);
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  const { size } = (await read(page))!;
  await rested(page, size / 2);
  const material = () =>
    page.locator(popup).evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, blur: style.backdropFilter };
    });
  const translucent = await material();
  expect(translucent.blur).toContain("blur");
  expect(translucent.background).toMatch(/\/ 0\.85\)|, 0\.85\)/);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  const solid = await material();
  expect(solid.blur).toBe("none");
  expect(solid.background).not.toMatch(/\/ 0\.\d+\)|, 0\.\d+\)/);
  await cdp.send("Emulation.setEmulatedMedia", { features: [] });
  await page.keyboard.press("Escape");
  await expect(page.locator(popup)).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const opening = await sample(page, "open", 400);
  // The sheet never slides: it is at its detent from the first frame and only its opacity changes.
  expect(opening.every(({ offset }) => Math.abs(offset - size / 2) < 1)).toBe(true);
  expect(opening.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true);
  const sheet = page.getByRole("dialog", { name: "Your bag" });
  await expect(sheet).toHaveCSS("opacity", "1");
  expect((await read(page))!.scale).toBe("");

  // Detents change at once, and dragging still follows the pointer.
  const handle = page.getByRole("slider", { name: "Resize sheet" });
  await handle.press("ArrowUp");
  await rested(page, 0);
  const grip = await handlePoint(page);
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(grip.x, grip.y + 90, { steps: 4 });
  await rested(page, 90);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await rested(page, 0);

  const closing = await sample(page, "escape", 600);
  expect(closing.every(({ offset }) => Math.abs(offset) < 1)).toBe(true);
  expect(closing.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true);
  await expect(page.locator(popup)).toHaveCount(0);
});

test("fits a phone screen from the bottom edge", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  await choose(page, "Detents", "fit content");
  await page.locator(".demo-frame").getByRole("button", { name: /^Bag/ }).click();
  const sheet = page.getByRole("dialog", { name: "Your bag" });
  await rested(page, 0);
  const box = (await sheet.boundingBox())!;
  expect(box.width).toBeCloseTo(390, 0);
  expect(box.y + box.height).toBeCloseTo(844, 0);
  // A sheet that fits its content is only as tall as it needs to be.
  expect(box.height).toBeLessThan(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await sheet.getByRole("button", { name: "Checkout" }).click();
  await expect(page.locator(popup)).toHaveCount(0);
});

test("catalog, registry, and agent docs include the sheet", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/sheet"]').click();
  await expect(page.getByRole("heading", { name: "Sheet", exact: true })).toBeVisible();
  const item = await (await request.get("/r/sheet.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/sheet.tsx");
  expect(item.files[0].content).toContain("export function SheetContent");
  const guide = await request.get("/docs/components/sheet.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/sheet");
});
