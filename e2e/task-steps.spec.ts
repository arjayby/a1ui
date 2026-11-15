import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Matched on the label alone: a step's detail or log may mention another step's name.
const step = (page: Page, label: string) =>
  page
    .locator('.demo-frame [data-slot="task-steps-step"]')
    .filter({ has: page.locator('[data-slot="task-steps-label"]').getByText(label, { exact: true }) });
const time = (row: Locator) => row.locator('[data-slot="task-steps-time"]');
const panel = (row: Locator) => row.locator('[data-slot="task-steps-panel"]');
const button = (page: Page, name: string) => page.locator(".demo-frame").getByRole("button", { name });
const message = (page: Page, kind: "status" | "alert") =>
  page.locator(`.demo-frame [data-slot="task-steps-${kind}-message"]`);

/*
 * The demo job advances on a 500ms timer: the queue finishes at 2s, and Install dependencies then
 * prints a line every 500ms. Freezing the page clock lets a test walk the job to an exact moment
 * however busy the machine is.
 *
 * Tests that watch an animation do not use it. Motion runs transforms on the document timeline,
 * which a frozen page clock falls out of step with, so those tests let the job run in real time.
 */
async function open(page: Page, { clock = false } = {}) {
  if (clock) await page.clock.install();
  await page.goto("/blocks/task-steps");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

async function runJobFor(page: Page, ms: number) {
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await button(page, "Run job").click();
  await expect(step(page, "Queue")).toHaveAttribute("aria-current", "step");
  await page.clock.runFor(ms);
}

// Runs `act`, reading `read(element)` on every frame for `ms` milliseconds.
async function sample(target: Locator, act: () => Promise<unknown>, read: string, ms = 500) {
  const frames = target.evaluate(
    async (element: Element, { read, ms }) => {
      const reader = new Function("element", `return ${read}`) as (element: Element) => number;
      const values: number[] = [];
      const began = performance.now();
      while (performance.now() - began < ms) {
        values.push(reader(element));
        await new Promise(requestAnimationFrame);
      }
      return values;
    },
    { read, ms },
  );
  await act();
  return frames;
}

const height = "element.getBoundingClientRect().height";
const scaleY = "new DOMMatrix(getComputedStyle(element).transform).d";
const opacity = "Number(getComputedStyle(element).opacity)";
// The sine of the angle an element has been turned through.
const turn = "new DOMMatrix(getComputedStyle(element).transform).b";
const heightOf = (target: Locator) => target.evaluate((element) => element.getBoundingClientRect().height);
const scaleOf = (target: Locator) =>
  target.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).d);
const opacityOf = (target: Locator) =>
  target.evaluate((element) => Number(getComputedStyle(element).opacity));
const surface = (row: Locator) => row.locator('[data-slot="task-steps-row"]');
const spinner = (row: Locator) => row.locator('[data-slot="task-steps-spinner"]');

test("narrates the job as an ordered list with a live clock in a fixed column", async ({ page }) => {
  await open(page, { clock: true });
  const list = page.locator(".demo-frame").getByRole("list", { name: "Deployment" });
  await expect(list.getByRole("listitem")).toHaveCount(5);
  expect(await list.evaluate((element) => element.tagName)).toBe("OL");
  await expect(list.locator("[aria-current]")).toHaveCount(0);

  const queue = step(page, "Queue");
  const install = step(page, "Install dependencies");
  await runJobFor(page, 1200);
  await expect(queue).toHaveAttribute("aria-current", "step");
  await expect(time(queue)).toHaveText("1s");
  await expect(queue.getByRole("button", { name: "Queue" })).toHaveAttribute("aria-expanded", "true");
  await expect(panel(queue)).toContainText("Waiting for a free build machine.");
  await expect(message(page, "status")).toHaveText("Queue: Running");

  // The queue finishes: its clock becomes a final duration, its detail closes, and the next step takes over.
  await page.clock.runFor(1400);
  await expect(install).toHaveAttribute("aria-current", "step");
  await expect(queue).not.toHaveAttribute("aria-current");
  await expect(queue).toHaveAttribute("data-status", "done");
  await expect(time(queue)).toHaveText("2.0s");
  await expect(time(install)).toHaveText("0s");
  await expect(queue.getByRole("button", { name: "Queue" })).toHaveAttribute("aria-expanded", "false");
  await expect(queue.locator('[data-slot="task-steps-connector"]')).toHaveAttribute("data-filled", "");
  await expect(message(page, "status")).toHaveText("Queue: Done, 2.0s. Install dependencies: Running");
  await expect(install.getByRole("log", { name: "Install dependencies" })).toContainText("pnpm install");

  // Every time cell is the same width and uses tabular mono figures, whatever it holds.
  const cells = await page.locator('.demo-frame [data-slot="task-steps-time"]').evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        numeric: style.fontVariantNumeric,
        mono: /mono/i.test(style.fontFamily),
      };
    }),
  );
  expect(new Set(cells.map((cell) => cell.width)).size).toBe(1);
  expect(cells.every((cell) => cell.numeric.includes("tabular-nums") && cell.mono)).toBe(true);

  // With time flowing again, the closed panel settles at zero.
  await page.clock.resume();
  await expect.poll(() => heightOf(panel(queue))).toBe(0);
});

