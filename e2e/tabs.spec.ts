import { expect, test } from "./fixtures";

test("indicator glides between tabs and panels follow mouse and keyboard", async ({ page }) => {
  await page.goto("/components/tabs");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const result = await frame.evaluate(async (element) => {
    const tabs = [...element.querySelectorAll<HTMLButtonElement>('[data-slot="tabs-trigger"]')];
    const left = () => element.querySelector('[data-slot="tabs-indicator"]')!.getBoundingClientRect().left;
    const start = left();
    tabs[2].click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      samples.push(left());
      await new Promise(requestAnimationFrame);
    }
    return { start, target: tabs[2].getBoundingClientRect().left, samples };
  });
  expect(result.samples.some((x) => x > result.start + 2 && x < result.target - 2)).toBe(true);
  await expect(frame.getByRole("tab", { name: "Reports" })).toHaveAttribute("aria-selected", "true");
  await expect(frame.getByRole("tabpanel")).toContainText("Scheduled reports");
  await expect(frame.locator('[data-slot="tabs-indicator"]')).toHaveCount(1);

  await frame.getByRole("tab", { name: "Reports" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  await expect(frame.getByRole("tabpanel")).toContainText("Integrations connected");
});

test("underline variant keeps its bar visible on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/tabs");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Variant:/ }).click();
  await page.getByRole("menuitem", { name: "underline", exact: true }).click();
  const frame = page.locator(".demo-frame");
  await frame.getByRole("tab", { name: "Analytics" }).click();
  const bar = frame.locator('[data-slot="tabs-indicator"]');
  await expect(bar).toBeVisible();
  const [barBox, listBox] = await Promise.all([bar.boundingBox(), frame.getByRole("tablist").boundingBox()]);
  expect(barBox!.height).toBeGreaterThan(0);
  expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(listBox!.y + listBox!.height);
  await expect(frame.getByRole("tabpanel")).toContainText("Average session length");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include tabs", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/tabs"]').click();
  await expect(page.getByRole("heading", { name: "Tabs", exact: true })).toBeVisible();
  const item = await (await request.get("/r/tabs.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/tabs.tsx");
  expect(item.files[0].content).toContain("export function TabsTrigger");
  const guide = await request.get("/docs/components/tabs.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/tabs");
});
