import { test as base, expect, type Page } from "@playwright/test";

/*
 * The site scrolls smoothly (`html { scroll-behavior: smooth }`). Playwright retries an action
 * while its target is still moving (for example during the page reveal) and re-scrolls it into
 * view with a different alignment on each retry. With smooth scrolling every one of those scrolls
 * becomes a glide, so the target keeps moving, the pointer lands on whatever slides under it, and
 * a control can end up beneath the sticky header. Tests therefore scroll the root instantly.
 * A test that checks smooth scrolling itself opts back in with `test.use({ smoothScroll: true })`.
 */
export const test = base.extend<{ smoothScroll: boolean }>({
  smoothScroll: [false, { option: true }],
  page: async ({ page, smoothScroll }, provide) => {
    if (!smoothScroll) {
      await page.addInitScript(() => {
        const apply = () => {
          const style = document.createElement("style");
          style.dataset.e2e = "instant-scroll";
          style.textContent = "html { scroll-behavior: auto !important; }";
          document.head.append(style);
        };
        if (document.head) apply();
        else document.addEventListener("DOMContentLoaded", apply, { once: true });
      });
    }
    await provide(page);
  },
});

export { expect };

/** Resolves once the docs page reveal has finished, so geometry measured afterwards is final. */
export async function revealed(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          !(animation instanceof CSSAnimation && animation.animationName.startsWith("docs-page-")) ||
          animation.playState === "finished",
      ),
  );
}

/** Resolves once the page has stopped scrolling, including Chromium's own wheel animation. */
export async function scrollSettled(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const before = scrollY;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return scrollY === before;
      }),
    )
    .toBe(true);
}
