import { expect, test } from "@playwright/test";

const highlight = '[data-slot="menu-highlight"]';

test("focus travels between rows without selecting and returns on blur", async ({ page }) => {
  await page.goto("/components/menu");
  const menu = page.getByRole("group", { name: "Workspace views" });
  const overview = menu.getByRole("button", { name: "Overview" });
  const settings = menu.getByRole("button", { name: "Settings" });
  const start = await menu.locator(highlight).boundingBox();
  const destination = await settings.boundingBox();
  const menuBox = await menu.boundingBox();
  if (!start || !destination || !menuBox) throw new Error("Expected visible menu geometry");

  const positions = await settings.evaluate(async (element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected a menu button");
    const menu = element.closest("[data-menu]");
    const positions = [];
    element.focus();
    const started = performance.now();
    while (performance.now() - started < 600) {
      await new Promise(requestAnimationFrame);
      const indicator = menu?.querySelector('[data-slot="menu-highlight"]');
      if (indicator && menu)
        positions.push(indicator.getBoundingClientRect().y - menu.getBoundingClientRect().y);
    }
    return positions;
  });
  expect(positions.some((y) => y > start.y - menuBox.y + 2 && y < destination.y - menuBox.y - 2)).toBe(true);
  expect(positions.at(-1)).toBeCloseTo(destination.y - menuBox.y, 0);
  await expect(overview).toHaveAttribute("aria-pressed", "true");
  await expect(settings).toHaveAttribute("aria-pressed", "false");
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute("data-highlighted");
  // The sidebar has its own scoped highlight.
  await expect(page.locator('[data-sidebar="content"] [aria-current="page"]')).toHaveAttribute(
    "data-highlighted",
  );

  await page.getByRole("button", { name: "Search documentation" }).focus();
  await expect(overview).toHaveAttribute("data-highlighted");
  await overview.focus();
  await page.keyboard.press("Tab");
  const projects = menu.getByRole("button", { name: "Projects" });
  await expect(projects).toHaveAttribute("data-highlighted");
  await expect(overview).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");
  await expect(projects).toHaveAttribute("aria-pressed", "true");
});

test("sidebar keeps its highlight across selection, groups, history, and scrolling", async ({ page }) => {
  await page.goto("/components/menu");
  const sidebar = page.locator('[data-sidebar="content"]');
  const link = sidebar.getByRole("link", { name: "Copy Button", exact: true });
  await link.click();
  await expect(page).toHaveURL(/\/components\/copy-button$/);
  await expect(link).toHaveAttribute("aria-current", "page");
  await expect(link).toHaveAttribute("data-highlighted");
  await expect(sidebar.locator(highlight)).toHaveCount(1);
  await expect(link).toHaveCSS("overflow", "visible");
  await expect(link).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(link).not.toHaveCSS(
    "color",
    await sidebar.locator(highlight).evaluate((element) => getComputedStyle(element).backgroundColor),
  );

  await page.goBack();
  await expect(sidebar.getByRole("link", { name: "Menu", exact: true })).toHaveAttribute("data-highlighted");
  await sidebar.getByRole("link", { name: "Text Scramble", exact: true }).click();
  await expect(page).toHaveURL(/\/blocks\/text-scramble$/);
  await expect(sidebar.locator('[aria-current="page"]')).toHaveAttribute("data-highlighted");
  await sidebar.getByRole("link", { name: "Install with an agent" }).click();
  await expect(page).toHaveURL(/\/agents$/);
  await expect(sidebar.locator('[aria-current="page"]')).toHaveAttribute("data-highlighted");
  await sidebar.getByRole("button", { name: "Toggle component navigation" }).click();
  await sidebar.getByRole("button", { name: "Toggle component navigation" }).click();
  await expect(sidebar.locator(highlight)).toHaveCount(1);
});

test("reduced motion switches instantly and mobile navigation closes after selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/menu");
  const menu = page.getByRole("group", { name: "Workspace views" });
  await menu.getByRole("button", { name: "Settings" }).click();
  const positions = await menu.evaluate(async (element) => {
    const target = element.querySelector('[aria-pressed="true"]');
    const indicator = element.querySelector('[data-slot="menu-highlight"]');
    if (!target || !indicator) throw new Error("Missing selection");
    await new Promise(requestAnimationFrame);
    return { target: target.getBoundingClientRect().y, indicator: indicator.getBoundingClientRect().y };
  });
  expect(positions.indicator).toBeCloseTo(positions.target, 1);
  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  const dialog = page.getByRole("dialog", { name: "Documentation" });
  await dialog.getByRole("link", { name: "Loading Button", exact: true }).click();
  await expect(page).toHaveURL(/\/components\/loading-button$/);
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog and registry expose the installable component", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/menu"]').click();
  await expect(page.getByRole("heading", { name: "Menu", exact: true })).toBeVisible();
  const item = await (await request.get("/r/menu.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/menu.tsx");
  expect(item.files[0].content).toContain("export function MenuItem");
  const guide = await request.get("/docs/components/menu.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/menu");
});
