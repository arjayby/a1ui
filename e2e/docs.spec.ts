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
    .getByRole("navigation", { name: "Library" })
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
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/");

  const sidebar = page.locator('[data-sidebar="content"]');
  const finalLink = page.getByRole("navigation", { name: "Library" }).getByRole("link").last();

  await sidebar.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect
    .poll(async () => finalLink.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(600);
});

test("search finds block documentation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("button", { name: "Search documentation" })).toHaveCount(1);
  await page.locator("header").getByRole("button", { name: "Search documentation" }).click();

  const search = page.getByRole("dialog").getByRole("textbox");
  await search.fill("Spiral Text");
  await expect(page.getByRole("dialog").getByText("Spiral Text", { exact: true })).toBeVisible();
});

test("mobile sidebar opens, navigates, closes, and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByRole("button", { name: "Search documentation" })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true });
  await trigger.click();
  const sidebar = page.getByRole("dialog", { name: "Documentation", exact: true });
  await expect(sidebar).toBeVisible();
  await sidebar.getByRole("link", { name: "Spiral Text", exact: true }).click();
  await expect(page).toHaveURL(/\/blocks\/spiral-text$/);
  await expect(sidebar).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(sidebar).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("desktop sidebar and block group support collapsing", async ({ page }) => {
  await page.goto("/blocks/section-rail");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const sidebar = page.locator('[data-slot="sidebar-container"]');
  const blockToggle = page.getByRole("button", { name: "Toggle block navigation" });
  const activeBlock = page
    .getByRole("navigation", { name: "Library", exact: true })
    .getByRole("link", { name: "Section Rail", exact: true });
  await blockToggle.click();
  await expect(activeBlock).not.toBeVisible();
  await blockToggle.click();
  await expect(activeBlock).toBeVisible();
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await expect(sidebar).not.toBeInViewport();
  await page.keyboard.press("Control+b");
  await expect(sidebar).toBeInViewport();
});

for (const method of ["button", "shortcut"]) {
  test(`mobile search via ${method} leaves the selected page visible`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/blocks");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const sidebar = page.getByRole("dialog", { name: "Documentation", exact: true });
    if (method === "button") {
      await page.locator("header").getByRole("button", { name: "Search documentation" }).click();
    } else {
      await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
      await page.keyboard.press("Control+k");
    }
    await expect(sidebar).not.toBeVisible();
    const search = page.getByRole("dialog").getByRole("textbox");
    await expect(search).toBeFocused();
    await search.fill("Spiral Text");
    await page.getByRole("dialog").getByText("Spiral Text", { exact: true }).click();
    await expect(page).toHaveURL(/\/blocks\/spiral-text$/);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
}
