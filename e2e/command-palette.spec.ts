import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const trigger = '[data-slot="command-palette-trigger"]';
const popup = '[data-slot="command-palette"]';
const input = '[data-slot="command-palette-input"]';
const highlight = '[data-slot="command-palette-highlight"]';
const row = (id: string) => `[data-slot="command-palette-item"][data-value="${id}"]`;

type Frame = {
  /** Milliseconds since recording began. */
  at: number;
  scale: number;
  y: number;
  opacity: number;
  top: number;
  events: string;
  /** The `data-slot` of the focused element. */
  focus: string | null;
} | null;

type Press = { key: string; ctrlKey?: boolean };

// Records an element's transform, opacity, position, pointer events, and where focus is on every frame.
// Keys in `presses` are sent from inside the page first, `gap` frames apart, to the element matching
// `on` (or the document). They share the page's frame clock with the samples, so each one lands
// mid-flight however busy the machine is. Recording then runs on for `ms`.
function record(
  page: Page,
  selector: string,
  ms: number,
  presses: Press[] = [],
  { gap = 0, on = null as string | null } = {},
): Promise<{ frames: Frame[]; pressedAt: number[] }> {
  return page.evaluate(
    async ([selector, ms, presses, gap, on]) => {
      const frames: Frame[] = [];
      const pressedAt: number[] = [];
      const began = performance.now();
      const sample = async () => {
        // Read once the frame's own callbacks have run, so a sample is what that frame drew.
        await new Promise(requestAnimationFrame);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) {
          frames.push(null);
          return;
        }
        const style = getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform === "none" ? undefined : style.transform);
        frames.push({
          at: performance.now() - began,
          scale: matrix.a,
          y: matrix.f,
          opacity: Number(style.opacity),
          top: element.getBoundingClientRect().top,
          events: style.pointerEvents,
          focus: document.activeElement?.getAttribute("data-slot") ?? null,
        });
      };
      for (const press of presses) {
        pressedAt.push(frames.length);
        const target = (on && document.querySelector(on)) || document;
        target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...press }));
        for (let frame = 0; frame < gap; frame++) await sample();
      }
      const tail = performance.now();
      while (performance.now() - tail < ms) await sample();
      return { frames, pressedAt };
    },
    [selector, ms, presses, gap, on] as const,
  );
}

// Start it without awaiting, act, then await it to see what happened in between.
const watch = async (page: Page, selector: string, ms: number) => (await record(page, selector, ms)).frames;

const seen = (frames: Frame[]) => frames.filter((frame) => frame !== null);

const shortcut: Press = { key: "k", ctrlKey: true };

// Part-way through the surface's motion: visibly larger than at rest, and neither clear nor solid.
const midway = (frame: NonNullable<Frame>) =>
  frame.scale > 1.005 && frame.scale < 1.055 && frame.opacity > 0.05 && frame.opacity < 0.95;

// The surface's size and opacity hang off one value, so at any opacity it has one size, whichever way
// it is going.
const onPath = (frame: NonNullable<Frame>) => Math.abs(frame.scale - (1.06 - 0.06 * frame.opacity)) < 0.002;

// A spring covers only so much ground in the time between two samples, however many frames a busy
// machine drops. A jump covers it in no time at all.
const withoutJumps = (frames: NonNullable<Frame>[]) =>
  frames.every(
    (frame, index) =>
      index === 0 ||
      Math.abs(frame.scale - frames[index - 1].scale) <=
        0.005 + (0.6 * (frame.at - frames[index - 1].at)) / 1000,
  );

type Marked = HTMLElement & { marked?: boolean };

const activeLabel = (page: Page) =>
  page.evaluate((input) => {
    const id = document.querySelector(input)?.getAttribute("aria-activedescendant");
    return id ? document.getElementById(`${id}-label`)?.textContent : null;
  }, input);

const optionLabels = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[role="option"]')].map(
      (option) => document.getElementById(option.getAttribute("aria-labelledby")!)?.textContent,
    ),
  );

