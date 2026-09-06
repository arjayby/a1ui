import { expect, test } from "@playwright/test";

test("catalog opens component documentation in the agreed order", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Section Rail/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Spiral Text/ }).first()).toBeVisible();

  await page
    .getByRole("link", { name: /Section Rail/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/components\/section-rail$/);
  await expect(page.locator(".component-doc-body h2")).toHaveText([
    "Demo",
    "Installation",
    "Code",
    "API reference",
  ]);
});

test("selected component navigation keeps its label visible", async ({ page }) => {
  await page.goto("/components/section-rail");
  const activeLink = page
    .getByRole("navigation", { name: "Components" })
    .getByRole("link", { name: "Section Rail" });

  const colors = await activeLink.evaluate((element) => {
    const linkStyles = getComputedStyle(element);
    const pageStyles = getComputedStyle(document.body);

    return {
      background: linkStyles.backgroundColor,
      color: linkStyles.color,
      pageBackground: pageStyles.backgroundColor,
      pageForeground: pageStyles.color,
    };
  });

  expect(colors).toMatchObject({
    background: colors.pageForeground,
    color: colors.pageBackground,
  });
});

test("search finds component documentation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /Search/ }).click();

  const search = page.getByRole("dialog").getByRole("textbox");
  await search.fill("Spiral Text");
  await expect(page.getByRole("dialog").getByText("Spiral Text", { exact: true })).toBeVisible();
});

test("mobile navigation exposes the component selector and search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByLabel("Choose documentation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Search documentation" })).toBeVisible();
  await page.getByLabel("Choose documentation").selectOption("/components/spiral-text");
  await expect(page).toHaveURL(/\/components\/spiral-text$/);
});
