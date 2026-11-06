import { expect, test, type Locator, type Page } from "@playwright/test";

async function settle(locator: Locator) {
  // Docs pages can shift late under load, so wait for the target to stop moving.
  let previous = "";
  await expect
    .poll(async () => {
      const box = JSON.stringify(await locator.boundingBox());
      const still = box === previous;
      previous = box;
      return still;
    })
    .toBe(true);
}

async function open(page: Page) {
  await page.goto("/components/pagination");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const nav = page.locator(".demo-frame").getByRole("navigation", { name: "Search results" });
  await settle(nav);
  return nav;
}

const visible = (nav: Locator) =>
  nav.evaluate((element) =>
    [...element.querySelectorAll('[data-slot="pagination-list"] > li')]
      .filter((item) => getComputedStyle(item).position !== "absolute")
      .map((item) => item.textContent?.replace(/Previous|Next/g, "").trim())
      .filter(Boolean),
  );

test("the active surface slides between pages and the window reflows", async ({ page }) => {
  const nav = await open(page);
  await expect(nav.getByRole("button", { name: "Page 1", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByRole("button", { name: "Previous page" })).toBeDisabled();
  expect(await visible(nav)).toEqual(["1", "2", "3", "4", "5", "…", "10"]);

  // The surface travels from page 1 to page 3 through the numbers in between.
  const slide = await nav.evaluate(async (element) => {
    const button = (name: string) => element.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;
    const left = () => element.querySelector('[data-slot="pagination-active"]')!.getBoundingClientRect().left;
    const start = left();
    const target = button("Page 3").getBoundingClientRect().left;
    button("Page 3").click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 250) {
      samples.push(left());
      await new Promise(requestAnimationFrame);
    }
    return { start, target, samples };
  });
  expect(slide.samples.some((x) => x > slide.start + 4 && x < slide.target - 4)).toBe(true);
  await expect(nav.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('[data-slot="pagination-active"]')).toHaveCount(1);

  // Moving to page 5 shifts the window: 4 slides left into the slot 3 leaves and an ellipsis fades in.
  const reflow = await nav.evaluate(async (element) => {
    const button = (name: string) => element.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;
    const start = button("Page 4").getBoundingClientRect().left;
    const end = button("Page 2").getBoundingClientRect().left;
    button("Page 5").click();
    const lefts: number[] = [];
    const fades: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 300) {
      lefts.push(button("Page 4").getBoundingClientRect().left);
      const gaps = element.querySelectorAll('[data-slot="pagination-ellipsis"]');
      if (gaps.length > 1) fades.push(Number(getComputedStyle(gaps[0]).opacity));
      await new Promise(requestAnimationFrame);
    }
    return { start, end, lefts, fades };
  });
  expect(reflow.lefts.some((x) => x < reflow.start - 4 && x > reflow.end + 4)).toBe(true);
  expect(reflow.fades.some((opacity) => opacity > 0.05 && opacity < 0.95)).toBe(true);
  await expect(nav.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(nav.locator('[data-slot="pagination-active"]')).toHaveCount(1);
  // Pages 2 and 3 finish leaving instead of lingering in the list.
  await expect(nav.locator('[data-slot="pagination-list"] > li')).toHaveCount(9);
  await expect.poll(() => visible(nav)).toEqual(["1", "…", "4", "5", "6", "…", "10"]);

  // Keyboard: move to Next, then through to the last page, where Next disables and focus stays on a page.
  await nav.getByRole("button", { name: "Page 5" }).focus();
  for (let index = 0; index < 3; index++) await page.keyboard.press("Tab", { delay: 60 });
  await expect(nav.getByRole("button", { name: "Next page" })).toBeFocused();
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press("Enter", { delay: 60 });
    await page.waitForTimeout(80);
  }
  await expect(nav.getByRole("button", { name: "Page 10" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("button", { name: "Next page" })).toBeDisabled();
  await expect(nav.getByRole("button", { name: "Page 10" })).toBeFocused();
  await expect.poll(() => visible(nav)).toEqual(["1", "…", "6", "7", "8", "9", "10"]);
});

test("reduced motion moves everything instantly on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const nav = await open(page);
  // The chevrons keep their accessible names.
  await expect(nav.getByRole("button", { name: "Next page" })).toBeVisible();

  const jump = await nav.evaluate(async (element) => {
    const button = (name: string) => element.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;
    const start = element.querySelector('[data-slot="pagination-active"]')!.getBoundingClientRect().left;
    button("Page 5").click();
    const surfaces: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      await new Promise(requestAnimationFrame);
      surfaces.push(element.querySelector('[data-slot="pagination-active"]')!.getBoundingClientRect().left);
    }
    return { start, surfaces, final: button("Page 5").getBoundingClientRect().left };
  });
  // Page 5 moves one slot left as the window shifts. A frame can land before React re-renders;
  // after that the surface sits on page 5's final spot with nothing in between.
  const spots = [jump.start, jump.final].map(Math.round);
  expect(jump.surfaces.every((x) => spots.includes(Math.round(x)))).toBe(true);
  expect(jump.surfaces.at(-1)).toBeCloseTo(jump.final, 0);
  await expect(nav.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
  expect(await visible(nav)).toEqual(["1", "…", "4", "5", "6", "…", "10"]);

  const box = await nav.locator('[data-slot="pagination-list"]').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the pagination", async ({ page, request }) => {
  await page.goto("/components");
  const card = page.locator('.catalog-card-link[href="/components/pagination"]');
  await settle(card);
  await card.click();
  await expect(page.getByRole("heading", { name: "Pagination", exact: true })).toBeVisible();
  const item = await (await request.get("/r/pagination.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/pagination.tsx");
  expect(item.files[0].content).toContain("export function Pagination");
  const guide = await request.get("/docs/components/pagination.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/pagination");
});
