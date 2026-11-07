import { type Locator } from "@playwright/test";
import { expect, test } from "./fixtures";
import registry from "../registry.json" with { type: "json" };

// Component categories start closed, except the one holding the current page.
async function componentLinks(nav: Locator) {
  const closed = nav.locator('button[aria-expanded="false"]');
  while ((await closed.count()) > 0) await closed.first().click();
  return (await nav.locator('a[href^="/components/"]').allTextContents()).sort((a, b) => a.localeCompare(b));
}

test("blocks and reusable components have separate catalogs on desktop and mobile", async ({ page }) => {
  await page.goto("/blocks");
  await expect(page.locator(".catalog-card")).toHaveCount(
    registry.items.filter((item) => item.type === "registry:block").length,
  );
  for (const item of registry.items.filter((item) => item.type === "registry:block")) {
    await expect(page.locator(`.catalog-card-link[href="/blocks/${item.name}"]`)).toHaveText(item.title);
  }

  await page
    .getByRole("navigation", { name: "Components", exact: true })
    .getByRole("link", { name: "All components", exact: true })
    .click();
  await expect(page).toHaveURL(/\/components$/);
  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "01 / Foundations" })).toHaveCount(0);
  await expect(page.locator(".catalog-card")).toHaveCount(
    registry.items.filter((item) => item.type === "registry:component").length,
  );
  const sidebar = page.locator('[data-sidebar="content"]');
  const componentTitles = registry.items
    .filter((item) => item.type === "registry:component")
    .map((item) => item.title)
    .sort((a, b) => a.localeCompare(b));
  await expect(page.locator(".catalog-card-link")).toHaveText(componentTitles);
  expect(await componentLinks(page.getByRole("navigation", { name: "Components", exact: true }))).toEqual(
    componentTitles,
  );
  const catalogLinks = sidebar.getByRole("link").filter({ hasText: /^All (components|blocks)$/ });
  await expect(catalogLinks).toHaveText(["All components", "All blocks"]);
  await expect(page.locator('a[href="/design-system"]')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Documentation", exact: true });
  expect(await componentLinks(dialog.getByRole("navigation", { name: "Components", exact: true }))).toEqual(
    componentTitles,
  );
  await dialog.getByRole("link", { name: "All blocks", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blocks", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Documentation", exact: true })
    .getByRole("link", { name: "All components", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "01 / Foundations" })).toHaveCount(0);
  await expect(page.locator('a[href="/design-system"]')).toHaveCount(0);
});

test("the retired design system page is not served", async ({ request }) => {
  const response = await request.get("/design-system");
  expect(response.status()).toBe(404);
});

test("existing page and Markdown links redirect to the migrated blocks", async ({ request }) => {
  for (const { name } of registry.items.filter((item) => item.type === "registry:block")) {
    for (const [oldPath, newPath] of [
      [`/components/${name}`, `/blocks/${name}`],
      [`/docs/components/${name}.md`, `/docs/blocks/${name}.md`],
    ]) {
      const response = await request.get(oldPath, { maxRedirects: 0 });
      expect(response.status()).toBe(308);
      expect(response.headers().location).toBe(newPath);
      expect((await request.get(newPath)).ok()).toBeTruthy();
    }
  }
});

test("retired entries are absent from the site and generated install artifacts", async ({ request }) => {
  for (const name of [
    "toast-queue",
    "status-capsule",
    "select-menu",
    "orbit-dial",
    "multichain-swap",
    "crypto-wallet",
    "command-deck",
    "ascii-signal",
    "ascii-cloth",
  ]) {
    for (const url of [
      `/components/${name}`,
      `/blocks/${name}`,
      `/r/${name}.json`,
      `/docs/components/${name}.md`,
      `/docs/blocks/${name}.md`,
    ]) {
      expect((await request.get(url)).status(), url).toBe(404);
    }
  }
});
