import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/compare-curtain");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page).toHaveTitle("Compare Curtain | a1ui");
});

test("the center arrow is the only slider and supports keyboard input", async ({ page }) => {
  const handle = page.getByRole("slider", { name: "Reveal published design" });
  await expect(handle).toHaveAttribute("aria-valuenow", "50");
  await expect(page.locator('input[type="range"]')).toHaveCount(0);
  await handle.focus();
  await handle.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "51");
  await handle.press("Home");
  await expect(handle).toHaveAttribute("aria-valuenow", "0");
  await handle.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "100");
});

test("dragging the center arrow directly moves and clamps the divider", async ({ page }) => {
  const handle = page.getByRole("slider", { name: "Reveal published design" });
  const stage = page.locator("[data-compare-stage]");
  await handle.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 5 });
  await expect(handle).toHaveAttribute("aria-valuenow", "80");
  await page.mouse.move(box.x + box.width + 50, box.y + box.height / 2);
  await expect(handle).toHaveAttribute("aria-valuenow", "100");
  await page.mouse.up();
  await expect(handle).not.toHaveAttribute("data-dragging");
});

test("the registry serves the component source", async ({ request }) => {
  const response = await request.get("/r/compare-curtain.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.name).toBe("compare-curtain");
  expect(item.files[0].content).toContain("export function CompareCurtain");
});
