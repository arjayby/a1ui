import type { Locator, Page } from "@playwright/test";

import { expect, revealed, test } from "./fixtures";

const tasks = [
  "Write the launch brief",
  "Review the pricing page",
  "Publish the changelog",
  "Send beta invites",
  "Book the retro",
];

async function open(page: Page) {
  await page.goto("/components/reorder-list");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await revealed(page);
  const frame = page.locator(".demo-frame");
  const rows = frame.locator('[data-slot="reorder-list-item"]');
  const root = frame.locator('[data-slot="reorder-list"]');
  await center(root);
  return {
    frame,
    rows,
    root,
    titles: rows.locator("p.font-medium"),
    row: (title: string) => rows.filter({ hasText: title }),
    handle: (title: string) => frame.getByRole("button", { name: `Reorder ${title}` }),
    live: frame.locator("[aria-live]"),
  };
}

/** Puts the list mid-viewport: clear of the sticky toolbar, and away from the edges that scroll the page. */
const center = (root: Locator) =>
  root.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
const box = (locator: Locator) =>
  locator.evaluate((el) => {
    const { top, height, left, width } = el.getBoundingClientRect();
    return { top, left, height, x: left + width / 2, y: top + height / 2 };
  });
/** The vertical offset a row is currently painted at. */
const shift = (locator: Locator) =>
  locator.evaluate((el) => {
    const transform = getComputedStyle(el).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
  });

test("lifts on press, tracks the pointer, opens a gap, and settles into it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { frame, rows, root, titles, row, handle, live } = await open(page);
  await expect(titles).toHaveText(tasks);
  const first = row(tasks[0]);
  const start = await box(first);
  const second = await box(row(tasks[1]));
  const third = await box(row(tasks[2]));
  const grip = await box(handle(tasks[0]));

  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  // The lift is feedback for the press itself, before any movement.
  await expect(first).toHaveAttribute("data-lifted");
  await expect
    .poll(async () => (await first.evaluate((el) => getComputedStyle(el).transform)) !== "none")
    .toBe(true);

  // The row scales about its centre, so its centre stays exactly as far from the pointer as it began.
  await page.mouse.move(grip.x, grip.y + 30, { steps: 4 });
  await expect.poll(async () => (await box(first)).y - start.y).toBeCloseTo(30, 0);
  await expect(root).toHaveAttribute("data-dragging");
  await expect.poll(() => shift(row(tasks[1]))).toBe(0);

  // Past the third row, the two rows it passed close up by its height and the gap between rows.
  const travel = third.top + third.height - (start.top + start.height) + 6;
  await page.mouse.move(grip.x, grip.y + travel, { steps: 12 });
  const closed = -(start.height + (second.top - start.top - start.height));
  await expect.poll(() => shift(row(tasks[1]))).toBeCloseTo(closed, 0);
  await expect.poll(() => shift(row(tasks[2]))).toBeCloseTo(closed, 0);
  expect(await shift(row(tasks[3]))).toBe(0);
  await expect(frame.locator('[data-slot="reorder-list-gap"]')).toHaveCSS("opacity", "1");
  // Nothing is committed while the row is held.
  await expect(titles).toHaveText(tasks);

  await page.mouse.up();
  const moved = [tasks[1], tasks[2], tasks[0], tasks[3], tasks[4]];
  await expect(titles).toHaveText(moved);
  await expect(live).toHaveText(`${tasks[0]} moved to position 3 of 5.`);
  await expect(first).not.toHaveAttribute("data-lifted");
  for (const item of await rows.all()) await expect(item).toHaveCSS("transform", "none");
  // The row landed exactly where the gap was.
  await expect
    .poll(async () => (await box(first)).top + start.height)
    .toBeCloseTo(third.top + third.height, 0);
  expect(await page.evaluate(() => String(getSelection()))).toBe("");
  expect(errors).toEqual([]);
});

test("a settling row can be caught again and Escape puts a dragged row back", async ({ page }) => {
  const { rows, titles, row, handle, live } = await open(page);
  const first = row(tasks[0]);
  const grip = await box(handle(tasks[0]));
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  await page.mouse.move(grip.x, grip.y + 30, { steps: 4 });
  // Rest before letting go, so the row is released with no velocity, 30px above nothing: it
  // has to travel back to its slot.
  await page.waitForTimeout(160);
  await page.mouse.up();
  await page.mouse.down();
  // Caught mid-flight: it is still away from its slot, and it stays where it was caught.
  const caught = await shift(first);
  expect(caught).toBeGreaterThan(5);
  await page.waitForTimeout(120);
  expect(await shift(first)).toBeCloseTo(caught, 0);
  await page.mouse.move(grip.x, grip.y + 200, { steps: 8 });
  await expect.poll(() => shift(row(tasks[1]))).toBeLessThan(-40);
  await page.keyboard.press("Escape");
  await expect(live).toHaveText(`Reorder cancelled. ${tasks[0]} returned to position 1 of 5.`);
  await page.mouse.up();
  await expect(titles).toHaveText(tasks);
  for (const item of await rows.all()) await expect(item).toHaveCSS("transform", "none");
});

