import { expect, test } from "@playwright/test";
import registry from "../registry.json" with { type: "json" };

test("blocks and reusable components have separate catalogs on desktop and mobile", async ({ page }) => {
  await page.goto("/blocks");
  await expect(page.locator(".catalog-card")).toHaveCount(registry.items.length);
  for (const item of registry.items) {
    await expect(page.locator(`.catalog-card-link[href="/blocks/${item.name}"]`)).toHaveText(item.title);
  }

  await page.getByRole("navigation", { name: "Components", exact: true }).getByRole("link").click();
  await expect(page).toHaveURL(/\/components$/);
  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "01 / Foundations" })).toBeVisible();
  await expect(page.locator(".catalog-card")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Documentation", exact: true })
    .getByRole("link", { name: "Blocks", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Blocks", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Documentation", exact: true })
    .getByRole("link", { name: "Components", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "01 / Foundations" })).toBeVisible();
});

test("existing page and Markdown links redirect to the migrated blocks", async ({ request }) => {
  for (const { name } of registry.items) {
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