test("a step's label, clock and icon change together on one spring", async ({ page }) => {
  await open(page);
  const queue = step(page, "Queue");
  const label = queue.locator('[data-slot="task-steps-label"]');
  const colour = () => label.evaluate((element) => getComputedStyle(element).color);
  const quiet = await colour();

  // The label and the clock mix their colour from numbers on the row, which Motion springs.
  const ink = await sample(
    surface(queue),
    () => button(page, "Run job").click(),
    'Number(element.style.getPropertyValue("--task-steps-ink"))',
    700,
  );
  expect(ink[0]).toBe(0);
  expect(ink.some((value) => value > 0.05 && value < 0.95)).toBe(true);
  // Critically damped: it rises to its target and never passes it.
  expect(Math.max(...ink)).toBeLessThanOrEqual(1);
  for (let i = 1; i < ink.length; i++) expect(ink[i]).toBeGreaterThanOrEqual(ink[i - 1]);
  expect(ink.at(-1)).toBeCloseTo(1, 2);
  expect(await colour()).not.toBe(quiet);
  await expect(surface(queue)).toHaveCSS("--task-steps-clock", "1");
  await expect(time(queue).locator("> span")).toHaveCSS("opacity", "1");

  // The running arc turns, driven by Motion rather than a CSS keyframe animation.
  await expect(spinner(queue)).toHaveCSS("animation-name", "none");
  const turning = await sample(spinner(queue), async () => {}, turn, 300);
  expect(new Set(turning.map((value) => value.toFixed(2))).size).toBeGreaterThan(3);
});

