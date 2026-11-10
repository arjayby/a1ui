import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const ROW = 36;

const wheel = (page: Page, name: string) => page.locator(".demo-frame").getByRole("listbox", { name });
const selected = (list: Locator) => list.getByRole("option", { selected: true });
const scrollTop = (list: Locator) => list.evaluate((element) => element.scrollTop);
const readout = (page: Page) => page.locator('[data-slot="wheel-picker-demo-value"]');

async function open(page: Page) {
  await page.goto("/components/wheel-picker");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await wheel(page, "Hour").scrollIntoViewIfNeeded();
}

test("follows native scrolling, clicks, keys and typeahead, and sits its value at the centre", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  const hour = wheel(page, "Hour");
  const minute = wheel(page, "Minute");
  await expect(selected(hour)).toHaveText("9");
  await expect(readout(page)).toHaveText("9:41 AM");
  expect(await scrollTop(hour)).toBe(8 * ROW);
  expect(await scrollTop(minute)).toBe(41 * ROW);
  await expect(page.locator('input[name="minute"]')).toHaveValue("41");

  // The drum: the centre row is flat and opaque, its neighbours tilt and fade with distance.
  const label = (text: string) => hour.getByRole("option", { name: text, exact: true }).locator("span");
  await expect(label("9")).toHaveCSS("transform", "none");
  await expect(label("9")).toHaveCSS("opacity", "1");
  await expect(label("10")).toHaveCSS("transform", /matrix3d/);
  expect(Number(await label("10").evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(
    0.8,
  );

  // A mouse wheel scrolls natively; the value follows and scroll snap rests on a row.
  await hour.hover();
  await page.mouse.wheel(0, 2 * ROW);
  await expect(selected(hour)).toHaveText("11");
  await expect(readout(page)).toHaveText("11:41 AM");
  await expect.poll(() => scrollTop(hour)).toBe(10 * ROW);

  await hour.getByRole("option", { name: "12", exact: true }).click();
  await expect(selected(hour)).toHaveText("12");
  await expect.poll(() => scrollTop(hour)).toBe(11 * ROW);
  await expect(hour).toHaveAttribute("aria-activedescendant", (await selected(hour).getAttribute("id"))!);

  await hour.focus();
  await page.keyboard.press("ArrowUp");
  await expect(selected(hour)).toHaveText("11");
  await page.keyboard.press("Home");
  await expect(selected(hour)).toHaveText("1");
  await page.keyboard.press("PageDown");
  await expect(selected(hour)).toHaveText("6");
  await page.keyboard.press("End");
  await expect(selected(hour)).toHaveText("12");
  await page.keyboard.press("3");
  await expect(selected(hour)).toHaveText("3");
  await expect.poll(() => scrollTop(hour)).toBe(2 * ROW);

  // Left and right walk between the wheels of a group.
  await page.keyboard.press("ArrowRight");
  await expect(minute).toBeFocused();
  await page.keyboard.type("07");
  await expect(selected(minute)).toHaveText("07");
  await expect(readout(page)).toHaveText("3:07 AM");
  await expect.poll(() => scrollTop(minute)).toBe(7 * ROW);
  await expect(page.locator('input[name="minute"]')).toHaveValue("07");
  expect(errors).toEqual([]);
});

test("drags with the mouse, rubber-bands at the end and scrolls to a value set from outside", async ({
  page,
}) => {
  await open(page);
  const minute = wheel(page, "Minute");
  const period = wheel(page, "AM or PM");
  const box = (await minute.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 10);
  await expect(minute).toHaveAttribute("data-dragging", "");
  // Held still, the wheel sits exactly as far from its start as the pointer moved after the drag began.
  await page.mouse.move(x, y - 10 - 2 * ROW, { steps: 6 });
  await expect(selected(minute)).toHaveText("43");
  const held = await scrollTop(minute);
  expect(held).toBeGreaterThan(42.5 * ROW);
  expect(held).toBeLessThanOrEqual(43.2 * ROW);
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(minute).not.toHaveAttribute("data-dragging");
  await expect.poll(() => scrollTop(minute)).toBe(43 * ROW);
  await expect(readout(page)).toHaveText("9:43 AM");

  // Past the last row the list stretches with resistance instead of stopping dead, then returns.
  const list = period.locator('[data-slot="wheel-picker-list"]');
  const periodBox = (await period.boundingBox())!;
  const px = periodBox.x + periodBox.width / 2;
  const py = periodBox.y + periodBox.height / 2;
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.mouse.move(px, py + 120, { steps: 6 });
  const stretched = await list.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42);
  expect(stretched).toBeGreaterThan(20);
  expect(stretched).toBeLessThan(100);
  await page.mouse.up();
  await expect(list).toHaveCSS("transform", "none");
  await expect(selected(period)).toHaveText("AM");

  // "Set to now" changes all three values at once and each wheel scrolls to its own.
  await page.getByRole("button", { name: "Set to now" }).click();
  for (const name of ["Hour", "Minute", "AM or PM"]) {
    const list = wheel(page, name);
    const index = Number(await selected(list).getAttribute("data-index"));
    await expect.poll(() => scrollTop(list)).toBe(index * ROW);
  }
  const [hours, minutes] = [
    await selected(wheel(page, "Hour")).innerText(),
    await selected(minute).innerText(),
  ];
  await expect(readout(page)).toHaveText(`${hours}:${minutes} ${await selected(period).innerText()}`);
});

