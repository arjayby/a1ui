import { expect, test } from "./fixtures";

test("home introduces the library and its menu opens each section", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("a1ui — Animated React components and blocks");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "a1ui — Animated React components and blocks",
  );
  await expect(page.locator('[data-sidebar="sidebar"]')).toHaveCount(0);
  const menu = page.getByRole("navigation", { name: "Main navigation" });
  await expect(menu.getByRole("link")).toHaveText(["Components", "Blocks", "For agents", "GitHub"], {
    ignoreCase: true,
  });
  await expect(menu.getByRole("link", { name: "For agents" })).toHaveAttribute("href", "/agents");
  await expect(menu.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/arjayby/a1ui",
  );

  await menu.getByRole("link", { name: "Components", exact: true }).click();
  await expect(page).toHaveURL(/\/components$/);
  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "a1ui Documentation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Animated React");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Blocks", exact: true })
    .click();
  await expect(page).toHaveURL(/\/blocks$/);
  await expect(page.getByRole("heading", { name: "Blocks", exact: true })).toBeVisible();
});

test("the monogram morphs when clicked", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const art = page.locator('.landing-card [data-slot="ascii-morph"]');
  await expect(art).toHaveAttribute("data-shape", "a1");
  await page.getByRole("button", { name: "Morph the a1ui monogram" }).click();
  await expect(art).toHaveAttribute("data-shape", "globe");
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
      const menu = page.getByRole("navigation", { name: "Main navigation" });
      for (const name of ["Components", "Blocks", "For agents", "GitHub"]) {
        const link = menu.getByRole("link", { name, exact: true });
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeVisible();
      }
      await page.getByRole("button", { name: "Toggle theme" }).click();
    }
  });
}
