import { expect, test } from "@playwright/test";
import registry from "../registry.json" with { type: "json" };

test("home showcases the library and opens the documentation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("a1ui — Small details. Better interfaces.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Small details.Better interfaces.");
  await expect(page.locator('[data-sidebar="sidebar"]')).toHaveCount(0);
  await expect(page.locator(".landing-block-card")).toHaveCount(3);
  for (const item of registry.items) {
    const link = page.locator(
      `main a[href="/${item.type === "registry:block" ? "blocks" : "components"}/${item.name}"]`,
    );
    if ((await link.count()) > 0) await expect(link).toBeVisible();
  }
  await page.getByRole("link", { name: "Explore components", exact: true }).click();
  await expect(page).toHaveURL(/\/components$/);
  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "a1ui Documentation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Small details.");
  await page.getByRole("link", { name: "Browse blocks", exact: true }).click();
  await expect(page).toHaveURL(/\/blocks$/);
  await expect(page.getByRole("heading", { name: "Blocks", exact: true })).toBeVisible();
});

test("landing component previews respond to input", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Copy text", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Small details. Better interfaces.");
  const toggle = page.getByRole("button", { name: "Toggle preview icon" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const slider = page.getByRole("slider", { name: "Intensity" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).not.toHaveAttribute("aria-valuenow", "50");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submitted", exact: true })).toBeVisible();
});

for (const width of [1440, 390, 320]) {
  test(`landing fits ${width}px in both themes with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    for (const theme of ["dark", "light"]) {
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: "Blocks", exact: true }),
      ).toBeVisible();
      const terrain = page
        .locator(".landing-block-card")
        .filter({ has: page.getByRole("heading", { name: "ASCII Terrain" }) });
      await terrain.scrollIntoViewIfNeeded();
      await expect(terrain.locator("canvas")).toHaveAttribute("data-ready", "true");
      await page.getByRole("button", { name: "Toggle theme" }).click();
    }
  });
}
