import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/text-banner");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("moves right, pauses in place, resumes, and reverses", async ({ page }) => {
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  const track = banner.locator(".a1ui-text-banner-track");
  await expect(track).toHaveCSS("animation-play-state", "running");
  await expect(banner).toMatchAriaSnapshot("- text: a1ui · Components");

  const movement = () =>
    track.evaluate(async (element) => {
      const animation = element.getAnimations()[0];
      await animation.ready;
      // Sample within a cycle so a correct wrap cannot invert the measured direction.
      animation.currentTime = 100;
      const start = element.getBoundingClientRect().x;
      await new Promise((resolve) => setTimeout(resolve, 200));
      return element.getBoundingClientRect().x - start;
    });

  expect(await movement()).toBeGreaterThan(5);
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(track).toHaveCSS("animation-play-state", "paused");
  const stopped = await track.evaluate(async (element) => {
    await element.getAnimations()[0].ready;
    const start = element.getBoundingClientRect().x;
    await new Promise((resolve) => setTimeout(resolve, 100));
    return element.getBoundingClientRect().x - start;
  });
  expect(stopped).toBe(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(track).toHaveCSS("animation-play-state", "running");
  await page.getByRole("button", { name: "Change direction to left", exact: true }).click();
  expect(await movement()).toBeLessThan(-5);
});

test("covers mobile and wide containers throughout the loop without a seam", async ({ page }) => {
  const banner = page.locator('.text-banner-demo [data-slot="text-banner"]');
  await page.getByRole("button", { name: "Pause", exact: true }).click();

  for (const width of [390, 1920, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(async () => {
      const coverage = await banner.evaluate((element) => {
        const track = element.querySelector<HTMLElement>(".a1ui-text-banner-track")!;
        const groups = track.children;
        const viewport = element.getBoundingClientRect();
        const animation = track.getAnimations()[0];
        const duration = Number(animation.effect!.getTiming().duration);
        return [0, 0.25, 0.5, 0.99999].map((progress) => {
          animation.currentTime = duration * progress;
          const first = groups[0].getBoundingClientRect();
          const second = groups[1].getBoundingClientRect();
          return {
            covers: first.left <= viewport.left + 1 && second.right >= viewport.right - 1,
            gap: Math.abs(second.left - first.right),
            equalWidth: Math.abs(first.width - second.width),
            fits: viewport.left >= 0 && viewport.right <= window.innerWidth,
          };
        });
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
  await expect(track).toHaveCSS("animation-name", "none");
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
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(track).toHaveCSS("animation-play-state", "running");
});
