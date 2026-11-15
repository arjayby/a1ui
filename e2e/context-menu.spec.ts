import { type Page } from "@playwright/test";
import { expect, revealed, scrollSettled, test } from "./fixtures";

const content = '[data-slot="context-menu-content"]';
const highlight = '[data-slot="context-menu-highlight"]';

async function ready(page: Page) {
  await page.goto("/components/context-menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  await revealed(page);
  const area = page.locator('.demo-frame [data-slot="context-menu-trigger"]');
  await area.scrollIntoViewIfNeeded();
  await scrollSettled(page);
  return area;
}

/** A point inside the trigger, as whole viewport pixels. */
async function pointIn(page: Page, dx: number, dy: number) {
  const box = await page.locator('.demo-frame [data-slot="context-menu-trigger"]').boundingBox();
  if (!box) throw new Error("Missing trigger");
  return {
    x: Math.round(dx < 0 ? box.x + box.width + dx : box.x + dx),
    y: Math.round(dy < 0 ? box.y + box.height + dy : box.y + dy),
  };
}

/** Records the popup's opacity, scale and transform origin on every frame for `ms`. */
function sample(page: Page, ms: number) {
  return page.evaluate(async (duration) => {
    const frames: { opacity: number; scale: number; origin: string }[] = [];
    const start = performance.now();
    while (performance.now() - start < duration) {
      await new Promise(requestAnimationFrame);
      const popup = document.querySelector('[data-slot="context-menu-content"]');
      if (!popup) continue;
      const style = getComputedStyle(popup);
      frames.push({
        opacity: Number(style.opacity),
        scale: style.transform === "none" ? 1 : new DOMMatrix(style.transform).a,
        origin: style.transformOrigin,
      });
    }
    return frames;
  }, ms);
}

/** Where the menu sits, and the viewport point its transform origin lands on. */
function geometry(page: Page) {
  return page.evaluate(() => {
    const popup = document.querySelector('[data-slot="context-menu-content"]');
    if (!popup?.parentElement) throw new Error("Missing popup");
    const rect = popup.parentElement.getBoundingClientRect();
    const [x, y] = getComputedStyle(popup).transformOrigin.split(" ").map(parseFloat);
    return {
      origin: { x: rect.x + x, y: rect.y + y },
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    };
  });
}

test("grows out of the pointer on a spring and shrinks back into it", async ({ page }) => {
  const area = await ready(page);
  const point = await pointIn(page, 40, 30);
  const menu = page.getByRole("menu", { name: "File actions" });

  const opening = sample(page, 600);
  await page.mouse.click(point.x, point.y, { button: "right" });
  await expect(menu).toBeVisible();
  const opened = await opening;
  expect(opened.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true);
  expect(opened.some(({ scale }) => scale > 0.9 && scale < 1)).toBe(true);
  // Critically damped: the scale never passes its resting size.
  expect(Math.max(...opened.map(({ scale }) => scale))).toBeLessThanOrEqual(1.001);
  expect(opened.at(-1)).toMatchObject({ opacity: 1, scale: 1 });

  // The transform origin is the pointer itself, a little outside the menu's corner.
  const placed = await geometry(page);
  expect(placed.origin.x).toBeCloseTo(point.x, 0);
  expect(placed.origin.y).toBeCloseTo(point.y, 0);
  expect(placed.left).toBeGreaterThan(point.x);
  expect(placed.top).toBeLessThan(point.y);
  await expect(area).toHaveAttribute("data-popup-open");
  await expect(page.locator(highlight)).toHaveCount(0);

  const closing = sample(page, 600);
  await page.keyboard.press("Escape");
  const closed = await closing;
  expect(closed.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true);
  expect(closed.some(({ scale }) => scale > 0.9 && scale < 1)).toBe(true);
  // It leaves along the path it arrived on: the origin never moves.
  expect(new Set([...opened.slice(1), ...closed].map(({ origin }) => origin)).size).toBe(1);
  await expect(page.locator(content)).toHaveCount(0);
  await expect(area).toBeFocused();
});

test("closing mid-open and right-clicking elsewhere continue from the live value", async ({ page }) => {
  await ready(page);
  // The second point is left of the first, clear of the menu that opens from it.
  const first = await pointIn(page, 150, 30);
  const second = await pointIn(page, 30, 100);
  const menu = page.getByRole("menu", { name: "File actions" });

  // Reverse while it is still opening: the scale turns around without jumping to either end.
  const reversing = sample(page, 500);
  await page.mouse.click(first.x, first.y, { button: "right" });
  await page.waitForFunction((selector) => {
    const popup = document.querySelector(selector);
    return popup && Number(getComputedStyle(popup).opacity) > 0.2;
  }, content);
  await page.keyboard.press("Escape");
  const frames = await reversing;
  const peak = frames.reduce((best, frame, index) => (frame.scale > frames[best].scale ? index : best), 0);
  // It never reached full size, and the frame after the turn is a small step from the peak:
  // no snap to either end, in scale or in opacity.
  expect(frames[peak].scale).toBeGreaterThan(0.9);
  expect(frames[peak].scale).toBeLessThan(1);
  expect(frames[peak].scale - frames[peak + 1].scale).toBeLessThan(0.02);
  expect(Math.abs(frames[peak].opacity - frames[peak + 1].opacity)).toBeLessThan(0.2);
  const after = frames.slice(peak);
  expect(after.every((frame, index) => index === 0 || frame.scale <= after[index - 1].scale + 0.001)).toBe(
    true,
  );
  expect(after.at(-1)?.scale).toBeCloseTo(0.9, 2);
  await expect(page.locator(content)).toHaveCount(0);

  // Right-clicking another spot while the menu is open moves it there.
  await page.mouse.click(first.x, first.y, { button: "right" });
  await expect(menu).toBeVisible();
  await page.mouse.click(second.x, second.y, { button: "right" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS("opacity", "1");
  await expect
    .poll(async () => {
      const placed = await geometry(page);
      return Math.hypot(placed.origin.x - second.x, placed.origin.y - second.y);
    })
    .toBeLessThan(1);
});

test("shifts to stay in the viewport and keeps its origin under the pointer", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 500 });
  const area = await ready(page);
  await area.evaluate((element) => element.scrollIntoView({ block: "end" }));
  await scrollSettled(page);
  const point = await pointIn(page, -12, -12);

  await page.mouse.click(point.x, point.y, { button: "right" });
  const menu = page.getByRole("menu", { name: "File actions" });
  await expect(menu).toHaveCSS("opacity", "1");
  const placed = await geometry(page);
  expect(placed.left).toBeGreaterThanOrEqual(0);
  expect(placed.top).toBeGreaterThanOrEqual(0);
  expect(placed.right).toBeLessThanOrEqual(600);
  expect(placed.bottom).toBeLessThanOrEqual(500);
  // The menu had to move over or beside the pointer, and still grows from it.
  expect(placed.top).toBeLessThan(point.y - 20);
  expect(placed.origin.x).toBeCloseTo(point.x, 0);
  expect(placed.origin.y).toBeCloseTo(point.y, 0);
});

