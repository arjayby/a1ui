import { expect, test } from "@playwright/test";

test("one dot slides between options and arrow keys skip disabled ones", async ({ page }) => {
  await page.goto("/components/radio-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  await expect(frame.getByRole("radio", { name: "Pro" })).toHaveAttribute("aria-checked", "true");

  const result = await frame.evaluate(async (element) => {
    const radios = [...element.querySelectorAll<HTMLElement>('[data-slot="radio-group-radio"]')];
    const top = () => element.querySelector('[data-slot="radio-group-dot"]')!.getBoundingClientRect().top;
    const start = top();
    radios[2].click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      samples.push(top());
      await new Promise(requestAnimationFrame);
    }
    return { start, target: radios[2].getBoundingClientRect().top, samples };
  });
  expect(result.samples.some((y) => y > result.start + 2 && y < result.target - 2)).toBe(true);
  const team = frame.getByRole("radio", { name: "Team" });
  await expect(team).toHaveAttribute("aria-checked", "true");
  await expect(team).toHaveAccessibleDescription("Shared workspaces, roles, and audit logs.");
  await expect(frame.locator('[data-slot="radio-group-dot"]')).toHaveCount(1);

  await frame.getByText("Hobby").click();
  await expect(frame.getByRole("radio", { name: "Hobby" })).toHaveAttribute("aria-checked", "true");
  await frame.getByRole("radio", { name: "Hobby" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(frame.getByRole("radio", { name: "Pro" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(frame.getByRole("radio", { name: "Enterprise" })).toHaveAttribute("aria-checked", "false");
  await expect(frame.getByRole("radio", { checked: true })).toHaveCount(1);
});

test("card variant highlight lands instantly on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/radio-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Variant:/ }).click();
  await page.getByRole("menuitem", { name: "card", exact: true }).click();
  const frame = page.locator(".demo-frame");
  await expect(frame.getByRole("radiogroup", { name: "Plan" })).toHaveAttribute("data-variant", "card");

  await frame.getByText("Team", { exact: true }).click();
  const card = frame.locator('[data-slot="radio-group-item"]', { hasText: "Team" });
  const highlight = frame.locator('[data-slot="radio-group-highlight"]');
  await expect(highlight).toHaveCount(1);
  await expect(card.locator('[data-slot="radio-group-highlight"]')).toHaveCount(1);
  const [cardBox, highlightBox] = await Promise.all([card.boundingBox(), highlight.boundingBox()]);
  expect(Math.abs(highlightBox!.y - cardBox!.y)).toBeLessThan(2);
  expect(Math.abs(highlightBox!.height - cardBox!.height)).toBeLessThan(3);

  await frame.getByText("Enterprise", { exact: true }).click({ force: true });
  await expect(frame.getByRole("radio", { name: "Team" })).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the radio group", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/radio-group"]').click();
  await expect(page.getByRole("heading", { name: "Radio Group", exact: true })).toBeVisible();
  const item = await (await request.get("/r/radio-group.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/radio-group.tsx");
  expect(item.files[0].content).toContain("export function RadioGroupItem");
  const guide = await request.get("/docs/components/radio-group.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/radio-group");
});