test("skips disabled options and follows a value its parent corrects", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Picker: time" }).click();
  await page.getByRole("menuitem", { name: "date", exact: true }).click();
  const month = wheel(page, "Month");
  const day = wheel(page, "Day");
  await expect(readout(page)).toHaveText("February 14, 2026");
  await expect(day.getByRole("option", { name: "29", exact: true })).toHaveAttribute("aria-disabled", "true");
  await day.focus();
  await page.keyboard.press("End");
  await expect(selected(day)).toHaveText("28");
  // Wait for the wheel to rest: a click on a moving wheel takes the row passing under the pointer.
  await expect.poll(() => scrollTop(day)).toBe(27 * ROW);
  await day.getByRole("option", { name: "29", exact: true }).click({ force: true });
  await expect(selected(day)).toHaveText("28");

  // Scrolling far past the disabled days still comes to rest on an enabled one.
  await day.hover();
  await page.mouse.wheel(0, 3 * ROW);
  await expect.poll(() => scrollTop(day)).toBe(27 * ROW);
  await expect(selected(day)).toHaveText("28");

  await month.focus();
  await page.keyboard.press("ArrowUp");
  await expect(readout(page)).toHaveText("January 28, 2026");
  await day.focus();
  await page.keyboard.press("End");
  await expect(selected(day)).toHaveText("31");
  await expect.poll(() => scrollTop(day)).toBe(30 * ROW);
  // February has no 31st: the demo pulls the day back and the wheel follows it.
  await month.focus();
  await page.keyboard.press("ArrowDown");
  await expect(readout(page)).toHaveText("February 28, 2026");
  await expect.poll(() => scrollTop(day)).toBe(27 * ROW);
});

test("touch scrolls natively, and reduced motion gives a flat list positioned at once", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await open(page);
  const hour = wheel(page, "Hour");
  const neighbour = hour.getByRole("option", { name: "10", exact: true }).locator("span");
  await expect(neighbour).toHaveCSS("transform", "none");

  // No spring: the wheel is already on the row when the key handler returns.
  await hour.focus();
  await page.keyboard.press("End");
  expect(await scrollTop(hour)).toBe(11 * ROW);
  await expect(selected(hour)).toHaveText("12");
  await page.getByRole("button", { name: "Set to now" }).click();
  expect(await scrollTop(hour)).toBe(Number(await selected(hour).getAttribute("data-index")) * ROW);

  await hour.focus();
  await page.keyboard.press("Home");
  await expect(selected(hour)).toHaveText("1");
  const box = (await hour.boundingBox())!;
  const client = await context.newCDPSession(page);
  const point = (offset: number) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 - offset });
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(0)] });
  for (const offset of [20, 50, 80, 100]) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(offset)] });
  }
  await expect(selected(hour)).not.toHaveText("1");
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect
    .poll(async () => {
      const top = await scrollTop(hour);
      return (
        top > 0 && top % ROW === 0 && top === Number(await selected(hour).getAttribute("data-index")) * ROW
      );
    })
    .toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/wheel-picker"]').click();
  await expect(page.getByRole("heading", { name: "Wheel Picker", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "breadcrumb", exact: true })
      .locator('[data-slot="breadcrumb-page"]'),
  ).toHaveText("Wheel Picker");
  const item = await (await request.get("/r/wheel-picker.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies ?? []).toEqual([]);
  expect(item.files[0].target).toBe("components/animated/wheel-picker.tsx");
  expect(item.files[0].content).toContain("export function WheelPicker");
  expect(item.files[0].content).toContain("export function WheelPickerGroup");
  const guide = await request.get("/docs/components/wheel-picker.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/wheel-picker");
});