async function openFromTrigger(page: Page) {
  await page.locator(trigger).click();
  await expect(page.locator(popup)).toHaveAttribute("data-state", "open");
  await expect(page.locator(input)).toBeFocused();
}

// The surface has stopped moving once it reports no transform.
async function settled(page: Page) {
  await expect
    .poll(() => page.locator(popup).evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/command-palette");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("heading", { name: "Command Palette", exact: true })).toBeVisible();
});

test("the surface settles in from slightly larger and leaves by the way it came", async ({ page }) => {
  await page.locator(trigger).scrollIntoViewIfNeeded();
  const opening = watch(page, popup, 800);
  await page.locator(trigger).click();
  const opened = seen(await opening);

  // The docs search motion: a fade with a small settle, from 1.06 down to rest.
  expect(opened.some(midway)).toBe(true);
  await settled(page);
  await expect(page.locator(popup)).toHaveCSS("opacity", "1");
  // It never overshoots: the spring is critically damped, so the surface only ever shrinks to rest.
  const shrinking = opened.map((frame) => frame.scale);
  expect(Math.max(...shrinking)).toBeLessThanOrEqual(1.0601);
  expect(Math.min(...shrinking)).toBeGreaterThanOrEqual(0.9999);
  expect(shrinking.every((scale, index) => index === 0 || scale <= shrinking[index - 1] + 0.0005)).toBe(true);
  await expect(page.locator(input)).toBeFocused();
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  // The scrim fades on the same value as the surface.
  await expect(page.locator('[data-slot="command-palette-scrim"]')).toHaveCSS("opacity", "1");

  const closing = watch(page, popup, 700);
  await page.keyboard.press("Escape");
  const closed = seen(await closing);
  expect(closed.some(midway)).toBe(true);
  // Growing the whole way: no frame shrinks again on the way out.
  const growing = closed.map((frame) => frame.scale);
  expect(growing.every((scale, index) => index === 0 || scale >= growing[index - 1] - 0.0005)).toBe(true);
  // The way out retraces the way in.
  expect([...opened, ...closed].every(onPath)).toBe(true);

  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.locator('[data-slot="command-palette-scrim"]')).toHaveCount(0);
  await expect(page.locator(trigger)).toBeFocused();
});

test("reopening mid-exit turns the same surface around from where it is", async ({ page }) => {
  await openFromTrigger(page);
  await settled(page);
  await page.locator(popup).evaluate((element) => ((element as Marked).marked = true));

  // Close, and open again five frames into the exit.
  const { frames, pressedAt } = await record(page, popup, 900, [shortcut, shortcut], { gap: 5 });
  const samples = seen(frames);
  const turn = frames[pressedAt[1] - 1]!;

  await expect(page.locator(popup)).toHaveCount(1);
  await expect(page.locator(popup)).toHaveAttribute("data-state", "open");
  // It is the surface that was closing, not a new one.
  expect(await page.locator(popup).evaluate((element) => (element as Marked).marked)).toBe(true);
  // It had swelled and faded part of the way when it was turned around.
  expect(turn.opacity).toBeGreaterThan(0);
  expect(turn.opacity).toBeLessThan(1);
  expect(turn.scale).toBeGreaterThan(1);
  // Focus was already back on the trigger by then: closing hands it back as the fade starts.
  expect(turn.focus).toBe("command-palette-trigger");
  // It came back along the same path, without restarting from closed or jumping.
  expect(Math.min(...samples.map((frame) => frame.opacity))).toBeGreaterThan(0);
  expect(withoutJumps(samples)).toBe(true);
  expect(samples.every(onPath)).toBe(true);
  await settled(page);
  await expect(page.locator(input)).toBeFocused();
});

