import { expect, test } from "@playwright/test";

test("check draws in, the parent tracks partial selection, and labels strike through", async ({ page }) => {
  await page.goto("/components/checkbox");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const parent = frame.getByRole("checkbox", { name: "All tasks" });
  const task = frame.getByRole("checkbox", { name: "Review the pricing page" });
  await expect(parent).toHaveAttribute("aria-checked", "mixed");
  await expect(parent.locator("path")).toHaveAttribute("d", "M5 9 L9 9 L13 9");

  const drawn = await task.evaluate(async (element: HTMLElement) => {
    const path = element.querySelector("path")!;
    element.click();
    const lengths: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      lengths.push(Number.parseFloat(path.getAttribute("stroke-dasharray") ?? "0"));
      await new Promise(requestAnimationFrame);
    }
    return lengths;
  });
  expect(drawn.some((length) => length > 0.05 && length < 0.95)).toBe(true);
  await expect(task).toHaveAttribute("aria-checked", "true");
  await expect(
    frame.locator('[data-slot="checkbox-text"]', { hasText: "Review the pricing page" }),
  ).toHaveAttribute("data-struck");

  await frame.getByText("Ship the changelog").click();
  await expect(parent).toHaveAttribute("aria-checked", "true");
  await expect(parent.locator("path")).toHaveAttribute("d", "M4.5 9.5 L7.5 12.5 L13.5 5.5");
  await parent.focus();
  await page.keyboard.press("Space");
  await expect(frame.getByRole("checkbox", { checked: true })).toHaveCount(0);
});

test("plain style skips the strikethrough on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/checkbox");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Style:/ }).click();
  await page.getByRole("menuitem", { name: "plain", exact: true }).click();
  const frame = page.locator(".demo-frame");
  await frame.getByRole("checkbox", { name: "Ship the changelog" }).click();
  await expect(frame.locator('[data-slot="checkbox-text"][data-struck]')).toHaveCount(0);
  await expect(frame.locator('[data-slot="checkbox-burst"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the checkbox", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/checkbox"]').click();
  await expect(page.getByRole("heading", { name: "Checkbox", exact: true })).toBeVisible();
  const item = await (await request.get("/r/checkbox.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/checkbox.tsx");
  expect(item.files[0].content).toContain("export function Checkbox");
  const guide = await request.get("/docs/components/checkbox.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/checkbox");
});