test("opens from the keyboard below the focused element, with navigation and type-ahead", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  const area = await ready(page);
  // The page behind an open menu is inert, so the status line is found by attribute, not by role.
  const status = page.locator('.demo-frame [role="status"]');
  const menu = page.getByRole("menu", { name: "File actions", exact: true });
  const item = (name: string) => menu.getByRole("menuitem", { name, exact: true });

  await area.focus();
  await page.keyboard.press("Shift+F10");
  await expect(menu).toBeVisible();
  await expect(item("Open")).toBeFocused();
  await expect(item("Open")).toHaveAttribute("data-highlighted");
  await expect(menu).toHaveCSS("opacity", "1");
  const anchor = await area.boundingBox();
  const box = await menu.boundingBox();
  if (!anchor || !box) throw new Error("Missing geometry");
  expect(box.x).toBeCloseTo(anchor.x, 0);
  expect(box.y).toBeCloseTo(anchor.y + anchor.height + 4, 0);

  await page.keyboard.type("de");
  await expect(item("Delete")).toBeFocused();

  await page.keyboard.press("Home");
  await expect(item("Open")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const share = item("Share");
  await expect(share).toBeFocused();
  await page.keyboard.press("ArrowRight");
  const submenu = page.getByRole("menu", { name: "Share", exact: true });
  await expect(submenu.getByRole("menuitem", { name: "Copy link" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(submenu).not.toBeVisible();
  await expect(share).toBeFocused();

  // Checkbox and radio items change without closing the menu.
  await page.keyboard.press("ArrowDown");
  const pinned = menu.getByRole("menuitemcheckbox", { name: "Pin to sidebar" });
  await expect(pinned).toBeFocused();
  await expect(pinned).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Enter");
  await expect(pinned).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const modified = menu.getByRole("menuitemradio", { name: "Date modified" });
  await expect(modified).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(modified).toHaveAttribute("aria-checked", "true");
  await expect(menu.getByRole("menuitemradio", { name: "Name" })).toHaveAttribute("aria-checked", "false");
  await expect(menu.locator('[data-slot="context-menu-indicator"] > span')).toHaveCount(1);
  await expect(menu).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(area).toBeFocused();

  await page.keyboard.press("ContextMenu");
  await expect(item("Open")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).not.toBeVisible();
  await expect(status).toHaveText("Open selected");
  await expect(area).toBeFocused();
});

test("one highlight travels between rows, and a submenu keeps its own", async ({ page }) => {
  await ready(page);
  const point = await pointIn(page, 40, 30);
  await page.mouse.click(point.x, point.y, { button: "right" });
  const menu = page.getByRole("menu", { name: "File actions", exact: true });
  await expect(menu).toHaveCSS("opacity", "1");
  const open = menu.getByRole("menuitem", { name: "Open", exact: true });
  const share = menu.getByRole("menuitem", { name: "Share", exact: true });
  await open.hover();
  await expect(open).toHaveAttribute("data-highlighted");

  // Offsets are read relative to the menu within each frame, so page motion cannot skew them.
  const movement = menu.evaluate(async (element) => {
    const offset = (node: Element) => node.getBoundingClientRect().y - element.getBoundingClientRect().y;
    const rows = [...element.querySelectorAll('[role="menuitem"]')];
    const from = offset(rows.find((row) => row.textContent?.startsWith("Open"))!);
    const target = rows.find((row) => row.textContent?.startsWith("Share"))!;
    const positions: number[] = [];
    const start = performance.now();
    while (performance.now() - start < 650) {
      await new Promise(requestAnimationFrame);
      for (const indicator of element.querySelectorAll('[data-slot="context-menu-highlight"]')) {
        positions.push(offset(indicator));
      }
    }
    return { from, to: offset(target), positions };
  });
  await share.hover();
  const { from, to, positions } = await movement;
  expect(positions.some((y) => y > from + 2 && y < to - 2)).toBe(true);
  expect(positions.at(-1)).toBeCloseTo(to, 0);
  await expect(menu.locator(highlight)).toHaveCount(1);

  const submenu = page.getByRole("menu", { name: "Share", exact: true });
  await expect(submenu).toBeVisible();
  await expect(share).toHaveAttribute("aria-expanded", "true");
  const email = submenu.getByRole("menuitem", { name: "Email", exact: true });
  await email.hover();
  await expect(email).toHaveAttribute("data-highlighted");
  await expect(share.locator(highlight)).toHaveCount(1);
  await expect(submenu.locator(highlight)).toHaveCount(1);
  // The submenu's first row lines up with the row that opened it.
  const first = await submenu.getByRole("menuitem", { name: "Copy link" }).boundingBox();
  const row = await share.boundingBox();
  expect(first?.y).toBeCloseTo(row?.y ?? 0, 0);

  await email.click();
  await expect(submenu).not.toBeVisible();
  await expect(menu).not.toBeVisible();
  await expect(page.locator(".demo-frame").getByRole("status")).toHaveText("Email selected");
});

test.describe("touch", () => {
  test.use({ hasTouch: true });

  test("a long press opens the menu from the finger, after the trigger responds to the press", async ({
    page,
  }) => {
    const area = await ready(page);
    const point = await pointIn(page, 60, 40);
    const client = await page.context().newCDPSession(page);

    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await expect(area).toHaveAttribute("data-pressing", "");
    await expect(page.locator(content)).toHaveCount(0);
    const menu = page.getByRole("menu", { name: "File actions" });
    await expect(menu).toBeVisible();
    await expect(area).not.toHaveAttribute("data-pressing");
    await expect(menu).toHaveCSS("opacity", "1");
    const placed = await geometry(page);
    expect(placed.origin.x).toBeCloseTo(point.x, 0);
    expect(placed.origin.y).toBeCloseTo(point.y, 0);

    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name: "Rename" }).tap();
    await expect(menu).not.toBeVisible();
    await expect(page.locator(".demo-frame").getByRole("status")).toHaveText("Rename selected");
  });
});

test("reduced motion fades the menu without scaling it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const point = await pointIn(page, 40, 30);

  const opening = sample(page, 400);
  await page.mouse.click(point.x, point.y, { button: "right" });
  const menu = page.getByRole("menu", { name: "File actions" });
  await expect(menu).toBeVisible();
  const opened = await opening;
  expect(opened.every(({ scale }) => scale === 1)).toBe(true);
  expect(opened.some(({ opacity }) => opacity < 1)).toBe(true);
  expect(opened.at(-1)?.opacity).toBe(1);

  // The highlight lands on a row at once instead of sliding to it.
  await page.keyboard.press("End");
  const row = menu.getByRole("menuitem", { name: "Delete" });
  await expect(row).toBeFocused();
  const offsets = await row.evaluate(async (element) => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const indicator = element.querySelector('[data-slot="context-menu-highlight"]');
    if (!indicator) throw new Error("Missing highlight");
    return { row: element.getBoundingClientRect().y, highlight: indicator.getBoundingClientRect().y };
  });
  expect(offsets.highlight).toBeCloseTo(offsets.row, 1);

  const closing = sample(page, 400);
  await page.keyboard.press("Escape");
  const closed = await closing;
  expect(closed.every(({ scale }) => scale === 1)).toBe(true);
  await expect(page.locator(content)).toHaveCount(0);
});

