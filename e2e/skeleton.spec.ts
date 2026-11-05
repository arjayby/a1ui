import { expect, test, type Locator, type Page } from "@playwright/test";

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

// Clicks the button, then reads the wrapper on every frame for `ms` milliseconds.
async function sampleReveal(wrapper: Locator, button: Locator, ms: number) {
  const handle = await button.elementHandle();
  return wrapper.evaluate(
    async (root: HTMLElement, { button, ms }) => {
      (button as HTMLElement).click();
      const values: { height: number; blur: number; placeholder: number | null }[] = [];
      const began = performance.now();
      while (performance.now() - began < ms) {
        await new Promise(requestAnimationFrame);
        const content = root.querySelector('[data-slot="skeleton-content"]');
        const placeholder = root.querySelector('[data-slot="skeleton-placeholder"]');
        const filter = content ? getComputedStyle(content).filter : "none";
        values.push({
          height: root.getBoundingClientRect().height,
          blur: filter === "none" ? 0 : Number.parseFloat(/blur\(([\d.e-]+)px\)/.exec(filter)?.[1] ?? "0"),
          placeholder: placeholder ? Number(getComputedStyle(placeholder).opacity) : null,
        });
      }
      return values;
    },
    { button: handle, ms },
  );
}

test("placeholders shimmer as one band, then the content blurs in and the height eases", async ({ page }) => {
  const frame = await openDemo(page);
  const wrapper = frame.locator('[data-slot="skeleton"]');
  await expect(wrapper).toHaveAttribute("aria-busy", "true");
  await expect(wrapper.locator(".sr-only")).toHaveText("Loading profile");

  // Avatar, two header bars, and three text lines all sit on the same band, and it moves.
  await expect(frame.locator('[data-slot="skeleton-shimmer"]')).toHaveCount(6);
  const first = await bandPhases(frame);
  expect(new Set(first).size).toBe(1);
  await page.waitForTimeout(250);
  const later = await bandPhases(frame);
  expect(new Set(later).size).toBe(1);
  expect(later[0]).not.toBe(first[0]);

  const loadingHeight = (await wrapper.boundingBox())!.height;
  const frames = await sampleReveal(wrapper, frame.getByRole("button", { name: "Finish loading" }), 900);
  await expect(wrapper).toHaveAttribute("data-state", "loaded");
  await expect(wrapper).not.toHaveAttribute("aria-busy");
  await expect(wrapper.locator('[data-slot="skeleton-placeholder"]')).toHaveCount(0);
  await expect(wrapper.getByText("Ada Lovelace")).toBeVisible();
  const contentHeight = (await wrapper.boundingBox())!.height;
  expect(contentHeight).toBeLessThan(loadingHeight - 4);

  // Mid-reveal the content is partly blurred while the placeholder is partly faded.
  expect(frames.some(({ blur }) => blur > 1 && blur < 7)).toBe(true);
  expect(
    frames.some(({ placeholder }) => placeholder !== null && placeholder > 0.1 && placeholder < 0.9),
  ).toBe(true);
  // The wrapper holds the taller placeholder height, then eases down without jumping.
  expect(frames[0]!.height).toBeCloseTo(loadingHeight, 0);
  expect(frames.some(({ height }) => height < loadingHeight - 1 && height > contentHeight + 1)).toBe(true);
  for (let index = 1; index < frames.length; index++) {
    expect(frames[index]!.height).toBeLessThanOrEqual(frames[index - 1]!.height + 0.5);
  }

  // Pulse fades every placeholder together.
  await page.getByRole("button", { name: /^Animation:/ }).click();
  await page.getByRole("menuitem", { name: "pulse", exact: true }).click();
  await frame.getByRole("button", { name: "Reload" }).click();
  await expect(frame.locator('[data-slot="skeleton-shimmer"]')).toHaveCount(0);
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

  const frames = await sampleReveal(wrapper, frame.getByRole("button", { name: "Finish loading" }), 250);
  // The first frame can land before React re-renders; after that the content is already sharp.
  const settled = frames.slice(frames.findIndex(({ placeholder }) => placeholder === null));
  expect(settled.length).toBeGreaterThan(frames.length - 3);
  expect(settled.every(({ blur, placeholder }) => blur === 0 && placeholder === null)).toBe(true);
  expect(new Set(settled.map(({ height }) => height)).size).toBe(1);
  await expect(wrapper.getByText("Ada Lovelace")).toBeVisible();
  await expect(wrapper).not.toHaveAttribute("aria-busy");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the skeleton", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/skeleton"]').click();
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
