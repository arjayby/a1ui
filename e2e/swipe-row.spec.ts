import type { Locator, Page } from "@playwright/test";

import { expect, revealed, test } from "./fixtures";

const rows = (page: Page) => page.locator('.demo-frame [data-slot="swipe-row"]');

/** How far the row's content has slid, in pixels: negative reveals the trailing actions. */
const offset = (row: Locator) =>
  row
    .locator('[data-slot="swipe-row-content"]')
    .evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);

async function open(page: Page) {
  await page.goto("/components/swipe-row");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await revealed(page);
  await rows(page).first().scrollIntoViewIfNeeded();
}

/** Presses near the right edge of the row and drags left by `distance`, leaving the button held. */
async function dragLeft(page: Page, row: Locator, distance: number) {
  const box = await row.boundingBox();
  if (!box) throw new Error("Expected a row");
  const y = box.y + box.height / 2;
  const x = box.x + box.width - 24;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - distance, y, { steps: Math.ceil(distance / 10) });
  return box;
}

/** Lifts after a pause, so the release carries no velocity and position alone decides. */
async function settleAndLift(page: Page) {
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test("tracks the pointer, opens one row at a time, and closes on a press outside", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  const first = rows(page).nth(0);
  const second = rows(page).nth(1);
  const remove = first.getByRole("button", { name: "Delete" });
  await expect(remove).not.toBeInViewport();

  // The first 10 pixels pick the axis; after that the row follows the pointer 1:1.
  const box = await dragLeft(page, first, 60);
  await expect(first).toHaveAttribute("data-dragging", "true");
  await expect.poll(() => offset(first)).toBeCloseTo(-50, 0);
  await page.mouse.move(box.x + box.width - 24 - 110, box.y + box.height / 2, { steps: 5 });
  await expect.poll(() => offset(first)).toBeCloseTo(-100, 0);
  await settleAndLift(page);
  await expect(first).toHaveAttribute("data-open", "trailing");
  await expect.poll(() => offset(first)).toBeCloseTo(-144, 0);
  await expect(remove).toBeInViewport({ ratio: 1 });
  const removeBox = await remove.boundingBox();
  expect(removeBox!.x + removeBox!.width).toBeCloseTo(box.x + box.width, 0);

  // Past the width of the actions the row resists instead of following.
  await dragLeft(page, first, 60);
  await expect.poll(() => offset(first)).toBeLessThan(-150);
  expect(await offset(first)).toBeGreaterThan(-190);
  await settleAndLift(page);
  await expect.poll(() => offset(first)).toBeCloseTo(-144, 0);

  await dragLeft(page, second, 100);
  await expect(first).not.toHaveAttribute("data-open");
  await settleAndLift(page);
  await expect(second).toHaveAttribute("data-open", "trailing");
  await expect.poll(() => offset(first)).toBeCloseTo(0, 0);

  await page.locator(".component-demo-stage").click({ position: { x: 8, y: 8 } });
  await expect(second).not.toHaveAttribute("data-open");
  await expect.poll(() => offset(second)).toBeCloseTo(0, 0);
  expect(errors).toEqual([]);
});

test("commits the primary action on a full swipe and leaves a short flick open", async ({ page }) => {
  await open(page);
  const first = rows(page).nth(0);
  const remove = first.getByRole("button", { name: "Delete" });
  const box = await first.boundingBox();
  if (!box) throw new Error("Expected a row");

  // A quick 40 pixel flick is thrown open by its momentum, and never deletes.
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 24, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 64, y, { steps: 4 });
  await page.mouse.up();
  await expect(first).toHaveAttribute("data-open", "trailing");
  await expect(rows(page)).toHaveCount(4);
  await expect.poll(() => offset(first)).toBeCloseTo(-144, 0);

  // Dragging most of the way across arms the swipe, and moving back disarms it.
  await dragLeft(page, first, 160);
  await expect(first).toHaveAttribute("data-full-swipe", "true");
  await page.mouse.move(box.x + box.width - 24 - 60, y, { steps: 6 });
  await expect(first).not.toHaveAttribute("data-full-swipe");
  await page.mouse.move(box.x + box.width - 24 - 170, y, { steps: 8 });
  await expect(first).toHaveAttribute("data-full-swipe", "true");
  // The primary action stretches from the edge of the content to the edge of the row.
  await expect
    .poll(async () => (await remove.boundingBox())!.x - (box.x + box.width + (await offset(first))))
    .toBeCloseTo(0, 0);
  await settleAndLift(page);
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator(".demo-frame").getByText("Ines Okafor")).toHaveCount(0);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(rows(page)).toHaveCount(4);
  await page.getByRole("switch", { name: "Full swipe" }).uncheck();
  // Reaching the controls scrolled the page, so bring the list back clear of the sticky header.
  await rows(page)
    .nth(0)
    .evaluate((element) => element.scrollIntoView({ block: "center" }));
  await dragLeft(page, rows(page).nth(0), 300);
  await expect(rows(page).nth(0)).not.toHaveAttribute("data-full-swipe");
  await settleAndLift(page);
  await expect(rows(page)).toHaveCount(4);
  await expect(rows(page).nth(0)).toHaveAttribute("data-open", "trailing");
});

