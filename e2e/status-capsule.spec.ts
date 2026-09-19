import { expect, test } from "@playwright/test";

const capsuleSelector = '[data-slot="status-capsule"]';
const triggerSelector = '[data-slot="status-capsule-trigger"]';

test.beforeEach(async ({ page }) => {
  await page.goto("/components/status-capsule");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("exports while collapsed, reopens its completed details, and replays", async ({ page }) => {
  const capsule = page.locator(capsuleSelector);
  await page.getByRole("button", { name: "Run preview" }).click();
  await expect(capsule).toHaveAttribute("data-state", "running");
  await page.getByRole("button", { name: "Collapse details" }).click();
  await expect(capsule).toHaveAttribute("data-expanded", "false");
  await expect(page.locator('[data-slot="status-capsule-details"]')).toHaveAttribute("inert", "");
  await expect(capsule).toHaveAttribute("data-state", "success");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await page.locator(triggerSelector).press("Enter");
  await expect(capsule.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Run again" }).click();
  await expect(capsule).toHaveAttribute("data-state", "running");
});

test("retries an interrupted export and restores focus when escaping from the action", async ({ page }) => {
  const capsule = page.locator(capsuleSelector);
  await page.getByRole("button", { name: "Preview interruption" }).click();
  await expect(capsule).toHaveAttribute("data-state", "error");
  const retry = page.getByRole("button", { name: "Retry export" });
  await retry.focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(triggerSelector)).toBeFocused();
  await expect(page.locator(triggerSelector)).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await retry.click();
  await expect(capsule).toHaveAttribute("data-state", "success");
});

test("fits a narrow screen in both themes and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const capsule = page.locator(capsuleSelector);
  for (const dark of [false, true]) {
    await page.locator("html").evaluate((element, value) => element.classList.toggle("dark", value), dark);
    const bounds = (await capsule.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(await capsule.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await capsule.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe("none");
    await page.locator(triggerSelector).click();
    await expect(capsule).toHaveAttribute("data-expanded", "false");
    await page.locator(triggerSelector).click();
  }
});

test("the catalog preview fits its card and links to the component", async ({ page }) => {
  await page.goto("/");
  const card = page
    .locator(".catalog-card")
    .filter({ has: page.getByRole("link", { name: "Status Capsule", exact: true }) });
  const preview = (await card.locator(".catalog-preview").boundingBox())!;
  const capsule = (await card.locator(capsuleSelector).boundingBox())!;
  expect(capsule.x).toBeGreaterThan(preview.x);
  expect(capsule.x + capsule.width).toBeLessThan(preview.x + preview.width);
  expect(capsule.y).toBeGreaterThan(preview.y);
  expect(capsule.y + capsule.height).toBeLessThan(preview.y + preview.height);
  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/components\/status-capsule$/);
});
