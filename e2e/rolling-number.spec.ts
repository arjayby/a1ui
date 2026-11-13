import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

interface Frame {
  /** Milliseconds since sampling began. */
  time: number;
  /** Wheel position of every digit column, in digits from 0 up to 10. */
  wheels: number[];
  /** Width of the whole number. */
  width: number;
  /** Width of every slot, digits and symbols alike. */
  slots: number[];
}

// Runs each step at its time, clicking a demo button by name, and records every frame for `ms`.
async function sample(frame: Locator, steps: [number, string][], ms: number) {
  return frame.evaluate(
    async (root: Element, { steps, ms }) => {
      const value = root.querySelector('[data-slot="rolling-number-value"]')!;
      const press = (name: string) =>
        [...root.querySelectorAll("button")].find((button) => button.textContent!.includes(name))!.click();
      const offset = (element: Element) => {
        const { transform } = getComputedStyle(element);
        return transform === "none" ? 0 : Number.parseFloat(transform.split(",")[5]);
      };
      const frames: Frame[] = [];
      const began = performance.now();
      let next = 0;
      while (performance.now() - began < ms) {
        const time = performance.now() - began;
        while (next < steps.length && time >= steps[next][0]) press(steps[next++][1]);
        frames.push({
          time,
          wheels: [...value.querySelectorAll("[data-digit]")].map(
            (wheel) => (-offset(wheel) / wheel.getBoundingClientRect().height) * 11,
          ),
          width: value.getBoundingClientRect().width,
          slots: [...value.children].map((slot) => slot.getBoundingClientRect().width),
        });
        await new Promise(requestAnimationFrame);
      }
      return frames;
    },
    { steps, ms },
  );
}

/** Signed distance between two wheel positions, the short way round. */
const turn = (from: number, to: number) => ((((to - from + 5) % 10) + 10) % 10) - 5;

async function open(page: Page) {
  await page.goto("/components/rolling-number");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const value = frame.locator('[data-slot="rolling-number-value"]');
  await expect(value).toHaveAttribute("data-value", "1,284");
  return { frame, value };
}

test("digits roll up for an increase and down for a decrease", async ({ page }) => {
  const { frame, value } = await open(page);
  const text = frame.locator('[data-slot="rolling-number-text"]');
  // Assistive tech gets the value as one string; the rolling columns are hidden from it.
  await expect(frame.getByText("1,284", { exact: true })).toHaveCount(1);
  await expect(text).toHaveAttribute("aria-live", "polite");
  await expect(value).toHaveAttribute("aria-hidden", "true");

  // 1,284 to 1,353: the ones wheel turns forward from 4 through 9 and 0 to 3.
  const up = await sample(frame, [[0, "Increase"]], 1400);
  await expect(value).toHaveAttribute("data-value", "1,353");
  await expect(value).toHaveAttribute("data-direction", "up");
  await expect(text).toHaveText("1,353");
  const ones = up.map(({ wheels }) => wheels[3]);
  expect(ones[0]).toBeCloseTo(4, 1);
  expect(ones.some((position) => position > 6 && position < 9.5)).toBe(true);
  expect(ones.at(-1)).toBeCloseTo(3, 1);
  // Never backward: every frame moves the wheel forward or leaves it where it is.
  for (let index = 1; index < ones.length; index++) {
    expect(turn(ones[index - 1], ones[index])).toBeGreaterThan(-0.01);
  }
  // The thousands digit did not change, so its wheel never moved, and nothing changed width.
  expect(up.every(({ wheels }) => Math.abs(wheels[0] - 1) < 0.01)).toBe(true);
  expect(new Set(up.map(({ width }) => Math.round(width * 10))).size).toBe(1);

  // The delta chip names the change with a sign and an arrow, then leaves.
  const chip = frame.locator('[data-slot="rolling-number-delta"]');
  await expect(chip).toHaveText("+69");
  await expect(chip).toHaveAttribute("data-direction", "up");
  await expect(chip.locator("svg")).toHaveCount(1);
  await expect(chip).toHaveCSS("font-family", /^Inter/);
  await expect(chip).toHaveClass(/text-emerald-700/);
  await expect(chip).toHaveCount(0, { timeout: 6000 });

  // 1,353 to 1,422, then 1,422 to 1,002: the tens wheel turns backward from 2 to 0.
  await frame.getByRole("button", { name: "Increase 69" }).click();
  await expect(value).toHaveAttribute("data-value", "1,422");
  await expect(chip).toHaveCount(0, { timeout: 6000 });
  const down = await sample(frame, [[0, "Decrease"]], 1400);
  await expect(value).toHaveAttribute("data-direction", "down");
  await expect(chip).toHaveText("-420");
  await expect(chip).toHaveAttribute("data-direction", "down");
  await expect(chip).toHaveClass(/text-red-700/);
  const tens = down.map(({ wheels }) => wheels[2]);
  expect(tens.some((position) => position > 0.2 && position < 1.8)).toBe(true);
  for (let index = 1; index < tens.length; index++) {
    expect(turn(tens[index - 1], tens[index])).toBeLessThan(0.01);
  }
  expect(tens.at(-1)).toBeCloseTo(0, 1);
});

