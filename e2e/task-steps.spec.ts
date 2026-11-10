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
const heightOf = (target: Locator) => target.evaluate((element) => element.getBoundingClientRect().height);
const scaleOf = (target: Locator) =>
  target.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).d);

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
  await expect(queue.locator('[data-slot="task-steps-spinner"]')).toHaveCSS("animation-name", "none");
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