test("⌘K toggles the palette, and pressing it again mid-flight turns it around without losing input", async ({
  page,
}) => {
  await page.locator(trigger).scrollIntoViewIfNeeded();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.locator(popup)).toHaveAttribute("data-state", "open");
  await expect(page.locator(input)).toBeFocused();
  // The shortcut belongs to the demo on this page: the site search stays closed.
  await expect(page.getByRole("dialog")).toHaveCount(1);

  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.locator(popup)).toHaveCount(0);

  // Open, close while it is still opening, and open again while it is still closing.
  const { frames, pressedAt } = await record(page, popup, 900, [shortcut, shortcut, shortcut], { gap: 8 });
  const samples = seen(frames);
  for (const press of pressedAt.slice(1)) {
    const turn = frames[press - 1];
    expect(turn?.opacity).toBeGreaterThan(0);
    expect(turn?.opacity).toBeLessThan(1);
  }
  // One surface the whole time, turned around from wherever it was.
  expect(frames.slice(frames.findIndex((frame) => frame !== null)).every((frame) => frame !== null)).toBe(
    true,
  );
  expect(withoutJumps(samples)).toBe(true);
  expect(samples.every(onPath)).toBe(true);

  // It ended up open, and the keyboard goes straight to it.
  await expect(page.locator(popup)).toHaveAttribute("data-state", "open");
  await expect(page.locator(input)).toBeFocused();
  await page.keyboard.type("theme");
  await expect(page.locator(input)).toHaveValue("theme");
  expect(await activeLabel(page)).toBe("Change theme");
  await settled(page);

  await page.keyboard.press("Escape");
  await expect(page.locator(popup)).toHaveCount(0);

  // With the trigger scrolled away the shortcut still opens it, centred near the top of the screen.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(trigger)).not.toBeInViewport();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.locator(popup)).toHaveAttribute("data-state", "open");
  await settled(page);
  const box = (await page.locator(popup).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(10);
  expect(box.y).toBeLessThan(viewport.height / 3);

  await page.keyboard.press("Escape");
  await expect(page.locator(popup)).toHaveCount(0);
});

test("results reorder by gliding, and typing mid-flight neither queues nor restarts the move", async ({
  page,
}) => {
  await openFromTrigger(page);
  await settled(page);
  const feedback = page.locator(row("feedback"));
  await feedback.evaluate((element) => ((element as Marked).marked = true));
  const start = (await feedback.evaluate((element) => element.getBoundingClientRect().top)) as number;

  // "Components" still matches "s" and stops matching at "se".
  const leaving = watch(page, row("components"), 700);
  const frames = watch(page, row("feedback"), 1100);
  await page.keyboard.type("s");
  await page.waitForTimeout(70);
  await page.keyboard.type("e");
  const tops = seen(await frames).map((frame) => frame.top);

  // "Send feedback" is now the best match, at the top of the list.
  expect(await optionLabels(page)).toEqual([
    "Send feedback",
    "Blocks",
    "Invite a teammate",
    "Switch workspace",
  ]);
  expect(await activeLabel(page)).toBe("Send feedback");
  // It is the same element as before, moved rather than recreated.
  expect(await feedback.evaluate((element) => (element as Marked).marked)).toBe(true);
  await expect(feedback.locator("mark")).toHaveText("Se");

  const end = tops.at(-1)!;
  expect(start - end).toBeGreaterThan(150);
  // It passed through the space in between instead of blinking to the new place.
  const between = new Set(tops.filter((top) => top < start - 2 && top > end + 2).map(Math.round));
  expect(between.size).toBeGreaterThan(4);
  // The second keystroke landed mid-flight. The row kept heading up from where it was: it never
  // snapped back to restart, never jumped ahead, and came to rest once.
  for (let index = 1; index < tops.length; index++) {
    expect(tops[index]).toBeLessThanOrEqual(tops[index - 1] + 1);
    expect(tops[index - 1] - tops[index]).toBeLessThan((start - end) * 0.6);
  }
  await expect.poll(() => feedback.evaluate((element) => getComputedStyle(element).transform)).toBe("none");

  // A row that stops matching gives up the pointer the moment it starts to fade, so it can neither
  // run nor pull the highlight on its way out.
  const fading = seen(await leaving).filter((frame) => frame.opacity < 1);
  expect(fading.length).toBeGreaterThan(0);
  expect(fading.every((frame) => frame.events === "none")).toBe(true);

  // Rows that no longer match are gone, not left behind invisible.
  await expect(page.locator('[data-slot="command-palette-item"]')).toHaveCount(4);
  await expect(page.getByRole("status").filter({ hasText: "4 results" })).toHaveCount(1);

  // Clearing the query brings every row back under its heading.
  await page.locator(input).fill("");
  await expect(page.locator('[data-slot="command-palette-item"]')).toHaveCount(11);
  await page.locator(input).fill("zzzz");
  await expect(page.locator('[data-slot="command-palette-empty"]')).toHaveText("No results for “zzzz”");
  await expect(page.locator('[data-slot="command-palette-item"]')).toHaveCount(0);
});

