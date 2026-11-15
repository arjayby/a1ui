import { type Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

const variants = [
  "ring",
  "dots",
  "bars",
  "grid",
  "swap",
  "ripple",
  "tiles",
  "infinity",
  "morph",
  "stack",
  "tumble",
  "line",
];

// Counts the distinct values `read(element)` takes on every frame for `ms` milliseconds.
function distinctFrames(target: Locator, read: string, ms = 300) {
  return target.evaluate(
    async (element: Element, { read, ms }) => {
      const reader = new Function("element", `return ${read}`) as (element: Element) => string;
      const seen = new Set<string>();
      const began = performance.now();
      while (performance.now() - began < ms) {
        seen.add(reader(element));
        await new Promise(requestAnimationFrame);
      }
      return seen.size;
    },
    { read, ms },
  );
}

test("every variant loops, and the size and cycle controls reach them", async ({ page }) => {
  await page.goto("/components/loader");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const loaders = frame.locator('[data-slot="loader"]');
  await expect(loaders).toHaveCount(variants.length);
  expect(await loaders.evaluateAll((all: HTMLElement[]) => all.map((one) => one.dataset.variant))).toEqual(
    variants,
  );
  await expect(frame.getByRole("status").first()).toHaveText("Loading, ring style");

  // The ring turns, a tile slides, and the dash travels its path.
  const ring = frame.locator('[data-variant="ring"] svg');
  await expect(ring).toHaveAttribute("width", "32");
  expect(await distinctFrames(ring, "getComputedStyle(element).transform")).toBeGreaterThan(5);
  const tile = frame.locator('[data-variant="tiles"] [data-slot="loader-glyph"] > span > span').first();
  expect(await distinctFrames(tile, "getComputedStyle(element).transform", 1300)).toBeGreaterThan(5);
  const dash = frame.locator('[data-variant="infinity"] path').last();
  expect(await distinctFrames(dash, 'element.getAttribute("stroke-dashoffset")')).toBeGreaterThan(5);

  // Staggered parts are out of step from the first frame.
  const offsets = await frame
    .locator('[data-variant="dots"] [data-slot="loader-glyph"] > span > span')
    .evaluateAll((dots: HTMLElement[]) => dots.map((dot) => getComputedStyle(dot).transform));
  expect(new Set(offsets).size).toBeGreaterThan(1);

  await page.getByRole("button", { name: /^Size:/ }).click();
  await page.getByRole("menuitem", { name: "48", exact: true }).click();
  await expect(ring).toHaveAttribute("width", "48");
  await expect(frame.locator('[data-variant="grid"] [data-slot="loader-glyph"] > span')).toHaveCSS(
    "width",
    "48px",
  );

  // A cycle of zero holds every loader on a still frame.
  const cycle = page.getByRole("slider", { name: "Cycle", exact: true });
  await cycle.focus();
  await page.keyboard.press("Home");
  await expect(cycle).toHaveAttribute("aria-valuetext", "0.0 seconds");
  await expect(frame.locator('[data-slot="loader"][data-motion="none"]')).toHaveCount(variants.length);
  expect(await distinctFrames(ring, "getComputedStyle(element).transform")).toBe(1);
});

test("reduced motion holds the shape still and breathes its opacity on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/loader");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  await expect(frame.locator('[data-slot="loader"][data-motion="reduced"]')).toHaveCount(variants.length);

  const line = frame.locator('[data-variant="line"]');
  const pill = line.locator('[data-slot="loader-glyph"] > span > span').last();
  expect(await distinctFrames(pill, "getComputedStyle(element).transform")).toBe(1);
  expect(
    await distinctFrames(
      line.locator('[data-slot="loader-glyph"]'),
      "getComputedStyle(element).opacity",
      500,
    ),
  ).toBeGreaterThan(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the loader", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-row-link[href="/components/loader"]').click();
  await expect(page.getByRole("heading", { name: "Loader", exact: true })).toBeVisible();
  const item = await (await request.get("/r/loader.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/loader.tsx");
  expect(item.files[0].content).toContain("export function Loader");
  const guide = await request.get("/docs/components/loader.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/loader");
  expect((await request.get("/r/progress.json")).status()).toBe(404);
});