test("a new value mid-roll retargets from where the wheels are", async ({ page }) => {
  const { frame, value } = await open(page);
  await frame.getByRole("button", { name: "Increase 69" }).click();
  await expect(value).toHaveAttribute("data-value", "1,353");
  await expect(frame.locator('[data-slot="rolling-number-delta"]')).toHaveCount(0, { timeout: 6000 });
  // Increase starts the tens wheel forward from 5 toward 2; Decrease lands while it is still turning.
  const frames = await sample(
    frame,
    [
      [0, "Increase"],
      [110, "Decrease"],
    ],
    1600,
  );
  await expect(value).toHaveAttribute("data-value", "1,002");
  const interrupted = frames.findIndex(({ time }) => time >= 110);
  const tens = frames.map(({ wheels }) => wheels[2]);
  // The wheel had left 8 and was between digits when the second value arrived.
  expect(Math.abs(turn(5, tens[interrupted]))).toBeGreaterThan(0.05);
  // No frame restarts or teleports: each wheel moves no faster than a spring could carry it. The
  // window spans two frames, because a spring catches up in the frame after a dropped one.
  for (let index = 1; index < frames.length; index++) {
    const elapsed = (frames[index].time - frames[Math.max(0, index - 2)].time) / 1000;
    frames[index].wheels.forEach((position, wheel) => {
      expect(Math.abs(turn(frames[index - 1].wheels[wheel], position))).toBeLessThan(45 * elapsed + 0.2);
    });
  }
  expect(frames.at(-1)!.wheels.map((position) => Math.abs(Math.round(position)) % 10)).toEqual([1, 0, 0, 2]);
});

test("columns enter and leave at their own width without a jump", async ({ page }) => {
  const { frame, value } = await open(page);
  const digits = value.locator('[data-slot="rolling-number-digit"]');
  const symbols = value.locator('[data-slot="rolling-number-symbol"]');
  const digitWidth = (await digits.last().boundingBox())!.width;

  // 1,284 to 864: the thousands column and its separator close up.
  const closing = await sample(frame, [[0, "Decrease"]], 1800);
  await expect(digits).toHaveCount(3);
  await expect(symbols).toHaveCount(0);
  const widths = closing.map(({ width }) => width);
  expect(widths.some((width) => width < widths[0] - 2 && width > widths.at(-1)! + 2)).toBe(true);
  for (let index = 1; index < widths.length; index++) {
    expect(widths[index]).toBeLessThanOrEqual(widths[index - 1] + 0.5);
  }
  // The columns that stay keep one fixed width the whole time.
  expect(
    closing.every(({ slots }) => slots.slice(-3).every((slot) => Math.abs(slot - digitWidth) < 0.5)),
  ).toBe(true);

  // 864 to 933, then 933 to 1,002: they open again from nothing.
  await frame.getByRole("button", { name: "Increase 69" }).click();
  await expect(value).toHaveAttribute("data-value", "933");
  await page.waitForTimeout(1200);
  const opening = await sample(frame, [[0, "Increase"]], 1800);
  await expect(digits).toHaveCount(4);
  await expect(symbols).toHaveText([","]);
  const grown = opening.map(({ width }) => width);
  expect(grown.some((width) => width > grown[0] + 2 && width < grown.at(-1)! - 2)).toBe(true);
  expect(grown.at(-1)).toBeCloseTo(widths[0], 0);
});