test("one highlight glides between rows and follows keyboard and pointer without a fight", async ({
  page,
}) => {
  await openFromTrigger(page);
  await settled(page);
  await expect(page.locator(highlight)).toHaveCount(1);
  expect(await activeLabel(page)).toBe("Components");

  // Keyboard: the highlight travels to the next row instead of jumping.
  const first = (await page.locator(row("components")).boundingBox())!;
  const second = (await page.locator(row("blocks")).boundingBox())!;
  const gliding = watch(page, highlight, 350);
  await page.keyboard.press("ArrowDown");
  const tops = seen(await gliding).map((frame) => frame.top);
  expect(await activeLabel(page)).toBe("Blocks");
  expect(tops.some((top) => top > first.y + 2 && top < second.y - 2)).toBe(true);
  expect(Math.abs(tops.at(-1)! - second.y)).toBeLessThan(1);
  await expect(page.locator(row("blocks"))).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);

  // Pointer: moving over a row takes the highlight there.
  const docs = (await page.locator(row("docs")).boundingBox())!;
  await page.mouse.move(docs.x + 60, docs.y + docs.height / 2 - 2);
  await page.mouse.move(docs.x + 64, docs.y + docs.height / 2);
  await expect.poll(() => activeLabel(page)).toBe("Documentation");
  await expect
    .poll(async () => Math.abs((await page.locator(highlight).boundingBox())!.y - docs.y))
    .toBeLessThan(1);

  // Keyboard again, with the pointer resting where it is. End scrolls the list under the pointer,
  // which must not pull the highlight back to whatever row slides beneath it.
  await page.keyboard.press("End");
  await expect.poll(() => activeLabel(page)).toBe("Send feedback");
  await expect(page.locator(row("feedback"))).toBeInViewport();
  await page.waitForTimeout(400);
  expect(await activeLabel(page)).toBe("Send feedback");
  await page.keyboard.press("ArrowUp");
  // "Delete project" is disabled, so the highlight is on the row above the disabled one.
  await page.keyboard.press("ArrowUp");
  expect(await activeLabel(page)).toBe("Switch workspace");
  await page.waitForTimeout(200);
  expect(await activeLabel(page)).toBe("Switch workspace");

  // A real move hands it back to the pointer, and focus has stayed in the input throughout.
  const shortcuts = (await page.locator(row("shortcuts")).boundingBox())!;
  await page.mouse.move(shortcuts.x + 80, shortcuts.y + shortcuts.height / 2);
  await expect.poll(() => activeLabel(page)).toBe("Keyboard shortcuts");
  await page.keyboard.press("Home");
  expect(await activeLabel(page)).toBe("Components");
  await expect(page.locator(input)).toBeFocused();

  // Pressing a row lands the highlight before the click commits, and the click runs it.
  const invite = page.locator(row("invite"));
  const target = (await invite.boundingBox())!;
  await page.mouse.move(target.x + 40, target.y + target.height / 2);
  await page.mouse.down();
  expect(await activeLabel(page)).toBe("Invite a teammate");
  await expect(page.locator(input)).toBeFocused();
  await page.mouse.up();
  await expect(page.getByText("Ran “Invite a teammate”")).toBeVisible();
  await expect(page.locator(popup)).toHaveCount(0);
});

