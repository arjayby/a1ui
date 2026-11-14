import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const stage = (page: Page) => page.getByRole("region", { name: "Activity Pill demo" });
/** The pill is portaled to the body, outside the demo, and fixed to the window. */
const rootOf = (page: Page) => page.locator('body > [data-slot="activity-pill-root"]');
const pillOf = (page: Page) => rootOf(page).locator('[data-slot="activity-pill"]');

/** Resolves once the shell has stopped changing size. */
async function settled(pill: Locator) {
  await expect
    .poll(() =>
      pill.evaluate(async (element) => {
        const before = element.getBoundingClientRect();
        await new Promise((resolve) => setTimeout(resolve, 120));
        const after = element.getBoundingClientRect();
        return before.width === after.width && before.height === after.height && before.top === after.top;
      }),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/activity-pill");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await stage(page).scrollIntoViewIfNeeded();
});

test("a deploy enters from the top edge, announces itself, succeeds, and leaves the way it came", async ({
  page,
}) => {
  const demo = stage(page);
  const pill = pillOf(page);
  const root = rootOf(page);
  await expect(pill).toHaveCount(0);

  // Sampled inside the page so a slow runner cannot miss the entrance.
  const entrance = await demo.evaluate(async (element) => {
    [...element.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Deploy")!
      .click();
    const tops: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 900) {
      await new Promise(requestAnimationFrame);
      const shell = document.querySelector('[data-slot="activity-pill"]');
      if (shell) tops.push(shell.getBoundingClientRect().top);
    }
    return tops;
  });
  const rest = entrance.at(-1)!;
  expect(rest).toBeCloseTo(16, 0);
  // It starts above its resting place and settles without overshooting.
  expect(entrance[0]).toBeLessThan(rest - 20);
  expect(Math.max(...entrance)).toBeLessThanOrEqual(rest + 0.5);

  await expect(pill).toHaveAttribute("data-status", "running");
  await expect(root.getByRole("status")).toHaveText("Deploying");
  await expect(root.getByRole("progressbar", { name: "Deploying" })).not.toHaveAttribute("aria-valuenow");
  const box = await pill.boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
  // It lives at the root of the page, not inside the demo.
  await expect(demo.locator('[data-slot="activity-pill-root"]')).toHaveCount(0);
  expect(box!.height).toBeGreaterThanOrEqual(40);

  await expect(pill).toHaveAttribute("data-status", "success", { timeout: 10_000 });
  await expect(root.getByRole("status")).toHaveText("Deployed");
  await expect(root.getByRole("progressbar")).toHaveCount(0);

  // Success lingers, then goes back out through the top edge.
  const exit = await page.evaluate(async () => {
    const tops: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 6000) {
      await new Promise(requestAnimationFrame);
      const shell = document.querySelector('[data-slot="activity-pill"]');
      if (!shell) break;
      if (shell.hasAttribute("inert")) {
        tops.push(shell.getBoundingClientRect().top);
      }
    }
    return tops;
  });
  await expect(pill).toHaveCount(0);
  expect(exit.length).toBeGreaterThan(0);
  expect(Math.min(...exit)).toBeLessThan(rest - 10);
  expect(Math.max(...exit)).toBeLessThanOrEqual(rest + 0.5);
  await expect(root.getByRole("status")).toHaveText("");
});

