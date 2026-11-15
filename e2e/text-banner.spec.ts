import type { Locator } from "@playwright/test";

import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/text-banner");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

/**
 * How far the text moves over `milliseconds`, in pixels, positive to the right. Every unit of the
 * loop is identical, so the distance is taken the short way round and a wrap cannot invert it.
 */
const travel = (banner: Locator, milliseconds: number) =>
  banner.evaluate(async (element, wait) => {
    const track = element.querySelector(".a1ui-text-banner-track")!;
    const unit = element.querySelector(".a1ui-text-banner-unit")!.getBoundingClientRect().width;
    const start = track.getBoundingClientRect().x;
    await new Promise((resolve) => setTimeout(resolve, wait));
    const distance = track.getBoundingClientRect().x - start;
    return distance - Math.round(distance / unit) * unit;
  }, milliseconds);

test("moves right, eases to a stop in place, resumes, and reverses", async ({ page }) => {
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  await expect(banner).toHaveAttribute("data-motion", "running");
  await expect(banner).toMatchAriaSnapshot("- text: a1ui · Components");

  await expect.poll(() => travel(banner, 200)).toBeGreaterThan(5);
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(banner).toHaveAttribute("data-motion", "paused");
  // The banner coasts for a moment, then holds exactly where it stopped.
  await expect.poll(() => travel(banner, 100)).toBe(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(banner).toHaveAttribute("data-motion", "running");
  await expect.poll(() => travel(banner, 200)).toBeGreaterThan(5);
  await page.getByRole("button", { name: "Change direction to left", exact: true }).click();
  await expect.poll(() => travel(banner, 200)).toBeLessThan(-5);
});

test("animates only the track's transform, through Motion", async ({ page }) => {
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  await expect(banner).toHaveAttribute("data-motion", "running");
  await expect.poll(() => travel(banner, 200)).toBeGreaterThan(5);
  const engine = await banner.evaluate((element) => ({
    // CSS and Web Animations would show up here. Motion writes the transform itself.
    animations: element.getAnimations({ subtree: true }).length,
    transform: element.querySelector<HTMLElement>(".a1ui-text-banner-track")!.style.transform,
  }));
  expect(engine.animations).toBe(0);
  expect(engine.transform).toMatch(/^translateX\(-?[\d.e-]+%\)$/);
});

test("covers mobile and wide containers throughout the loop without a seam", async ({ page }) => {
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => travel(banner, 100)).toBe(0);

  for (const width of [390, 1920, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(async () => {
      const coverage = await banner.evaluate((element) => {
        const track = element.querySelector<HTMLElement>(".a1ui-text-banner-track")!;
        const groups = track.children;
        const viewport = element.getBoundingClientRect();
        const resting = track.style.transform;
        // The loop slides the track by up to one unit, a share of the track's own width.
        const unitShare = 50 / groups[0].childElementCount;
        const samples = [0, 0.25, 0.5, 0.99999].map((phase) => {
          track.style.transform = `translateX(${(phase - 1) * unitShare}%)`;
          const first = groups[0].getBoundingClientRect();
          const second = groups[1].getBoundingClientRect();
          return {
            covers: first.left <= viewport.left + 1 && second.right >= viewport.right - 1,
            gap: Math.abs(second.left - first.right),
            equalWidth: Math.abs(first.width - second.width),
            fits: viewport.left >= 0 && viewport.right <= window.innerWidth,
          };
        });
        track.style.transform = resting;
        return samples;
      });
      for (const sample of coverage) {
        expect(sample.covers).toBe(true);
        expect(sample.gap).toBeLessThan(0.1);
        expect(sample.equalWidth).toBeLessThan(0.1);
        expect(sample.fits).toBe(true);
      }
    }).toPass();
  }
});

test("reduced motion shows each phrase once and restarts when the preference changes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  const track = banner.locator(".a1ui-text-banner-track");
  await expect(banner).toHaveAttribute("data-motion", "reduced");
  await expect(track).toHaveCSS("transform", "none");
  await expect(banner.locator(".a1ui-text-banner-unit:visible")).toHaveCount(1);
  await expect(banner).toMatchAriaSnapshot("- text: a1ui · Components");
  const fits = await banner.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll(".a1ui-text-banner-item"))
      .filter((item) => item.getClientRects().length)
      .every((item) => {
        const rect = item.getBoundingClientRect();
        return rect.left >= bounds.left && rect.right <= bounds.right + 1;
      });
  });
  expect(fits).toBe(true);
  expect(await travel(banner, 200)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(banner).toHaveAttribute("data-motion", "running");
  await expect.poll(() => travel(banner, 200)).toBeGreaterThan(5);
});

test("reduced motion is laid out before the page hydrates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  // The static layout comes from the stylesheet, so it never shows a sliding or shifted frame.
  await expect(banner.locator(".a1ui-text-banner-track")).toHaveCSS("transform", "none");
  await expect(banner.locator(".a1ui-text-banner-unit:visible")).toHaveCount(1);
  await expect(banner).toHaveAttribute("data-motion", "reduced");
});

test("changing direction reverses from the current position without a jump", async ({ page }) => {
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  await expect(banner).toHaveAttribute("data-motion", "running");
  await expect.poll(() => travel(banner, 200)).toBeGreaterThan(5);

  // Record how far the text moves in every frame across the reversal.
  await banner.evaluate((element) => {
    const track = element.querySelector(".a1ui-text-banner-track")!;
    const unit = element.querySelector(".a1ui-text-banner-unit")!.getBoundingClientRect().width;
    const steps: number[] = [];
    let last = track.getBoundingClientRect().x;
    const sample = () => {
      const x = track.getBoundingClientRect().x;
      const distance = x - last;
      steps.push(distance - Math.round(distance / unit) * unit);
      last = x;
      if (steps.length < 90) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    (window as unknown as { bannerSteps: number[] }).bannerSteps = steps;
  });
  await page.getByRole("button", { name: "Change direction to left", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { bannerSteps: number[] }).bannerSteps.length))
    .toBe(90);
  const steps = await page.evaluate(() => (window as unknown as { bannerSteps: number[] }).bannerSteps);

  // At 80 pixels a second a frame moves the text a pixel or two. A jump would be far larger,
  // and a hard cut would flip the step from one frame to the next.
  expect(Math.max(...steps.map(Math.abs))).toBeLessThan(8);
  expect(steps.some((step) => step > 0)).toBe(true);
  expect(steps.at(-1)).toBeLessThan(0);
});
