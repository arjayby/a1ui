import { expect, test, type Locator } from "@playwright/test";

// Clicks `click` inside the page, then reads `read(element)` on every frame for `ms` milliseconds.
async function sample<T>(target: Locator, click: Locator, read: string, ms = 450): Promise<T[]> {
  const handle = await click.elementHandle();
  return target.evaluate(
    async (element: Element, { button, read, ms }) => {
      const reader = new Function("element", `return ${read}`) as (element: Element) => unknown;
      (button as HTMLElement).click();
      const values: unknown[] = [];
      const began = performance.now();
      while (performance.now() - began < ms) {
        values.push(reader(element));
        await new Promise(requestAnimationFrame);
      }
      return values;
    },
    { button: handle, read, ms },
  ) as Promise<T[]>;
}

// Vertical offset of every digit in the badge, in pixels.
const DIGIT_OFFSETS = `[...element.querySelectorAll('[data-slot="badge-digit"]')].map((digit) => {
  const transform = getComputedStyle(digit).transform;
  return transform === "none" ? 0 : Number.parseFloat(transform.split(",")[5]);
})`;
const COUNT_WIDTH = `element.querySelector('[data-slot="badge-count"]').getBoundingClientRect().width`;
const SCALE = `(() => { const t = getComputedStyle(element).transform; return t === "none" ? 1 : Number.parseFloat(t.slice(7)); })()`;

test("digits roll up and down, the width eases, and the badge pops in from zero", async ({ page }) => {
  await page.goto("/components/badge");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const inbox = frame.locator('[data-slot="badge"]', { hasText: "Inbox" });
  const region = frame.locator('[data-slot="badge-live"]').filter({ hasText: "Inbox" });
  const add = frame.getByRole("button", { name: "Add 1", exact: true });
  const remove = frame.getByRole("button", { name: "Remove 1", exact: true });
  await expect(region).toHaveAttribute("aria-live", "polite");
  await expect(region).toHaveText("Inbox88 messages");

  // 8 → 9: the old digit leaves upward while the new one rises from below.
  const rising = await sample<number[]>(inbox, add, DIGIT_OFFSETS);
  expect(rising.some((offsets) => offsets.some((y) => y < -2 && y > -14))).toBe(true);
  expect(rising.some((offsets) => offsets.some((y) => y > 2 && y < 14))).toBe(true);
  await expect(region).toContainText("9 messages");

  // 9 → 10: a second column appears and the count widens through in-between sizes.
  const narrow = await inbox.evaluate(
    (element) => element.querySelector('[data-slot="badge-count"]')!.getBoundingClientRect().width,
  );
  const widths = await sample<number>(inbox, add, COUNT_WIDTH);
  await expect(region).toContainText("10 messages");
  await expect
    .poll(() => inbox.evaluate(new Function("element", `return ${COUNT_WIDTH}`) as () => number))
    .toBeCloseTo(narrow * 2, 0);
  expect(widths.some((width) => width > narrow + 1 && width < narrow * 2 - 1)).toBe(true);

  // 10 → 9: digits slide the other way.
  const falling = await sample<number[]>(inbox, remove, DIGIT_OFFSETS);
  expect(falling.some((offsets) => offsets.some((y) => y > 2 && y < 14))).toBe(true);
  expect(falling.some((offsets) => offsets.some((y) => y < -2 && y > -14))).toBe(true);
  await expect(region).toContainText("9 messages");

  // max caps the display.
  await frame.getByRole("button", { name: "Add 25" }).click();
  await expect(frame.locator('[data-slot="badge-live"]').first()).toContainText("34 unread notifications");
  await page.getByRole("button", { name: /^Max:/ }).click();
  await page.getByRole("menuitem", { name: "9", exact: true }).click();
  await expect(region).toContainText("9+ messages");

  // Clearing hides the bell badge; the first rise from zero pops both back.
  await frame.getByRole("button", { name: "Clear" }).click();
  await expect(frame.locator('[data-slot="badge-live"]').first().locator('[data-slot="badge"]')).toHaveCount(
    0,
  );
  await expect(region).toContainText("0 messages");
  const scales = await sample<number>(inbox, add, SCALE);
  expect(scales.some((scale) => scale > 0.6 && scale < 0.95)).toBe(true);
  await expect(frame.locator('[data-slot="badge-live"]').first()).toContainText("1 unread notifications");

  // The live dot keeps pulsing.
  const pulse = frame
    .locator('[data-slot="badge"]', { hasText: "Live" })
    .locator('[data-slot="badge-pulse"]');
  const frames = await pulse.evaluate(async (element) => {
    const seen = new Set<string>();
    const began = performance.now();
    while (performance.now() - began < 300) {
      seen.add(getComputedStyle(element).transform);
      await new Promise(requestAnimationFrame);
    }
    return seen.size;
  });
  expect(frames).toBeGreaterThan(5);
  await expect(
    frame.locator('[data-slot="badge"]', { hasText: "Offline" }).locator('[data-slot="badge-pulse"]'),
  ).toHaveCount(0);
});

test("numbers swap instantly without a pulse on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/badge");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const inbox = frame.locator('[data-slot="badge"]', { hasText: "Inbox" });
  await expect(frame.locator('[data-slot="badge-pulse"]')).toHaveCount(0);

  const add = frame.getByRole("button", { name: "Add 1", exact: true });
  await add.click();
  await expect(inbox).toContainText("9 messages");
  const narrow = await inbox.evaluate(
    (element) => element.querySelector('[data-slot="badge-count"]')!.getBoundingClientRect().width,
  );
  const offsets = await sample<number[]>(inbox, add, DIGIT_OFFSETS, 200);
  const widths = await sample<number>(
    inbox,
    frame.getByRole("button", { name: "Remove 1" }),
    COUNT_WIDTH,
    200,
  );
  // The first frame can land before React re-renders; after that the digits are already in place.
  expect(offsets.flat().every((y) => y === 0)).toBe(true);
  expect(offsets.at(-1)).toEqual([0, 0]);
  expect(widths.every((width) => Math.abs(width - narrow) < 0.5 || Math.abs(width - narrow * 2) < 0.5)).toBe(
    true,
  );
  await expect(inbox).toContainText("9 messages");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the badge", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/badge"]').click();
  await expect(page.getByRole("heading", { name: "Badge", exact: true })).toBeVisible();
  const item = await (await request.get("/r/badge.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/badge.tsx");
  expect(item.files[0].content).toContain("export function Badge");
  const guide = await request.get("/docs/components/badge.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/badge");
});