test("a row dims on pointer-down, before the click lands, and springs back on release", async ({ page }) => {
  await open(page);
  const queue = step(page, "Queue");
  const trigger = queue.getByRole("button", { name: "Queue" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await surface(queue).hover();
  expect(await opacityOf(surface(queue))).toBe(1);

  // Pressing is not eased in: the row is either at rest or fully dimmed, and nothing has toggled yet.
  const pressing = await sample(surface(queue), () => page.mouse.down(), opacity, 250);
  expect(pressing.every((value) => value === 1 || value === 0.7)).toBe(true);
  expect(pressing.at(-1)).toBe(0.7);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  const releasing = await sample(surface(queue), () => page.mouse.up(), opacity, 700);
  // It comes back on the spring from where it was held, without dipping again on the way.
  expect(Math.min(...releasing)).toBeGreaterThanOrEqual(0.7);
  expect(releasing.some((value) => value > 0.72 && value < 0.98)).toBe(true);
  for (let i = 1; i < releasing.length; i++) expect(releasing[i]).toBeGreaterThanOrEqual(releasing[i - 1]);
  await expect.poll(() => opacityOf(surface(queue))).toBe(1);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  // Dragging away before letting go cancels the press: the row recovers and the step stays as it was.
  await surface(queue).hover();
  await page.mouse.down();
  await expect.poll(() => opacityOf(surface(queue))).toBe(0.7);
  await page.mouse.move(4, 4);
  await page.mouse.up();
  await expect.poll(() => opacityOf(surface(queue))).toBe(1);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
});

// The height of a step's panel, or -1 while the step has none.
const panelHeight =
  "element.querySelector('[data-slot=\"task-steps-panel\"]')?.getBoundingClientRect().height ?? -1";

test("detail that arrives after its row opens from nothing", async ({ page }) => {
  // Stop the clock 200ms before Install dependencies prints its first line. Until then it has nothing to show.
  await open(page, { clock: true });
  await runJobFor(page, 2300);
  const install = step(page, "Install dependencies");
  await expect(install).toHaveAttribute("aria-current", "step");
  await expect(panel(install)).toHaveCount(0);
  await expect(install.getByRole("button")).toHaveCount(0);

  // The panel's height is a spring on the page clock, so letting time flow lets it run.
  const arriving = await sample(install, () => page.clock.resume(), panelHeight, 900);
  const present = arriving.filter((value) => value >= 0);
  expect(arriving[0]).toBe(-1);
  // One line of log makes a panel 48px tall. It starts well short of that rather than appearing whole.
  expect(present[0]).toBeLessThan(24);
  expect(Math.max(...present)).toBeGreaterThan(40);
  await expect(install.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  await expect(install.locator('[data-slot="task-steps-chevron"]')).toBeVisible();
});

test("detail that is taken away closes its panel before it goes", async ({ page }) => {
  await open(page);
  await button(page, "Run job").click();
  const install = step(page, "Install dependencies");
  // By the second log line the panel has had half a second to open on the first.
  await expect(install.getByRole("log")).toContainText("Lockfile is up to date", { timeout: 15_000 });

  // Reset clears the log, so the step is left with nothing to show.
  const leaving = await sample(install, () => button(page, "Reset").click(), panelHeight, 1200);
  const tallest = Math.max(...leaving);
  expect(tallest).toBeGreaterThan(40);
  expect(leaving.some((value) => value > 1 && value < tallest - 1)).toBe(true);
  expect(leaving.at(-1)).toBe(-1);
  await expect(panel(install)).toHaveCount(0);
  await expect(install.getByRole("button")).toHaveCount(0);
  await expect(install.locator('[data-slot="task-steps-chevron"]')).toHaveCount(0);
});

test("a jump across several steps retargets every part at once", async ({ page }) => {
  await open(page);
  await button(page, "Run job").click();
  // Wait for the second step's first log line, so it is running and has a panel to close.
  await expect(step(page, "Install dependencies").getByRole("log")).toContainText("pnpm install", {
    timeout: 15_000,
  });

  const fill = step(page, "Build").locator('[data-slot="task-steps-connector-fill"]');
  const scales = await sample(fill, () => button(page, "Finish all").click(), scaleY);
  expect(scales[0]).toBe(0);
  expect(scales.some((value) => value > 0.05 && value < 0.95)).toBe(true);
  await expect.poll(() => scaleOf(fill)).toBeCloseTo(1, 2);

  const rows = page.locator('.demo-frame [data-slot="task-steps-step"]');
  await expect(rows).toHaveCount(5);
  for (const row of await rows.all()) await expect(row).toHaveAttribute("data-status", "done");
  await expect(page.locator(".demo-frame [aria-current]")).toHaveCount(0);
  await expect(message(page, "status")).toHaveText(/Build: Done\. Run checks: Done\. Deploy: Done$/);
  // The step that was running closes, and nothing is left spinning.
  await expect(step(page, "Install dependencies").getByRole("button")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator('.demo-frame [data-slot="task-steps-spinner"]')).toHaveCount(0);
});

test("a failure is announced assertively, stays open, and skips the rest", async ({ page }) => {
  await open(page, { clock: true });
  await runJobFor(page, 2600);
  const install = step(page, "Install dependencies");
  await expect(install).toHaveAttribute("aria-current", "step");
  await button(page, "Fail this step").click();

  await expect(install).toHaveAttribute("data-status", "failed");
  await expect(message(page, "alert")).toHaveAttribute("role", "alert");
  await expect(message(page, "alert")).toHaveText("Install dependencies: Failed, 0.6s");
  await expect(message(page, "status")).toHaveText("Build: Skipped. Run checks: Skipped. Deploy: Skipped");
  // The state is written out, not only coloured.
  await expect(install.locator('[data-slot="task-steps-status"]')).toBeVisible();
  await expect(install.locator('[data-slot="task-steps-status"]')).toHaveText("Failed");
  await expect(install.getByRole("button", { name: "Install dependencies" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(install.getByRole("log")).toContainText("Error: exited with code 1");
  await expect(time(install)).toHaveText("0.6s");

  for (const label of ["Build", "Run checks", "Deploy"]) {
    await expect(step(page, label)).toHaveAttribute("data-status", "skipped");
    await expect(step(page, label).locator('[data-slot="task-steps-status"]')).toHaveText("Skipped");
    await expect(time(step(page, label))).toHaveText("");
  }
  // The job stopped here, so the line does not carry on through the skipped steps.
  for (const label of ["Install dependencies", "Build"]) {
    await expect(step(page, label).locator('[data-slot="task-steps-connector"]')).not.toHaveAttribute(
      "data-filled",
    );
  }
});

test("a finished step re-opens from the keyboard on a spring that can be reversed mid-way", async ({
  page,
}) => {
  await open(page);
  await button(page, "Run job").click();
  // A step becomes a disclosure once it has something to show, so wait for Install's first log line.
  await expect(step(page, "Install dependencies").getByRole("log")).toContainText("pnpm install", {
    timeout: 15_000,
  });
  await button(page, "Finish all").click();
  const queue = step(page, "Queue");
  const trigger = queue.getByRole("button", { name: "Queue" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => heightOf(panel(queue))).toBe(0);
  await expect(panel(queue).locator("> div")).toHaveAttribute("inert");

  await trigger.focus();
  const opening = await sample(panel(queue), () => page.keyboard.press("Enter"), height);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(panel(queue).locator("> div")).not.toHaveAttribute("inert");
  const full = await heightOf(panel(queue).locator("> div"));
  expect(full).toBeGreaterThan(20);
  expect(opening.some((value) => value > 1 && value < full - 1)).toBe(true);
  await expect.poll(() => heightOf(panel(queue))).toBeCloseTo(full, 0);

  // Close, then open again before the panel has finished closing: it turns round where it is.
  const reversed = await sample(
    panel(queue),
    async () => {
      await page.keyboard.press("Space");
      await page.waitForTimeout(90);
      await page.keyboard.press("Space");
    },
    height,
    700,
  );
  const lowest = Math.min(...reversed);
  expect(lowest).toBeGreaterThan(0);
  expect(lowest).toBeLessThan(full - 1);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => heightOf(panel(queue))).toBeCloseTo(full, 0);

  // Tab moves on to the next step's disclosure.
  await page.keyboard.press("Tab");
  const next = step(page, "Install dependencies").getByRole("button");
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(next).toHaveAttribute("aria-expanded", "true");
});

test("reduced motion stops the spinner and changes heights at once", async ({ page }) => {
  // The preference is read when the block mounts, so set it before loading the page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, { clock: true });
  await runJobFor(page, 1200);
  const queue = step(page, "Queue");
  // The arc is drawn but nothing turns it: no transform, and no animation of any kind on it.
  await expect(spinner(queue)).toHaveCount(1);
  await expect(spinner(queue)).toHaveCSS("transform", "none");
  expect(await spinner(queue).evaluate((element) => element.getAnimations().length)).toBe(0);
  // The clock still counts, so the step reads as running.
  await expect(time(queue)).toHaveText("1s");

  await button(page, "Finish all").click();
  await page.clock.resume();
  const trigger = queue.getByRole("button", { name: "Queue" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => heightOf(panel(queue))).toBe(0);
  const heights = await sample(panel(queue), () => trigger.click(), height, 400);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const full = await heightOf(panel(queue).locator("> div"));
  expect(full).toBeGreaterThan(20);
  expect(heights.at(-1)).toBeCloseTo(full, 0);
  expect(heights.every((value) => value === 0 || Math.abs(value - full) < 1)).toBe(true);
  // The connector only fades: it is never part-way down.
  expect(await scaleOf(queue.locator('[data-slot="task-steps-connector-fill"]'))).toBe(1);
});

test("fits a phone without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, { clock: true });
  await runJobFor(page, 3100);
  await expect(step(page, "Install dependencies").getByRole("log")).toContainText("Lockfile is up to date");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("registry serves task-steps source", async ({ request }) => {
  const response = await request.get("/r/task-steps.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.name).toBe("task-steps");
  expect(item.type).toBe("registry:block");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0]).toMatchObject({
    type: "registry:component",
    target: "components/blocks/task-steps.tsx",
    content: expect.stringContaining("export function TaskSteps"),
  });
});
