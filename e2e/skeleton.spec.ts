import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function openDemo(page: Page) {
  await page.goto("/components/skeleton");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  // Docs pages can shift late under load; wait until the demo stops moving.
  await expect
    .poll(async () => {
      const first = await frame.boundingBox();
      await page.waitForTimeout(100);
      const second = await frame.boundingBox();
      return first !== null && second !== null && first.y === second.y && first.height === second.height;
    })
    .toBe(true);
  return frame;
}

// Each band's position in page space, folded into one 1000px tile. Synced bands share one value.
function bandPhases(frame: Locator) {
  return frame.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>('[data-slot="skeleton-shimmer"]')].map((band) => {
      const shape = band.parentElement!.getBoundingClientRect();
      const offset = new DOMMatrix(getComputedStyle(band).transform).m41;
      return Math.round((((shape.left + scrollX + offset) % 1000) + 1000) % 1000);
    }),
  );
}

// Waits for the wrapper to enter `state`, then reads it on every frame for `ms` milliseconds.
function sampleSwap(wrapper: Locator, state: "loading" | "loaded", ms: number) {
  return wrapper.evaluate(
    async (root: HTMLElement, { state, ms }) => {
      const read = (slot: string) => {
        const element = root.querySelector(`[data-slot="skeleton-${slot}"]`);
        if (!element) return null;
        const { opacity, filter, transform } = getComputedStyle(element);
        return {
          opacity: Number(opacity),
          blur: filter === "none" ? 0 : Number.parseFloat(/blur\(([\d.e-]+)px\)/.exec(filter)?.[1] ?? "0"),
          scale: transform === "none" ? 1 : new DOMMatrix(transform).a,
        };
      };
      while (root.dataset.state !== state) await new Promise(requestAnimationFrame);
      const values = [
        {
          height: root.getBoundingClientRect().height,
          content: read("content"),
          placeholder: read("placeholder"),
        },
      ];
      const began = performance.now();
      while (performance.now() - began < ms) {
        await new Promise(requestAnimationFrame);
        values.push({
          height: root.getBoundingClientRect().height,
          content: read("content"),
          placeholder: read("placeholder"),
        });
      }
      return values;
    },
    { state, ms },
  );
}

test("placeholders shimmer as one band, then swap with the content on a loop", async ({ page }) => {
  const frame = await openDemo(page);
  const wrapper = frame.locator('[data-slot="skeleton"]');
  await expect(wrapper).toHaveAttribute("data-state", "loading");
  await expect(wrapper).toHaveAttribute("aria-busy", "true");
  await expect(wrapper.locator(".sr-only")).toHaveText("Loading");
  // The demo runs by itself; there is nothing to press.
  await expect(frame.locator(".component-demo-stage").getByRole("button")).toHaveCount(0);

  // All three lines sit on the same band, and it moves.
  await expect(frame.locator('[data-slot="skeleton-shimmer"]')).toHaveCount(3);
  const first = await bandPhases(frame);
  expect(new Set(first).size).toBe(1);
  await page.waitForTimeout(250);
  const later = await bandPhases(frame);
  expect(new Set(later).size).toBe(1);
  expect(later[0]).not.toBe(first[0]);

  const loadingHeight = (await wrapper.boundingBox())!.height;
  const reveal = await sampleSwap(wrapper, "loaded", 1200);
  await expect(wrapper).not.toHaveAttribute("aria-busy");
  await expect(wrapper.locator('[data-slot="skeleton-placeholder"]')).toHaveCount(0);
  await expect(wrapper.getByText(/^a1ui is a collection/)).toBeVisible();

  // Mid-swap the content is still soft and slightly small while the placeholder blurs away.
  expect(reveal.some(({ content }) => content && content.blur > 0.5 && content.blur < 3.5)).toBe(true);
  expect(reveal.some(({ content }) => content && content.scale > 0.99 && content.scale < 1)).toBe(true);
  expect(
    reveal.some(({ placeholder }) => placeholder && placeholder.opacity > 0.1 && placeholder.opacity < 0.9),
  ).toBe(true);
  expect(reveal.some(({ placeholder }) => placeholder && placeholder.blur > 0.3)).toBe(true);
  expect(reveal.at(-1)!.content).toEqual({ opacity: 1, blur: 0, scale: 1 });
  // The placeholder has a bar for each line of the paragraph, so the wrapper keeps its height.
  for (const { height } of reveal) expect(Math.abs(height - loadingHeight)).toBeLessThan(1);

  // With nothing pressed the demo reloads: the content stays up briefly, then swaps back.
  const reload = await sampleSwap(wrapper, "loading", 1200);
  expect(reload[0]!.content).toEqual({ opacity: 1, blur: 0, scale: 1 });
  expect(reload[0]!.placeholder).toBeNull();
  expect(reload.some(({ content }) => content && content.opacity > 0.1 && content.opacity < 0.9)).toBe(true);
  expect(
    reload.some(({ placeholder }) => placeholder && placeholder.opacity > 0.1 && placeholder.opacity < 0.9),
  ).toBe(true);
  expect(reload.at(-1)!.content).toBeNull();
  expect(reload.at(-1)!.placeholder).toEqual({ opacity: 1, blur: 0, scale: 1 });
  for (const { height } of reload) expect(Math.abs(height - loadingHeight)).toBeLessThan(1);

  // Pulse fades every placeholder together.
  await page.getByRole("button", { name: /^Animation:/ }).click();
  await page.getByRole("menuitem", { name: "pulse", exact: true }).click();
  await expect(frame.locator('[data-slot="skeleton-shimmer"]')).toHaveCount(0);
  await expect(wrapper).toHaveAttribute("data-state", "loading");
  const opacities = await frame.evaluate(async (root) => {
    const seen = new Set<string>();
    const began = performance.now();
    while (performance.now() - began < 400) {
      const values = [...root.querySelectorAll('[data-slot="skeleton-shape"]')].map(
        (shape) => getComputedStyle(shape).opacity,
      );
      if (new Set(values).size !== 1) return null;
      seen.add(values[0]!);
      await new Promise(requestAnimationFrame);
    }
    return seen.size;
  });
  expect(opacities).toBeGreaterThan(3);
});

