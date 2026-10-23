import { expect, test } from "@playwright/test";

test("catalog opens block documentation in the agreed order", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByRole("heading", { name: "Blocks", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Section Rail/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Spiral Text/ }).first()).toBeVisible();

  await page
    .getByRole("link", { name: /Section Rail/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/blocks\/section-rail$/);
  await expect(page.locator(".docs-article-body h2")).toHaveText([
    "Demo",
    "Installation",
    "Code",
    "API reference",
  ]);
});

test("selected block navigation keeps its label visible", async ({ page }) => {
  await page.goto("/blocks/section-rail");
  const activeLink = page
    .getByRole("navigation", { name: "Blocks" })
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

test("desktop sidebar can scroll to its final block", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const sidebar = page.locator(".docs-shell > aside");
  const finalLink = page.getByRole("navigation", { name: "Blocks" }).getByRole("link").last();

  await sidebar.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect
    .poll(async () => finalLink.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(800);
});

test("search finds block documentation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /Search/ }).click();

  const search = page.getByRole("dialog").getByRole("textbox");
  await search.fill("Spiral Text");
  await expect(page.getByRole("dialog").getByText("Spiral Text", { exact: true })).toBeVisible();
});

test("mobile navigation exposes the block selector and search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByLabel("Choose documentation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Search documentation" })).toBeVisible();
  await page.getByLabel("Choose documentation").selectOption("/blocks/spiral-text");
  await expect(page).toHaveURL(/\/blocks\/spiral-text$/);
});
