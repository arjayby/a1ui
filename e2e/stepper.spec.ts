import type { Locator } from "@playwright/test";

import { expect, test } from "./fixtures";

/** Samples a computed style on every frame for a while, to catch motion that settles back. */
const sample = (locator: Locator, property: "transform" | "opacity", duration = 400) =>
  locator.evaluate(
    async (element, [name, time]) => {
      const seen = new Set<string>();
      const start = performance.now();
      while (performance.now() - start < time) {
        seen.add(getComputedStyle(element)[name]);
        await new Promise(requestAnimationFrame);
      }
      return [...seen];
    },
    [property, duration] as const,
  );

/** Reads the vertical offset, in pixels, out of a computed `matrix(...)` transform. */
const offsetY = (transform: string) =>
  Math.abs(Number(transform.match(/matrix\(([^)]+)\)/)?.[1].split(",")[5] ?? 0));

test("steps on pointer down, repeats while held, and nudges at a limit", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/stepper");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const stepper = page.locator('.demo-frame [data-slot="stepper"]');
  const value = page.getByRole("spinbutton", { name: "Guests" });
  const roll = stepper.locator('[data-slot="stepper-roll"]');
  const rows = roll.locator('[data-slot="stepper-row"]');
  const increase = stepper.getByRole("button", { name: "Increase Guests" });
  const decrease = stepper.getByRole("button", { name: "Decrease Guests" });
  const now = async () => Number(await value.getAttribute("aria-valuenow"));
  const width = async () => (await stepper.boundingBox())?.width;
  await expect(value).toHaveAttribute("aria-valuenow", "2");
  await expect(value).toHaveAttribute("aria-valuemin", "1");
  await expect(value).toHaveAttribute("aria-valuemax", "8");
  const footprint = await width();

  // The step lands on pointer down: the value has changed before the pointer comes back up.
  const whileDown = await increase.evaluate(async (button) => {
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }));
    // React commits the update in a microtask after the event.
    await new Promise((resolve) => setTimeout(resolve));
    const during = button.parentElement?.querySelector('[role="spinbutton"]')?.getAttribute("aria-valuenow");
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }));
    return during;
  });
  expect(whileDown).toBe("3");
  await expect(roll).toHaveText("3");
  await expect(rows).toHaveCount(1);

  // A real press moves focus to the value and keeps repeating until the pointer leaves the button.
  await increase.hover();
  await page.mouse.down();
  await expect(value).toBeFocused();
  await expect.poll(now).toBeGreaterThan(4);
  await page.mouse.move(0, 0);
  const left = await now();
  await page.waitForTimeout(600);
  expect(await now()).toBe(left);
  await page.mouse.up();

  // Held to the far limit, the repeat ends there and the button dims.
  await increase.hover();
  await page.mouse.down();
  await expect(value).toHaveAttribute("aria-valuenow", "8", { timeout: 15_000 });
  await page.mouse.up();
  await expect(increase).toHaveAttribute("aria-disabled", "true");
  await expect(increase).toHaveCSS("opacity", "0.35");
  await expect(roll).toHaveText("8");
  await expect(rows).toHaveCount(1);
  expect(await width()).toBe(footprint);

  // A second step mid-roll continues from where the first one is, without snapping back.
  const retarget = await stepper.evaluate(async (element) => {
    const button = element.querySelector('[data-slot="stepper-decrement"]');
    const track = element.querySelector('[data-slot="stepper-roll"]');
    if (!button || !track) throw new Error("Expected the stepper parts");
    const press = () => {
      button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }));
      button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }));
    };
    // Vertical offset of the value that is leaving, read from its first character.
    const leaving = () => {
      const char = track.querySelector('[data-slot="stepper-row"] > span');
      if (!char) return 0;
      const { transform } = getComputedStyle(char);
      return transform === "none" ? 0 : new DOMMatrix(transform).m42;
    };
    const frame = () => new Promise(requestAnimationFrame);
    press();
    // Wait until the old value is visibly on its way out, however slow the frames are.
    for (let tries = 0; tries < 60 && leaving() < 1; tries += 1) await frame();
    const before = leaving();
    const count = track.querySelectorAll('[data-slot="stepper-row"]').length;
    press();
    await frame();
    await frame();
    return { before, after: leaving(), count };
  });
  // Stepping down rolls the old value downward, and it keeps going after the second press.
  expect(retarget.count).toBe(2);
  expect(retarget.before).toBeGreaterThanOrEqual(1);
  expect(retarget.after).toBeGreaterThan(retarget.before);
  await expect(value).toHaveAttribute("aria-valuenow", "6");
  await expect(roll).toHaveText("6");
  await expect(rows).toHaveCount(1);

  // Keyboard: the value is the tab stop, and the keys follow the spinbutton pattern.
  await value.focus();
  await page.keyboard.press("Home");
  await expect(value).toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  await expect(value).toHaveAttribute("aria-valuenow", "3");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft");
  await expect(value).toHaveAttribute("aria-valuenow", "1");
  await page.keyboard.press("PageUp");
  await expect(value).toHaveAttribute("aria-valuenow", "8");
  await page.keyboard.press("End");
  await page.keyboard.press("PageDown");
  await expect(value).toHaveAttribute("aria-valuenow", "1");
  await expect(roll).toHaveText("1");
  expect(await width()).toBe(footprint);

  // At the minimum the button dims but still answers a press with a nudge that springs back.
  await expect(decrease).toHaveAttribute("aria-disabled", "true");
  await expect(roll).toHaveCSS("transform", "none");
  await decrease.hover();
  await page.mouse.down();
  const nudge = await sample(roll, "transform");
  await page.mouse.up();
  expect(nudge.some((transform) => offsetY(transform) > 0.5)).toBe(true);
  await expect(roll).toHaveCSS("transform", "none");
  await expect(value).toHaveAttribute("aria-valuenow", "1");

  // A longer format reserves its own width and keeps it across the whole range.
  await page.getByRole("button", { name: "Value: guests" }).click();
  await page.getByRole("menuitem", { name: "budget", exact: true }).click();
  const budget = page.getByRole("spinbutton", { name: "Budget" });
  await expect(budget).toHaveAttribute("aria-valuetext", "$150");
  const budgetFootprint = await width();
  expect(budgetFootprint).toBeGreaterThan(footprint ?? Infinity);
  await budget.focus();
  for (const [key, shown] of [
    ["Home", "$0"],
    ["ArrowUp", "$25"],
    ["PageUp", "$125"],
    ["End", "$500"],
  ]) {
    await page.keyboard.press(key);
    await expect(roll).toHaveText(shown);
    expect(await width()).toBe(budgetFootprint);
  }
  await expect(budget).toHaveAttribute("aria-valuetext", "$500");

  await page.getByRole("switch", { name: "Disabled" }).check();
  await expect(budget).toHaveAttribute("aria-disabled", "true");
  await expect(stepper.getByRole("button", { name: "Decrease Budget" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("touch steps on mobile, and reduced motion cross-fades without a nudge", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/components/stepper");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const stepper = page.locator('.demo-frame [data-slot="stepper"]');
  const value = page.getByRole("spinbutton", { name: "Guests" });
  const roll = stepper.locator('[data-slot="stepper-roll"]');
  const now = async () => Number(await value.getAttribute("aria-valuenow"));
  await stepper.scrollIntoViewIfNeeded();
  const client = await context.newCDPSession(page);
  const center = async (name: string) => {
    const bounds = await stepper.getByRole("button", { name }).boundingBox();
    if (!bounds) throw new Error(`Expected the ${name} button`);
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  };

  // The finger steps on the way down, and sliding off the button ends the hold while it is
  // still on the glass.
  const plus = await center("Increase Guests");
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [plus] });
  await expect.poll(now).toBeGreaterThan(2);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: plus.x, y: plus.y + 120 }],
  });
  const left = await now();
  await page.waitForTimeout(600);
  expect(await now()).toBe(left);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(roll).toHaveText(String(left));

  // The value fades across in place: no character ever moves.
  const moved = await stepper.evaluate(async (element) => {
    const button = element.querySelector('[data-slot="stepper-decrement"]');
    if (!button) throw new Error("Expected the decrement button");
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1 }));
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1 }));
    const seen = new Set<string>();
    const start = performance.now();
    while (performance.now() - start < 400) {
      for (const char of element.querySelectorAll('[data-slot="stepper-row"] > span')) {
        seen.add(getComputedStyle(char).transform);
      }
      await new Promise(requestAnimationFrame);
    }
    return [...seen];
  });
  expect(moved).toEqual(["none"]);
  await expect(roll).toHaveText(String(left - 1));
  await expect(roll.locator('[data-slot="stepper-row"]')).toHaveCount(1);

  // A press at the limit changes nothing and does not nudge.
  await value.focus();
  await page.keyboard.press("Home");
  await expect(roll).toHaveText("1");
  const minus = await center("Decrease Guests");
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [minus] });
  const nudge = await sample(roll, "transform", 300);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  expect(nudge).toEqual(["none"]);
  await expect(value).toHaveAttribute("aria-valuenow", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/stepper"]').click();
  await expect(page.getByRole("heading", { name: "Stepper", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "breadcrumb", exact: true })
      .locator('[data-slot="breadcrumb-page"]'),
  ).toHaveText("Stepper");
  const item = await (await request.get("/r/stepper.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@phosphor-icons/react"]));
  expect(item.files[0].target).toBe("components/animated/stepper.tsx");
  expect(item.files[0].content).toContain("export function Stepper");
  const guide = await request.get("/docs/components/stepper.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/stepper");
});