test("on a narrow screen the taller content springs the height open, then closed on reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const frame = await openDemo(page);
  const wrapper = frame.locator('[data-slot="skeleton"]');
  await expect(wrapper).toHaveAttribute("data-state", "loading");
  const loadingHeight = (await wrapper.boundingBox())!.height;

  // The paragraph wraps onto more lines than the placeholder has, so the wrapper grows without jumping.
  const reveal = await sampleSwap(wrapper, "loaded", 1200);
  const contentHeight = reveal.at(-1)!.height;
  expect(contentHeight).toBeGreaterThan(loadingHeight + 4);
  expect(reveal[0]!.height).toBeCloseTo(loadingHeight, 0);
  expect(reveal.some(({ height }) => height > loadingHeight + 1 && height < contentHeight - 1)).toBe(true);
  for (let index = 1; index < reveal.length; index++) {
    expect(reveal[index]!.height).toBeGreaterThanOrEqual(reveal[index - 1]!.height - 0.5);
  }

  const reload = await sampleSwap(wrapper, "loading", 1200);
  expect(reload[0]!.height).toBeCloseTo(contentHeight, 0);
  expect(reload.at(-1)!.height).toBeCloseTo(loadingHeight, 0);
  expect(reload.some(({ height }) => height > loadingHeight + 1 && height < contentHeight - 1)).toBe(true);
  for (let index = 1; index < reload.length; index++) {
    expect(reload[index]!.height).toBeLessThanOrEqual(reload[index - 1]!.height + 0.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reduced motion on mobile drops the shimmer and swaps instantly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const frame = await openDemo(page);
  const wrapper = frame.locator('[data-slot="skeleton"]');
  await expect(wrapper).toHaveAttribute("aria-busy", "true");
  await expect(frame.locator('[data-slot="skeleton-shape"]').first()).toHaveAttribute(
    "data-animation",
    "none",
  );
  await expect(frame.locator('[data-slot="skeleton-shimmer"]')).toHaveCount(0);

  const frames = await sampleSwap(wrapper, "loaded", 250);
  // The content is sharp and the placeholder gone from the first frame of the swap.
  expect(
    frames.every(
      ({ content, placeholder }) =>
        placeholder === null && content?.opacity === 1 && content.blur === 0 && content.scale === 1,
    ),
  ).toBe(true);
  expect(new Set(frames.map(({ height }) => height)).size).toBe(1);
  await expect(wrapper.getByText(/^a1ui is a collection/)).toBeVisible();
  await expect(wrapper).not.toHaveAttribute("aria-busy");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the skeleton", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-row-link[href="/components/skeleton"]').click();
  await expect(page.getByRole("heading", { name: "Skeleton", exact: true })).toBeVisible();
  const item = await (await request.get("/r/skeleton.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/skeleton.tsx");
  expect(item.files[0].content).toContain("export function Skeleton");
  expect(item.files[0].content).toContain("export function SkeletonText");
  const guide = await request.get("/docs/components/skeleton.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/skeleton");
});