test("arrow keys pressed in quick succession redirect one glide instead of queueing", async ({ page }) => {
  await openFromTrigger(page);
  await settled(page);
  const rests = [
    (await page.locator(row("components")).boundingBox())!.y,
    (await page.locator(row("blocks")).boundingBox())!.y,
    (await page.locator(row("docs")).boundingBox())!.y,
  ];
  const to = (await page.locator(row("new-project")).boundingBox())!.y;

  // Three presses, three frames apart.
  const arrows = [{ key: "ArrowDown" }, { key: "ArrowDown" }, { key: "ArrowDown" }];
  const { frames, pressedAt } = await record(page, highlight, 700, arrows, { gap: 3, on: input });
  const tops = seen(frames).map((frame) => frame.top);

  expect(await activeLabel(page)).toBe("New project");
  // The second and third presses landed while the highlight was still travelling, between rows.
  for (const press of pressedAt.slice(1)) {
    const top = frames[press - 1]!.top;
    expect(rests.every((rest) => Math.abs(top - rest) > 0.5)).toBe(true);
  }
  // It kept going down from wherever it was: it never turned back, and it came to rest once, on the
  // last row asked for.
  for (let index = 1; index < tops.length; index++) {
    expect(tops[index]).toBeGreaterThanOrEqual(tops[index - 1] - 0.5);
  }
  await expect
    .poll(async () => Math.abs((await page.locator(highlight).boundingBox())!.y - to))
    .toBeLessThan(1);
});

test("nested pages open with Enter, go back with Backspace, and running an item closes the palette", async ({
  page,
}) => {
  await openFromTrigger(page);
  await page.keyboard.type("theme");
  expect(await optionLabels(page)).toContain("Change theme");
  expect(await activeLabel(page)).toBe("Change theme");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("listbox", { name: "Change theme" })).toBeVisible();
  await expect.poll(() => optionLabels(page)).toEqual(["Light", "Dark"]);
  await expect(page.locator(input)).toHaveValue("");
  await expect(page.locator(input)).toBeFocused();
  await expect(page.locator('[data-slot="command-palette-back"]')).toBeVisible();
  await expect(page.getByText("Nothing run yet")).toBeVisible();

  // Backspace edits a query first, and only goes back once it is empty.
  await page.keyboard.type("d");
  await expect.poll(() => optionLabels(page)).toEqual(["Dark"]);
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("listbox", { name: "Change theme" })).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("listbox", { name: "Command palette" })).toBeVisible();
  await expect(page.locator('[data-slot="command-palette-back"]')).toHaveCount(0);
  await expect.poll(() => optionLabels(page)).toHaveLength(11);
  // It returns to the item the page was opened from, scrolled into view.
  expect(await activeLabel(page)).toBe("Change theme");
  await expect(page.locator(row("theme"))).toBeInViewport();

  // The back button does the same without taking focus from the input.
  await page.keyboard.press("Enter");
  await expect.poll(() => optionLabels(page)).toEqual(["Light", "Dark"]);
  await page.locator('[data-slot="command-palette-back"]').click();
  await expect.poll(() => optionLabels(page)).toHaveLength(11);
  await expect(page.locator(input)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect.poll(() => optionLabels(page)).toEqual(["Light", "Dark"]);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Ran “Dark”")).toBeVisible();
  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.locator(trigger)).toBeFocused();
});

test("focus stays in the input, and a click on the scrim closes the palette", async ({ page }) => {
  await openFromTrigger(page);
  await settled(page);
  const field = page.locator(input);
  await expect(field).toHaveAttribute("role", "combobox");
  await expect(field).toHaveAttribute("aria-expanded", "true");
  const listId = await field.getAttribute("aria-controls");
  await expect(page.locator(`[id="${listId}"]`)).toHaveAttribute("role", "listbox");
  const activeId = await field.getAttribute("aria-activedescendant");
  await expect(page.locator(`[id="${activeId}"]`)).toHaveAttribute("aria-selected", "true");

  for (let step = 0; step < 3; step++) {
    await page.keyboard.press("Tab");
    await expect(field).toBeFocused();
  }
  await page.keyboard.press("Shift+Tab");
  await expect(field).toBeFocused();

  // The page behind does not scroll or react while the palette is open.
  await expect(page.getByRole("heading", { name: "Command Palette", exact: true })).toHaveCount(0);

  await page.mouse.click(6, page.viewportSize()!.height - 6);
  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.locator(trigger)).toBeFocused();
});