test("reveals the actions on keyboard focus and runs them without a gesture", async ({ page }) => {
  await open(page);
  const first = rows(page).nth(0);
  const second = rows(page).nth(1);
  await first.getByRole("button", { name: "Read" }).focus();
  await expect(first).toHaveAttribute("data-open", "leading");
  await expect(first.getByRole("button", { name: "Read" })).toBeInViewport({ ratio: 1 });

  await page.keyboard.press("Tab");
  await expect(first.getByRole("button", { name: "Pin" })).toBeFocused();
  await expect(first).toHaveAttribute("data-open", "trailing");
  await expect(first.getByRole("button", { name: "Pin" })).toBeInViewport({ ratio: 1 });
  await page.keyboard.press("Enter");
  // The action ran, and focus keeps the row open.
  await expect(first.getByRole("button", { name: "Unpin" })).toBeFocused();
  await expect(first).toHaveAttribute("data-open", "trailing");

  await page.keyboard.press("Tab");
  await expect(first.getByRole("button", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(second.getByRole("button", { name: "Read" })).toBeFocused();
  await expect(first).not.toHaveAttribute("data-open");
  await expect(second).toHaveAttribute("data-open", "leading");

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Space");
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator(".demo-frame").getByText("Ines Okafor")).toHaveCount(0);

  await page.getByRole("button", { name: "Actions: both" }).click();
  await page.getByRole("menuitem", { name: "trailing", exact: true }).click();
  await expect(page.locator('.demo-frame [data-slot="swipe-row-actions"][data-side="leading"]')).toHaveCount(
    0,
  );
});

test("touch scrolls vertically, swipes horizontally, and fades with reduced motion", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/components/swipe-row");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const row = rows(page).nth(1);
  await row.scrollIntoViewIfNeeded();
  const box = await row.boundingBox();
  if (!box) throw new Error("Expected a row");
  const client = await context.newCDPSession(page);
  const y = box.y + box.height / 2;
  const touch = async (points: [x: number, y: number][]) => {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: points[0][0], y: points[0][1] }],
    });
    for (const [x, pointY] of points.slice(1)) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: pointY }] });
    }
    await page.waitForTimeout(150);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  // A vertical drag that starts on the row scrolls the page and leaves the row shut.
  const scrolled = await page.evaluate(() => scrollY);
  await touch([
    [box.x + 200, y],
    [box.x + 196, y - 30],
    [box.x + 190, y - 80],
    [box.x + 120, y - 120],
  ]);
  await expect(row).not.toHaveAttribute("data-open");
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(scrolled);

  await row.scrollIntoViewIfNeeded();
  const moved = await row.boundingBox();
  if (!moved) throw new Error("Expected a row");
  const movedY = moved.y + moved.height / 2;
  await touch([
    [moved.x + 300, movedY],
    [moved.x + 270, movedY + 2],
    [moved.x + 230, movedY + 3],
    [moved.x + 190, movedY + 3],
  ]);
  await expect(row).toHaveAttribute("data-open", "trailing");
  // Nothing slides: the actions fade in over the edge of the row.
  await expect(row.locator('[data-slot="swipe-row-content"]')).toHaveCSS("transform", "none");
  const actions = row.locator('[data-slot="swipe-row-actions"][data-side="trailing"]');
  await expect(actions).toHaveCSS("opacity", "1");
  await expect(row.getByRole("button", { name: "Delete" })).toHaveCSS("transform", "none");
  await row.getByRole("button", { name: "Pin" }).tap();
  await expect(row).not.toHaveAttribute("data-open");
  await expect(actions).toHaveCSS("opacity", "0");
  await expect(row.getByLabel("Pinned")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-row-link[href="/components/swipe-row"]').click();
  await expect(page.getByRole("heading", { name: "Swipe Row", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "breadcrumb", exact: true })
      .locator('[data-slot="breadcrumb-page"]'),
  ).toHaveText("Swipe Row");
  const item = await (await request.get("/r/swipe-row.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/swipe-row.tsx");
  expect(item.files[0].content).toContain("export function SwipeRow");
  const guide = await request.get("/docs/components/swipe-row.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/swipe-row");
});
