import { type Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

// Clicks inside the page, then reads `read(element)` on every frame for `ms` milliseconds.
async function sample(target: Locator, click: Locator, read: string, ms = 350) {
  const handle = await click.elementHandle();
  return target.evaluate(
    async (element: Element, { button, read, ms }) => {
      const reader = new Function("element", `return ${read}`) as (element: Element) => string;
      (button as HTMLElement).click();
      const values: string[] = [];
      const began = performance.now();
      while (performance.now() - began < ms) {
        values.push(reader(element));
        await new Promise(requestAnimationFrame);
      }
      return values;
    },
    { button: handle, read, ms },
  );
}

const percentOf = (transform: string) => Number.parseFloat(/-?[\d.]+/.exec(transform)?.[0] ?? "NaN");

test("the fill springs to each value while the percentage rolls", async ({ page }) => {
  await page.goto("/components/progress");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const bar = frame.getByRole("progressbar", { name: "Uploading assets" });
  const add = frame.getByRole("button", { name: "Add 20%" });
  await expect(bar).toHaveAttribute("aria-valuenow", "35");
  await expect(bar).toHaveAttribute("aria-valuetext", "35%");

  const fill = bar.locator('[data-slot="progress-fill"]');
  const xs = (await sample(fill, add, "element.style.transform")).map(percentOf);
  expect(xs.some((x) => x > -64 && x < -46)).toBe(true);
  await expect(bar).toHaveAttribute("aria-valuenow", "55");
  await expect(bar.locator('[data-slot="progress-value"]')).toHaveAttribute("data-value", "55%");
  await expect
    .poll(async () => percentOf(await fill.evaluate((element: HTMLElement) => element.style.transform)))
    .toBeCloseTo(-45, 0);
  await expect(bar.locator('[data-slot="progress-shimmer"]')).toHaveCount(1);

  // The tens column rolls from 5 to 7 through fractional offsets.
  const tens = bar.locator('[data-slot="progress-digit"] > span').first();
  const rolled = (await sample(tens, add, "getComputedStyle(element).transform")).map((matrix) =>
    Number.parseFloat(matrix.split(",")[5] ?? "0"),
  );
  const lineHeight = await tens.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(rolled.some((y) => y < -5.1 * lineHeight && y > -6.9 * lineHeight)).toBe(true);
  await expect(bar).toHaveAttribute("aria-valuetext", "75%");

  // Steps fill one after another from the same spring.
  await page.getByRole("button", { name: /^Variant:/ }).click();
  await page.getByRole("menuitem", { name: "steps", exact: true }).click();
  const steps = frame.getByRole("progressbar", { name: "Workspace setup" });
  const segments = steps.locator('[data-slot="progress-segment"] [data-slot="progress-fill"]');
  await expect(segments).toHaveCount(5);
  await add.click();
  await add.click();
  await expect(steps).toHaveAttribute("data-complete");
  await expect
    .poll(() => segments.evaluateAll((all: HTMLElement[]) => all.map((one) => one.style.transform)))
    .toEqual(["none", "none", "none", "none", "none"]);
  await expect(steps.locator('[data-slot="progress-shimmer"]')).toHaveCount(0);

  // The ring draws its stroke with pathLength.
  await frame.getByRole("button", { name: "Reset" }).click();
  await page.getByRole("button", { name: /^Variant:/ }).click();
  await page.getByRole("menuitem", { name: "ring", exact: true }).click();
  const ring = frame.getByRole("progressbar", { name: "Uploading assets" });
  const stroke = ring.locator('circle[data-slot="progress-fill"]');
  const dashes = (await sample(stroke, add, 'element.getAttribute("stroke-dasharray") ?? "0"')).map(
    Number.parseFloat,
  );
  expect(dashes.some((dash) => dash > 0.02 && dash < 0.18)).toBe(true);
  await expect(ring).toHaveAttribute("aria-valuenow", "20");
});

test("indeterminate sweep loops, and stops on mobile with reduced motion", async ({ page }) => {
  await page.goto("/components/progress");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Mode:/ }).click();
  await page.getByRole("menuitem", { name: "indeterminate", exact: true }).click();
  const frame = page.locator(".demo-frame");
  const bar = frame.getByRole("progressbar", { name: "Uploading assets" });
  await expect(bar).toHaveAttribute("data-indeterminate");
  await expect(bar).toHaveAttribute("aria-valuetext", "indeterminate progress");
  await expect(bar.locator('[data-slot="progress-value"]')).toHaveCount(0);
  const sweep = bar.locator('[data-slot="progress-sweep"]');
  const moving = await sweep.evaluate(async (element: HTMLElement) => {
    const seen = new Set<string>();
    const began = performance.now();
    while (performance.now() - began < 300) {
      seen.add(getComputedStyle(element).transform);
      await new Promise(requestAnimationFrame);
    }
    return seen.size;
  });
  expect(moving).toBeGreaterThan(5);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Mode:/ }).click();
  await page.getByRole("menuitem", { name: "indeterminate", exact: true }).click();
  const still = await sweep.evaluate(async (element: HTMLElement) => {
    const seen = new Set<string>();
    const began = performance.now();
    while (performance.now() - began < 300) {
      seen.add(getComputedStyle(element).transform);
      await new Promise(requestAnimationFrame);
    }
    return seen.size;
  });
  expect(still).toBe(1);

  await page.getByRole("button", { name: /^Mode:/ }).click();
  await page.getByRole("menuitem", { name: "determinate", exact: true }).click();
  const fill = bar.locator('[data-slot="progress-fill"]');
  const jumped = (
    await sample(fill, frame.getByRole("button", { name: "Add 20%" }), "element.style.transform", 150)
  ).map(percentOf);
  // The first frame can land before React re-renders; after that the fill is already at 55%.
  expect(jumped.at(-1)).toBe(-45);
  expect(jumped.every((x) => x === -65 || x === -45)).toBe(true);
  await expect(bar.locator('[data-slot="progress-shimmer"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the progress", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/progress"]').click();
  await expect(page.getByRole("heading", { name: "Progress", exact: true })).toBeVisible();
  const item = await (await request.get("/r/progress.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/progress.tsx");
  expect(item.files[0].content).toContain("export function Progress");
  const guide = await request.get("/docs/components/progress.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/progress");
});
