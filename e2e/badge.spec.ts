import { expect, test } from "./fixtures";

test("the demo shows outline badges, a centered bell, and a pulsing live dot", async ({ page }) => {
  await page.goto("/components/badge");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const region = frame.locator('[data-slot="badge-live"]').filter({ hasText: "Inbox" });
  await expect(region).toHaveAttribute("aria-live", "polite");
  await expect(frame.locator('[data-slot="badge-live"]').first()).toContainText("unread notifications");
  for (const badge of await frame.locator('[data-slot="badge"]').all()) {
    await expect(badge).toHaveAttribute("data-variant", "outline");
  }
  await expect(frame.locator('[data-slot="badge"]', { hasText: "Offline" })).toHaveCount(0);

  // The bell sits in the middle of its circle; the badge floats over the corner.
  const offset = await frame
    .locator("span.inline-grid")
    .first()
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      const icon = element.querySelector(":scope > svg")!.getBoundingClientRect();
      return [
        icon.x + icon.width / 2 - (box.x + box.width / 2),
        icon.y + icon.height / 2 - (box.y + box.height / 2),
      ];
    });
  expect(Math.abs(offset[0])).toBeLessThan(0.5);
  expect(Math.abs(offset[1])).toBeLessThan(0.5);

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
});

test("the count climbs by a tenth of the next power of ten until it reads max+, rolling each digit", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/components/badge");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const inbox = frame.locator('[data-slot="badge"]', { hasText: "Inbox" });
  const label = frame.locator('[data-slot="badge-live"]').filter({ hasText: "Inbox" }).locator(".sr-only");

  // Max 9 steps by one, and each change rolls the digit vertically.
  await expect(label).toHaveText("1 messages", { timeout: 5_000 });
  const offsets = await inbox.evaluate(async (element) => {
    const seen: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 1_200) {
      for (const digit of element.querySelectorAll('[data-slot="badge-digit"]')) {
        const transform = getComputedStyle(digit).transform;
        seen.push(transform === "none" ? 0 : Number.parseFloat(transform.split(",")[5]));
      }
      await new Promise(requestAnimationFrame);
    }
    return seen;
  });
  expect(offsets.some((y) => Math.abs(y) > 2 && Math.abs(y) < 14)).toBe(true);
  await expect(label).toHaveText("9+ messages", { timeout: 15_000 });
  await expect(label).toHaveText("0 messages", { timeout: 5_000 });

  // Max 99 steps by ten.
  await page.getByRole("button", { name: /^Max:/ }).click();
  await page.getByRole("menuitem", { name: "99", exact: true }).click();
  const seen = new Set<string>();
  await expect
    .poll(
      async () => {
        seen.add((await label.textContent()) ?? "");
        return seen.has("99+ messages");
      },
      { timeout: 15_000, intervals: [100] },
    )
    .toBe(true);
  expect([...seen].filter((text) => text !== "99+ messages" && text !== "0 messages")).toEqual(
    expect.arrayContaining(["10 messages", "50 messages", "90 messages"]),
  );
  expect([...seen].every((text) => /^(\d0|0|99\+) messages$/.test(text))).toBe(true);
});

test("the live dot stays still on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/badge");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  await expect(frame.locator('[data-slot="badge"]', { hasText: "Live" })).toBeVisible();
  await expect(frame.locator('[data-slot="badge-pulse"]')).toHaveCount(0);
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