test("progress keeps the label still and its figures tabular while the value counts up", async ({ page }) => {
  const demo = stage(page);
  const pill = pillOf(page);
  const root = rootOf(page);

  const samples = await demo.evaluate(async (element) => {
    [...element.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Upload")!
      .click();
    const seen = new Map<number, { width: number; title: number; numeric: string }>();
    const began = performance.now();
    let stillSince = 0;
    let lastWidth = -1;
    while (performance.now() - began < 9000) {
      await new Promise(requestAnimationFrame);
      const shell = document.querySelector<HTMLElement>('[data-slot="activity-pill"]');
      if (!shell || shell.dataset.status !== "progress") {
        if (seen.size > 0) break;
        continue;
      }
      // Only measure once the running-to-progress morph has come to rest.
      const width = shell.getBoundingClientRect().width;
      if (width !== lastWidth) {
        lastWidth = width;
        stillSince = performance.now();
        continue;
      }
      if (performance.now() - stillSince < 200) continue;
      const bar = shell.querySelector('[role="progressbar"]')!;
      const value = shell.querySelector('[data-slot="activity-pill-value"]')!;
      const title = shell.querySelector('[data-slot="activity-pill-title"]')!;
      seen.set(Number(bar.getAttribute("aria-valuenow")), {
        width,
        title: title.getBoundingClientRect().left,
        numeric: getComputedStyle(value).fontVariantNumeric,
      });
    }
    return [...seen.entries()];
  });

  const values = samples.map(([value]) => value);
  expect(Math.min(...values)).toBeLessThan(10);
  expect(Math.max(...values)).toBe(100);
  const [, first] = samples[0];
  for (const [, sample] of samples) {
    expect(sample.width).toBe(first.width);
    expect(sample.title).toBe(first.title);
    expect(sample.numeric).toContain("tabular-nums");
  }

  await expect(pill).toHaveAttribute("data-status", "success", { timeout: 10_000 });
  await expect(root.getByRole("status")).toHaveText("Uploaded");
});

test("an error stays, expands with Enter, collapses on Escape and outside press, and retries", async ({
  page,
}) => {
  const demo = stage(page);
  const pill = pillOf(page);
  const root = rootOf(page);
  const toggle = pill.locator('[data-slot="activity-pill-toggle"]');

  await demo.getByRole("button", { name: "Export" }).click();
  await expect(pill).toHaveAttribute("data-status", "progress");
  await expect(root.getByRole("progressbar", { name: "Exporting" })).toHaveAttribute("aria-valuenow", /\d+/);
  await expect(pill).toHaveAttribute("data-status", "error", { timeout: 15_000 });
  await expect(root.getByRole("alert")).toHaveText(/^Export failed\. The connection dropped/);
  await expect(root.getByRole("status")).toHaveText("");
  await expect(root.getByRole("progressbar")).toHaveCount(0);
  await settled(pill);
  const compact = (await pill.boundingBox())!;

  // Errors do not time out.
  await page.waitForTimeout(3200);
  await expect(pill).toHaveAttribute("data-status", "error");
  await expect(pill).not.toHaveAttribute("inert");

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(pill).toHaveAttribute("data-state", "expanded");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const panel = root.getByRole("group", { name: "Activity details" });
  await expect(panel).toContainText("The connection dropped at row 5,120.");
  await settled(pill);
  const expanded = (await pill.boundingBox())!;
  expect(expanded.width).toBeGreaterThan(compact.width + 40);
  expect(expanded.height).toBeGreaterThan(compact.height + 40);
  // It grows away from the edge it is anchored to, around the same centre.
  expect(expanded.y).toBeCloseTo(compact.y, 0);
  expect(expanded.x + expanded.width / 2).toBeCloseTo(compact.x + compact.width / 2, 0);

  // The actions are real buttons, reached in order with Tab.
  for (const name of ["Dismiss", "View", "Retry"]) {
    await page.keyboard.press("Tab");
    await expect(panel.getByRole("button", { name })).toBeFocused();
  }
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(pill).toHaveAttribute("data-state", "expanded");

  await page.keyboard.press("Escape");
  await expect(pill).toHaveAttribute("data-state", "compact");
  await expect(toggle).toBeFocused();
  await settled(pill);
  expect((await pill.boundingBox())!.width).toBe(compact.width);

  await pill.click();
  await expect(pill).toHaveAttribute("data-state", "expanded");
  await demo.click({ position: { x: 12, y: 200 } });
  await expect(pill).toHaveAttribute("data-state", "compact");

  await pill.click();
  await panel.getByRole("button", { name: "Retry" }).click();
  await expect(pill).toHaveAttribute("data-status", "progress");
  await expect(pill).toHaveAttribute("data-state", "expanded");
  await expect(panel.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(pill).toHaveAttribute("data-status", "success", { timeout: 15_000 });
  await expect(root.getByRole("status")).toHaveText("Exported");
  await page.mouse.move(0, 0);
  await expect(pill).toHaveCount(0, { timeout: 10_000 });
});

test("a collapse that lands mid-morph turns the shell around from its live size", async ({ page }) => {
  const demo = stage(page);
  const pill = pillOf(page);
  await demo.getByRole("button", { name: "Deploy" }).click();
  await expect(pill).toHaveAttribute("data-status", "running");
  await settled(pill);

  const morph = await pill.evaluate(async (shell) => {
    const toggle = shell.querySelector<HTMLButtonElement>('[data-slot="activity-pill-toggle"]')!;
    const compact = shell.getBoundingClientRect().width;
    const frames: { at: number; width: number }[] = [];
    let turned = -1;
    toggle.click();
    const began = performance.now();
    while (performance.now() - began < 1500) {
      const at = await new Promise<number>(requestAnimationFrame);
      const width = shell.getBoundingClientRect().width;
      frames.push({ at, width });
      // Reverse once it is clearly on its way, well before it arrives.
      if (turned < 0 && width > compact + 30) {
        turned = frames.length - 1;
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      }
    }
    return { compact, frames, turned };
  });

  const { compact, frames, turned } = morph;
  expect(turned).toBeGreaterThan(0);
  const widths = frames.map(({ width }) => width);
  const afterTurn = widths.slice(turned + 1);
  // It turned around long before it reached the expanded width (288px plus the border).
  expect(widths[turned]).toBeLessThan(240);
  expect(Math.max(...widths)).toBeLessThan(270);
  // The spring kept its speed through the turn: the shell coasts a little further out before it
  // heads back. A restarted animation would begin shrinking at once.
  expect(Math.max(...afterTurn)).toBeGreaterThan(widths[turned] + 2);
  // A restart or a snap would also show as a jump. The spring stays under 2px per millisecond.
  const speeds = frames
    .slice(1)
    .map(
      ({ at, width }, index) => Math.abs(width - frames[index].width) / Math.max(8, at - frames[index].at),
    );
  expect(Math.max(...speeds)).toBeLessThan(3);
  expect(widths.at(-1)).toBe(compact);
  // Critically damped: it comes back to rest without dipping under the compact width.
  expect(Math.min(...afterTurn)).toBeGreaterThanOrEqual(compact - 0.5);
  await expect(pill).toHaveAttribute("data-state", "compact");
});

test("the pill is anchored to the chosen edge and grows away from it", async ({ page }) => {
  const demo = stage(page);
  const pill = pillOf(page);
  const root = rootOf(page);
  await page.getByRole("button", { name: /^Position:/ }).click();
  // Bottom-left, clear of the Next.js dev indicator in the bottom-right corner.
  await page.getByRole("menuitem", { name: "bottom-left" }).click();

  // Distances from the window's left and bottom edges.
  const inset = async () => {
    const viewport = page.viewportSize()!;
    const box = (await pill.boundingBox())!;
    return {
      left: box.x,
      bottom: viewport.height - (box.y + box.height),
      height: box.height,
      width: box.width,
    };
  };

  await demo.getByRole("button", { name: "Deploy" }).click();
  await expect(pill).toHaveAttribute("data-status", "running");
  await settled(pill);
  const compact = await inset();
  expect(compact.left).toBeCloseTo(16, 0);
  expect(compact.bottom).toBeCloseTo(16, 0);

  await pill.click();
  await expect(pill).toHaveAttribute("data-state", "expanded");
  await settled(pill);
  const expanded = await inset();
  expect(expanded.left).toBeCloseTo(16, 0);
  expect(expanded.bottom).toBeCloseTo(16, 0);
  expect(expanded.height).toBeGreaterThan(compact.height + 40);
  expect(expanded.width).toBeGreaterThan(compact.width + 40);

  await root.getByRole("group", { name: "Activity details" }).getByRole("button", { name: "Cancel" }).click();
  await expect(pill).toHaveCount(0, { timeout: 10_000 });
});

test("reduced motion changes size at once, cross-fades the content, and does not travel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const demo = stage(page);
  const pill = pillOf(page);

  const tops = await demo.evaluate(async (element) => {
    [...element.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Deploy")!
      .click();
    const seen: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 500) {
      await new Promise(requestAnimationFrame);
      const shell = document.querySelector('[data-slot="activity-pill"]');
      if (shell) seen.push(shell.getBoundingClientRect().top);
    }
    return seen;
  });
  expect(tops.length).toBeGreaterThan(0);
  expect(new Set(tops.map((top) => Math.round(top)))).toEqual(new Set([16]));
  await expect(pill).toHaveCSS("opacity", "1");

  const change = await pill.evaluate(async (shell) => {
    const compact = shell.getBoundingClientRect().width;
    shell.querySelector<HTMLButtonElement>('[data-slot="activity-pill-toggle"]')!.click();
    const widths: number[] = [];
    const filters = new Set<string>();
    let layers = 0;
    const began = performance.now();
    while (performance.now() - began < 500) {
      await new Promise(requestAnimationFrame);
      widths.push(shell.getBoundingClientRect().width);
      const present = shell.querySelectorAll('[data-slot="activity-pill-layer"]');
      layers = Math.max(layers, present.length);
      present.forEach((layer) => filters.add(getComputedStyle(layer).filter));
    }
    return { compact, widths, filters: [...filters], layers };
  });
  // One size, then the other: no frames in between.
  expect(new Set(change.widths).size).toBe(1);
  expect(change.widths[0]).toBeGreaterThan(change.compact + 40);
  // The outgoing and incoming content overlap as they fade, with no blur.
  expect(change.layers).toBe(2);
  expect(change.filters).toEqual(["none"]);
  await expect(pill.locator('[data-slot="activity-pill-layer"]')).toHaveCount(1);
});

test("the surface is translucent, and solid when transparency is reduced", async ({ page }) => {
  const demo = stage(page);
  const pill = pillOf(page);
  const alphaOf = () =>
    pill.evaluate((element) => {
      const color = getComputedStyle(element).backgroundColor;
      const alpha = /\/\s*([\d.]+)\)$/.exec(color) ?? /rgba\([^)]*,\s*([\d.]+)\)$/.exec(color);
      return alpha ? Number(alpha[1]) : 1;
    });

  await demo.getByRole("button", { name: "Export" }).click();
  await expect(pill).toHaveAttribute("data-status", "progress");
  expect(await alphaOf()).toBeLessThan(1);
  await expect(pill).not.toHaveCSS("backdrop-filter", "none");

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  await expect.poll(alphaOf).toBe(1);
  await expect(pill).toHaveCSS("backdrop-filter", "none");
});

test("registry serves the activity pill source", async ({ request }) => {
  const response = await request.get("/r/activity-pill.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.name).toBe("activity-pill");
  expect(item.type).toBe("registry:block");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0]).toMatchObject({
    path: "src/registry/blocks/activity-pill.tsx",
    target: "components/blocks/activity-pill.tsx",
  });
  expect(item.files[0].content).toContain("export function ActivityPill");
  expect(item.files[0].content).toContain("export function useActivity");
});