test("moves a row from the keyboard, announces each step, and restores on Escape", async ({ page }) => {
  const { titles, row, handle, live } = await open(page);
  const grip = handle(tasks[1]);
  await grip.focus();
  await page.keyboard.press("Space");
  await expect(grip).toHaveAttribute("aria-pressed", "true");
  await expect(live).toHaveText(
    `Picked up ${tasks[1]}. Position 2 of 5. Use the arrow keys to move, Space to drop, Escape to cancel.`,
  );
  await page.keyboard.press("ArrowDown");
  await expect(live).toHaveText(`${tasks[1]} moved to position 3 of 5.`);
  await page.keyboard.press("ArrowDown");
  await expect(live).toHaveText(`${tasks[1]} moved to position 4 of 5.`);
  await expect.poll(() => shift(row(tasks[1]))).toBeGreaterThan(100);
  await page.keyboard.press("Space");
  const moved = [tasks[0], tasks[2], tasks[3], tasks[1], tasks[4]];
  await expect(titles).toHaveText(moved);
  await expect(live).toHaveText(`${tasks[1]} dropped at position 4 of 5.`);
  await expect(grip).toBeFocused();
  await expect(grip).toHaveAttribute("aria-pressed", "false");
  await expect(row(tasks[1])).toHaveCSS("transform", "none");

  await page.keyboard.press("Enter");
  await page.keyboard.press("Home");
  await expect(live).toHaveText(`${tasks[1]} moved to position 1 of 5.`);
  await page.keyboard.press("Escape");
  await expect(live).toHaveText(`Reorder cancelled. ${tasks[1]} returned to position 4 of 5.`);
  await expect(titles).toHaveText(moved);
  await expect(grip).toBeFocused();
  // Tabbing away drops the row where it is.
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Tab");
  await expect(titles).toHaveText([tasks[0], tasks[2], tasks[1], tasks[3], tasks[4]]);
});

test("without a handle the whole row drags, and clicks and text selection still work", async ({ page }) => {
  const { root, rows, titles, row } = await open(page);
  await page.getByRole("switch", { name: "Drag handle" }).uncheck();
  await expect(page.getByRole("button", { name: /^Reorder / })).toHaveCount(0);
  await center(root);
  const title = await box(row(tasks[1]).locator("p.font-medium"));

  // A click lifts the row and puts it back without reordering.
  await page.mouse.move(title.x, title.y);
  await page.mouse.down();
  await expect(row(tasks[1])).toHaveAttribute("data-lifted");
  await page.mouse.move(title.x, title.y + 3);
  await expect(root).not.toHaveAttribute("data-dragging");
  await page.mouse.up();
  await expect(row(tasks[1])).not.toHaveAttribute("data-lifted");

  // Dragging sideways across the text selects it.
  await page.mouse.move(title.left + 4, title.y);
  await page.mouse.down();
  await page.mouse.move(title.left + 84, title.y + 2, { steps: 6 });
  await expect(row(tasks[1])).not.toHaveAttribute("data-lifted");
  await page.mouse.up();
  expect((await page.evaluate(() => String(getSelection()))).length).toBeGreaterThan(3);
  await expect(titles).toHaveText(tasks);

  // Dragging vertically from the same text moves the row and leaves no selection behind.
  await page.mouse.move(title.x, title.y);
  await page.mouse.down();
  await page.mouse.move(title.x, title.y - 120, { steps: 10 });
  await expect(root).toHaveAttribute("data-dragging");
  expect(await page.evaluate(() => String(getSelection()))).toBe("");
  await page.mouse.up();
  await expect(titles).toHaveText([tasks[1], tasks[0], tasks[2], tasks[3], tasks[4]]);
  for (const item of await rows.all()) await expect(item).toHaveCSS("transform", "none");

  // The row itself takes focus and the keyboard.
  await row(tasks[4]).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Home");
  await page.keyboard.press("Space");
  await expect(titles).toHaveText([tasks[4], tasks[1], tasks[0], tasks[2], tasks[3]]);
  await expect(row(tasks[4])).toBeFocused();
});