test("formats through Intl.NumberFormat and works from the keyboard", async ({ page }) => {
  const { frame, value } = await open(page);
  const pick = async (format: string) => {
    await page.getByRole("button", { name: /^Format:/ }).click();
    await page.getByRole("menuitem", { name: format, exact: true }).click();
  };
  await pick("currency");
  await expect(value).toHaveAttribute("data-value", "$1,284.00");
  await expect(value.locator('[data-slot="rolling-number-symbol"]')).toHaveText(["$", ",", "."]);
  await pick("percent");
  await expect(value).toHaveAttribute("data-value", "12.84%");
  await expect(frame.getByRole("button", { name: "Increase 0.69%" })).toBeVisible();
  await pick("compact");
  await expect(value).toHaveAttribute("data-value", "128.4K");

  await frame.getByRole("button", { name: "Increase 6.9K" }).focus();
  await page.keyboard.press("Enter");
  await expect(value).toHaveAttribute("data-value", "135.3K");
  await expect(frame.locator('[data-slot="rolling-number-text"]')).toHaveText("135.3K");
  await expect(frame.locator('[data-slot="rolling-number-delta"]')).toHaveText("+6.9K");

  await page.getByRole("switch", { name: "Delta chip" }).uncheck();
  await frame.getByRole("button", { name: "Decrease 42K" }).click();
  await expect(value).toHaveAttribute("data-value", "93.3K");
  await expect(frame.locator('[data-slot="rolling-number-delta"]')).toHaveCount(0);
});

test("reduced motion cross-fades the changed digits on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { frame, value } = await open(page);
  // No wheels: each column holds only the digit it shows.
  await expect(value.locator("[data-digit]")).toHaveCount(0);
  const digits = value.locator('[data-slot="rolling-number-digit"]');
  await expect(digits).toHaveText(["1", "2", "8", "4"]);

  const seen = await frame.evaluate(async (root: Element) => {
    const columns = [...root.querySelectorAll('[data-slot="rolling-number-digit"]')];
    const box = root.querySelector('[data-slot="rolling-number-value"]')!.getBoundingClientRect();
    [...root.querySelectorAll("button")].find((button) => button.textContent!.includes("Increase"))!.click();
    const frames: { opacities: number[][]; moved: boolean }[] = [];
    const began = performance.now();
    while (performance.now() - began < 500) {
      frames.push({
        opacities: columns.map((column) =>
          [...column.querySelectorAll(":scope > span > span")].map((glyph) =>
            Number(getComputedStyle(glyph).opacity),
          ),
        ),
        moved: [...root.querySelectorAll('[data-slot="rolling-number-digit"] span')].some(
          (span) => getComputedStyle(span).transform !== "none",
        ),
      });
      await new Promise(requestAnimationFrame);
    }
    const after = root.querySelector('[data-slot="rolling-number-value"]')!.getBoundingClientRect();
    return { frames, shifted: Math.abs(after.left - box.left) + Math.abs(after.width - box.width) };
  });
  await expect(value).toHaveAttribute("data-value", "1,353");
  await expect(digits).toHaveText(["1", "3", "5", "3"]);
  // The ones column held the old and the new digit at once, partly transparent, and nothing slid.
  expect(seen.frames.some(({ opacities }) => opacities[3].length === 2)).toBe(true);
  expect(
    seen.frames.some(({ opacities }) => opacities[3].some((opacity) => opacity > 0.05 && opacity < 0.95)),
  ).toBe(true);
  expect(seen.frames.every(({ moved }) => !moved)).toBe(true);
  // The thousands digit did not change, so it never faded.
  expect(seen.frames.every(({ opacities }) => opacities[0].length === 1 && opacities[0][0] === 1)).toBe(true);
  expect(seen.shifted).toBeLessThan(0.5);

  const chip = frame.locator('[data-slot="rolling-number-delta"]');
  await expect(chip).toHaveText("+69");

  // The longest format still fits a phone: the chip stays inside the frame, clear of the buttons.
  await page.getByRole("button", { name: /^Format:/ }).click();
  await page.getByRole("menuitem", { name: "currency", exact: true }).click();
  await frame.getByRole("button", { name: "Decrease $420" }).click();
  await expect(value).toHaveAttribute("data-value", "$933.00");
  await expect(chip).toHaveText("-$420.00");
  await expect(chip).toHaveCSS("opacity", "1");
  const [chipBox, frameBox, valueBox, buttonBox] = await Promise.all(
    [chip, frame, value, frame.getByRole("button", { name: "Increase $69" })].map((part) => part.boundingBox()),
  );
  expect(chipBox!.x).toBeGreaterThanOrEqual(frameBox!.x);
  expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(frameBox!.x + frameBox!.width);
  expect(chipBox!.y).toBeGreaterThanOrEqual(valueBox!.y + valueBox!.height);
  expect(chipBox!.y + chipBox!.height).toBeLessThanOrEqual(buttonBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the rolling number", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/rolling-number"]').click();
  await expect(page.getByRole("heading", { name: "Rolling Number", exact: true })).toBeVisible();
  const item = await (await request.get("/r/rolling-number.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/rolling-number.tsx");
  expect(item.files[0].content).toContain("export function RollingNumber");
  const guide = await request.get("/docs/components/rolling-number.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/rolling-number");
});