test("the material turns solid for reduced transparency and gains edges for more contrast", async ({
  page,
}) => {
  await ready(page);
  const point = await pointIn(page, 40, 30);
  const client = await page.context().newCDPSession(page);
  const menu = page.getByRole("menu", { name: "File actions" });
  const surface = () =>
    menu.evaluate((element) => {
      const style = getComputedStyle(element);
      const probe = document.createElement("span");
      probe.style.color = "var(--foreground)";
      element.append(probe);
      const ink = getComputedStyle(probe).color;
      probe.remove();
      // Draw the background on a canvas to read its alpha, whatever color space it is written in.
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("Missing canvas");
      context.fillStyle = style.backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return {
        alpha: context.getImageData(0, 0, 1, 1).data[3],
        blur: style.backdropFilter,
        inkBorder: style.borderTopColor === ink,
      };
    });
  const emulate = async (name: string, value: string) => {
    await client.send("Emulation.setEmulatedMedia", { features: [{ name, value }] });
    await page.keyboard.press("Escape");
    await expect(page.locator(content)).toHaveCount(0);
    await page.mouse.click(point.x, point.y, { button: "right" });
    await expect(menu).toHaveCSS("opacity", "1");
  };

  await page.mouse.click(point.x, point.y, { button: "right" });
  await expect(menu).toHaveCSS("opacity", "1");
  const translucent = await surface();
  expect(translucent.alpha).toBeLessThan(255);
  expect(translucent.blur).toContain("blur");
  expect(translucent.inkBorder).toBe(false);

  await emulate("prefers-reduced-transparency", "reduce");
  expect(await surface()).toMatchObject({ alpha: 255, blur: "none" });

  await emulate("prefers-contrast", "more");
  expect(await surface()).toMatchObject({ alpha: 255, blur: "none", inkBorder: true });
  const open = menu.getByRole("menuitem", { name: "Open", exact: true });
  await open.hover();
  await expect(open.locator(highlight)).toHaveCSS("outline-width", "2px");
});

test("catalog, source, and registry expose the installable context menu", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-row-link[href="/components/context-menu"]').click();
  await expect(page.getByRole("heading", { name: "Context Menu", exact: true })).toBeVisible();
  const item = await (await request.get("/r/context-menu.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.registryDependencies ?? []).toEqual([]);
  expect(item.files[0].target).toBe("components/animated/context-menu.tsx");
  expect(item.files[0].content).toContain("export function ContextMenuCheckboxItem");
  expect(item.files[0].content).not.toContain("@/components/ui");
  const guide = await request.get("/docs/components/context-menu.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/context-menu");
});
