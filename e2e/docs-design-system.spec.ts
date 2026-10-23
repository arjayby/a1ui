import { expect, test } from "@playwright/test";
import registry from "../registry.json" with { type: "json" };

for (const { name, title } of registry.items) {
  test(`${title} documentation supports installation and source tabs`, async ({ page }) => {
    await page.goto(`/blocks/${name}`);
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "On this page" }).getByRole("link")).toHaveText([
      "Demo",
      "Installation",
      "Code",
      "API reference",
    ]);

    const install = page.getByRole("tablist", { name: "Package manager" });
    await expect(install.getByRole("tab", { name: "pnpm", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await install.getByRole("tab", { name: "npm", exact: true }).click();
    await expect(page.getByRole("tabpanel").filter({ hasText: "npx shadcn@latest add" })).toContainText(
      `/r/${name}.json`,
    );

    const source = page.getByRole("tab", { name: "Source", exact: true });
    await page.getByRole("tab", { name: "Usage", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(source).toBeFocused();
    await expect(source).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel").filter({ hasText: "export function" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("navigation", { name: "On this page" })
      .getByRole("link", { name: "API reference" })
      .click();
    await expect(page.getByRole("region", { name: "Reference table" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("package manager preference survives navigation and reloads", async ({ page }) => {
  await page.goto("/blocks/section-rail");
  await page.getByRole("tab", { name: "yarn", exact: true }).click();
  await page.goto("/blocks/spiral-text");
  await expect(page.getByRole("tab", { name: "yarn", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.reload();
  await expect(page.getByRole("tab", { name: "yarn", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("invalid package manager preferences fall back to pnpm", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("package-manager", "unknown-manager"));
  await page.goto("/blocks/section-rail");
  await expect(page.getByRole("tab", { name: "pnpm", exact: true })).toHaveAttribute("aria-selected", "true");
});

for (const access of ["read", "write"]) {
  test(`blocked storage ${access} keeps tabs usable`, async ({ page }) => {
    await page.addInitScript((access) => {
      localStorage.setItem("package-manager", "pnpm");
      if (access === "read") {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new Error("Storage blocked");
          },
        });
      } else {
        Storage.prototype.setItem = () => {
          throw new Error("Storage full");
        };
      }
    }, access);
    await page.goto("/blocks/section-rail");
    const bun = page.getByRole("tab", { name: "bun", exact: true });
    await bun.click();
    await expect(bun).toHaveAttribute("aria-selected", "true");
    await expect(bun).toBeFocused();
    await expect(
      page.getByRole("tabpanel").filter({ hasText: "bunx --bun shadcn@latest add" }),
    ).toBeVisible();
  });
}

test("documentation shares the component geometry in both themes", async ({ page }) => {
  await page.goto("/blocks/section-rail");
  for (const theme of ["dark", "light"]) {
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await expect(page.getByRole("button", { name: "Copy prompt for agent" })).toHaveCSS(
      "border-radius",
      "6px",
    );
    await expect(page.getByRole("button", { name: "Copy prompt for agent" })).toHaveCSS(
      "font-family",
      "Inter, sans-serif",
    );
    await expect(page.locator(".demo-frame")).toHaveCSS("border-radius", "12px");
    await expect(page.getByRole("tab", { name: "Usage", exact: true })).toHaveCSS(
      "font-family",
      "Inter, sans-serif",
    );
    await page.getByRole("button", { name: "Toggle theme" }).click();
  }
});