test("reduced motion fades the surface and swaps results without travel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  const opening = watch(page, popup, 350);
  await page.locator(trigger).click();
  const opened = seen(await opening);
  expect(opened.every((frame) => frame.scale === 1)).toBe(true);
  await expect(page.locator(popup)).toHaveCSS("opacity", "1");
  await expect(page.locator(input)).toBeFocused();

  // The row is either where it was or where it ends up, never in between.
  const feedback = page.locator(row("feedback"));
  const start = (await feedback.evaluate((element) => element.getBoundingClientRect().top)) as number;
  const frames = watch(page, row("feedback"), 500);
  await page.keyboard.type("se");
  const samples = seen(await frames);
  expect(await activeLabel(page)).toBe("Send feedback");
  const end = samples.at(-1)!.top;
  expect(start - end).toBeGreaterThan(150);
  expect(samples.every((frame) => frame.y === 0 && frame.scale === 1)).toBe(true);
  expect(samples.every((frame) => Math.abs(frame.top - start) < 1 || Math.abs(frame.top - end) < 1)).toBe(
    true,
  );

  // The highlight moves with the keyboard, without a glide.
  const next = (await page.locator(row("blocks")).boundingBox())!;
  const moving = watch(page, highlight, 250);
  await page.keyboard.press("ArrowDown");
  const tops = seen(await moving).map((frame) => frame.top);
  expect(await activeLabel(page)).toBe("Blocks");
  expect(tops.every((top) => Math.abs(top - end) < 1 || Math.abs(top - next.y) < 1)).toBe(true);
  expect(Math.abs(tops.at(-1)! - next.y)).toBeLessThan(1);

  const closing = watch(page, popup, 350);
  await page.keyboard.press("Escape");
  expect(seen(await closing).every((frame) => frame.scale === 1)).toBe(true);
  await expect(page.locator(popup)).toHaveCount(0);
  await expect(page.locator(trigger)).toBeFocused();
});

test("the surface is translucent, and solid under reduced transparency or more contrast", async ({
  page,
}) => {
  const surface = () =>
    page.locator(popup).evaluate((element) => {
      const style = getComputedStyle(element);
      // Resolve whatever colour syntax the browser reports to its alpha channel.
      const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      canvas.fillStyle = style.backgroundColor;
      canvas.fillRect(0, 0, 1, 1);
      return { alpha: canvas.getImageData(0, 0, 1, 1).data[3] / 255, backdrop: style.backdropFilter };
    });

  await openFromTrigger(page);
  const translucent = await surface();
  expect(translucent.alpha).toBeGreaterThan(0.5);
  expect(translucent.alpha).toBeLessThan(0.9);
  expect(translucent.backdrop).toContain("blur");
  // The scrim dims the page behind it.
  const scrim = page.locator('[data-slot="command-palette-scrim"]');
  await expect(scrim).toHaveCSS("opacity", "1");
  expect(await scrim.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    "rgba(0, 0, 0, 0)",
  );

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  await expect.poll(async () => (await surface()).alpha).toBe(1);
  expect((await surface()).backdrop).toBe("none");

  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-contrast", value: "more" }],
  });
  await expect.poll(async () => (await surface()).alpha).toBe(1);
  expect((await surface()).backdrop).toBe("none");
});

test("the palette fits a phone screen and rows run on tap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFromTrigger(page);
  await settled(page);
  const box = (await page.locator(popup).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(382);
  expect(box.y + box.height).toBeLessThan(844);
  // Rows are comfortable touch targets.
  expect((await page.locator(row("components")).boundingBox())!.height).toBeGreaterThanOrEqual(44);

  await page.locator(row("blocks")).click();
  await expect(page.getByText("Ran “Blocks”")).toBeVisible();
  await expect(page.locator(popup)).toHaveCount(0);
});