test("scrolls its container while a row is held near the edge", async ({ page }) => {
  const { root, titles, row, handle } = await open(page);
  await page.getByRole("button", { name: "List: short" }).click();
  await page.getByRole("menuitem", { name: "long", exact: true }).click();
  await expect(titles).toHaveCount(12);
  await center(root);
  const view = await box(root);
  const grip = await box(handle(tasks[0]));
  const offset = grip.y - (await box(row(tasks[0]))).y;
  await page.mouse.move(grip.x, grip.y);
  await page.mouse.down();
  const edge = view.top + view.height - 8;
  await page.mouse.move(grip.x, edge, { steps: 10 });
  // Held still at the bottom edge, the list scrolls to its end under the row.
  await expect
    .poll(() => root.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop), { timeout: 15_000 })
    .toBeLessThan(1);
  // The row is still under the pointer, resisting at the end of the list.
  expect(Math.abs((await box(row(tasks[0]))).y + offset - edge)).toBeLessThan(40);
  await page.mouse.up();
  await expect(titles.last()).toHaveText(tasks[0]);
  await expect(row(tasks[0])).toHaveCSS("transform", "none");
});

test("touch drags by the handle with reduced motion, and a held row drags without one", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "html { scroll-behavior: auto !important; }";
      document.head.append(style);
    });
  });
  const { root, rows, titles, row, handle } = await open(page);
  const client = await context.newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x?: number, y?: number) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: x === undefined || y === undefined ? [] : [{ x, y }],
    });
  const scrolled = () => page.evaluate(() => scrollY);
  const before = await scrolled();

  const first = await box(row(tasks[0]));
  const second = await box(row(tasks[1]));
  const grip = await box(handle(tasks[0]));
  await touch("touchStart", grip.x, grip.y);
  await expect(row(tasks[0])).toHaveAttribute("data-lifted");
  for (let step = 1; step <= 6; step += 1) await touch("touchMove", grip.x, grip.y + step * 20);
  // No scale and no travel: the passed row is already in its new place.
  await expect.poll(() => shift(row(tasks[0]))).toBe(120);
  expect(await row(tasks[0]).evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a)).toBe(
    1,
  );
  expect(await shift(row(tasks[1]))).toBeCloseTo(-(second.top - first.top), 0);
  await touch("touchEnd");
  await expect(titles).toHaveText([tasks[1], tasks[0], tasks[2], tasks[3], tasks[4]]);
  for (const item of await rows.all()) await expect(item).toHaveCSS("transform", "none");
  expect(await scrolled()).toBe(before);

  await page.getByRole("switch", { name: "Drag handle" }).uncheck();
  await center(root);
  const swipeStart = await scrolled();
  // A swipe across a row scrolls the page and moves nothing.
  const last = await box(row(tasks[4]));
  await touch("touchStart", last.x, last.y);
  for (let step = 1; step <= 8; step += 1) await touch("touchMove", last.x, last.y - step * 15);
  await touch("touchEnd");
  await expect.poll(scrolled).toBeGreaterThan(swipeStart + 40);
  await expect(page.locator("[data-lifted]")).toHaveCount(0);
  await expect(titles).toHaveText([tasks[1], tasks[0], tasks[2], tasks[3], tasks[4]]);

  // Resting a finger on the row lifts it, and then it drags instead of scrolling.
  await expect
    .poll(async () => {
      const y = await scrolled();
      await page.waitForTimeout(100);
      return (await scrolled()) === y;
    })
    .toBe(true);
  // Back to mid-viewport, where holding the row cannot reach the edges that scroll the page.
  await center(root);
  const rest = await scrolled();
  const held = await box(row(tasks[4]));
  await touch("touchStart", held.x, held.y);
  await expect(row(tasks[4])).toHaveAttribute("data-lifted");
  for (let step = 1; step <= 6; step += 1) await touch("touchMove", held.x, held.y - step * 15);
  await expect(root).toHaveAttribute("data-dragging");
  await touch("touchEnd");
  await expect(titles).toHaveText([tasks[1], tasks[0], tasks[2], tasks[4], tasks[3]]);
  expect(await scrolled()).toBe(rest);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/reorder-list"]').click();
  await page.waitForURL("**/components/reorder-list");
  await expect(page.getByRole("heading", { name: "Reorder List", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "breadcrumb", exact: true })
      .locator('[data-slot="breadcrumb-page"]'),
  ).toHaveText("Reorder List");
  const item = await (await request.get("/r/reorder-list.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/reorder-list.tsx");
  expect(item.files[0].content).toContain("export function ReorderList");
  expect(item.files[0].content).toContain("export function ReorderListHandle");
  const guide = await request.get("/docs/components/reorder-list.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/reorder-list");
});
