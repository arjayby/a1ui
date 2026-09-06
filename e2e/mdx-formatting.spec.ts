import { expect, test } from "@playwright/test";

test("MDX prose distinguishes inline code, links, and lists", async ({ page }) => {
  await page.goto("/agents");
  const body = page.locator(".component-doc-body");
  const code = body.locator("p code").first();

  await expect(code).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(code).not.toHaveCSS("padding-left", "0px");
  await expect(body.locator("p a").first()).toHaveCSS("text-decoration-line", "underline");
  await expect(body.locator("p strong").first()).toHaveCSS("font-weight", "700");
  await expect(body.locator(":scope > ul")).toHaveCSS("list-style-type", "disc");
  await expect(body.locator(":scope > ul")).not.toHaveCSS("padding-left", "0px");

  // Block code must not receive the border and padding of an inline code chip.
  await expect(body.locator("pre code").first()).toHaveCSS("border-top-width", "0px");
  await expect(body.locator("pre code").first()).toHaveCSS("padding", "0px");
});

test("MDX formats table code without adding prose styles to component demos", async ({ page }) => {
  await page.goto("/components/particle-menu");
  await expect(page.locator(".component-doc-body td code").first()).not.toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  const menu = page.locator(".demo-frame nav ul");
  await expect(menu).toHaveCSS("list-style-type", "none");
  await expect(menu).toHaveCSS("padding-left", "0px");
  await expect(menu.locator("li").first()).toHaveCSS("margin-top", "0px");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".component-doc-body td code").first()).toHaveCSS("white-space", "nowrap");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
