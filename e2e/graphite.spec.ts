import { expect, test } from "@playwright/test";
import source from "../docs/graphite/source.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await page.goto("/components");
  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
});

test("source tokens and fonts support Luma component styles", async ({ page }) => {
  await expect(page.locator("html")).toHaveClass(/dark/);
  const actual = await page.evaluate((tokens) => {
    const style = getComputedStyle(document.documentElement);
    return tokens.map(({ name }) => style.getPropertyValue(name).trim().replaceAll('"', ""));
  }, source.tokens);
  const normalize = (value: string) => value.toLowerCase().replace(/(^|-)0\./, "$1.");
  expect(actual.map(normalize)).toEqual(source.tokens.map(({ value }) => normalize(value)));
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 16, 16)");
  await expect(page.locator("h1")).toHaveCSS("font-family", '"Stack Sans Notch", sans-serif');
  await expect(page.getByRole("button", { name: "Create report", exact: true })).toHaveCSS(
    "font-family",
    "Inter, sans-serif",
  );
  await expect(page.getByLabel("Website domain")).toHaveCSS("font-family", "Inter, sans-serif");
  await expect(page.getByRole("button", { name: "Create report", exact: true })).toHaveCSS(
    "border-radius",
    "32px",
  );
  await expect(page.getByLabel("Website domain")).toHaveCSS("border-radius", "24px");
  await expect(page.locator('[data-slot="card"]').first()).toHaveCSS("border-radius", "32px");
  expect(
    await page.evaluate(async () => {
      const faces = [
        ["Inter", "400"],
        ["Inter", "500"],
        ["Inter", "600"],
        ["Stack Sans Notch", "400"],
        ["Stack Sans Notch", "500"],
        ["DM Mono", "400"],
        ["DM Mono", "500"],
      ];
      const loaded = await Promise.all(
        faces.map(([family, weight]) => document.fonts.load(`${weight} 16px "${family}"`)),
      );
      return loaded.every((fonts) => fonts.length > 0 && fonts.every((font) => font.status === "loaded"));
    }),
  ).toBe(true);
  await page.getByText("All 66 design tokens", { exact: false }).click();
  await expect(page.locator(".graphite-token-list dt")).toHaveCount(66);
});

test("native controls retain labels, form state, keyboard navigation, and disabled states", async ({
  page,
}) => {
  const track = page.getByRole("checkbox", { name: "Track page views", exact: true });
  await expect(track).toBeChecked();
  await track.uncheck();
  await expect(track).not.toBeChecked();
  const radio = page.getByRole("radio", { name: "Last touch", exact: true });
  await radio.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "First touch", exact: true })).toBeChecked();
  const live = page.getByRole("switch", { name: "Live traffic updates" });
  await live.focus();
  await page.keyboard.press("Space");
  await expect(live).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "Revenue alerts / unavailable" })).toBeDisabled();
  await page.getByLabel("Traffic channel").selectOption("organic");
  await expect(page.getByLabel("Traffic channel")).toHaveValue("organic");
  await expect(page.getByLabel("Archived website", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Domain / invalid specimen")).toHaveAttribute(
    "aria-describedby",
    "domain-error",
  );
});

test("dialog traps focus, validates, saves, dismisses, and restores focus", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Create funnel", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Create a funnel" });
  await expect(dialog).toBeVisible();
  const field = dialog.getByLabel("Funnel name");
  await expect(field).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(field).toBeFocused();
  await field.fill("   ");
  await dialog.getByRole("button", { name: "Create funnel", exact: true }).click();
  await expect(dialog).toBeVisible();
  await field.fill("Purchase journey");
  await dialog.getByRole("button", { name: "Create funnel", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Created: Purchase journey", { exact: true })).toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("sheet and popover apply changes and cancel draft edits", async ({ page }) => {
  await page.getByRole("button", { name: "Journey filters", exact: true }).click();
  let sheet = page.getByRole("dialog", { name: "Journey filters", exact: true });
  await sheet.getByLabel("Exclude internal traffic").uncheck();
  await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Internal traffic is excluded.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Journey filters", exact: true }).click();
  sheet = page.getByRole("dialog", { name: "Journey filters", exact: true });
  await expect(sheet.getByLabel("Exclude internal traffic")).toBeChecked();
  await sheet.getByLabel("Exclude internal traffic").uncheck();
  await sheet.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("Internal traffic is included.", { exact: true })).toBeVisible();
  const period = page.getByRole("button", { name: "Last 30 days", exact: true });
  await period.click();
  await page.getByLabel("Reporting period", { exact: true }).selectOption("7");
  await page.keyboard.press("Escape");
  await expect(period).toBeFocused();
  await period.click();
  await expect(page.getByLabel("Reporting period", { exact: true })).toHaveValue("30");
  await page.getByLabel("Reporting period", { exact: true }).selectOption("7");
  await page.getByRole("button", { name: "Apply period" }).click();
  await expect(page.getByRole("button", { name: "Last 7 days", exact: true })).toBeVisible();
});

test("tabs, menu, tooltip, and toast support keyboard use", async ({ page }) => {
  await page.getByRole("tab", { name: "Traffic", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Journeys", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tabpanel")).toContainText("3,208");
  await page.getByRole("button", { name: "Report actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Archive report / unavailable" })).toHaveAttribute(
    "data-disabled",
  );
  await page.keyboard.press("Home");
  await expect(page.getByRole("menuitem", { name: "Duplicate report" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Export CSV" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot="toast"]')).toContainText("CSV export prepared");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.locator('[data-slot="toast"]')).not.toBeVisible();
  await page.getByRole("button", { name: "About unique visitors", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toContainText("Distinct visitors");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await page.getByRole("button", { name: "Show notification" }).click();
  await expect(page.locator('[data-slot="toast"]')).toContainText("Your traffic report is ready to share.");
  // The toast can appear beneath the pointer, which deliberately pauses its timer.
  await page.mouse.move(0, 0);
  await page.bringToFront();
  await expect(page.locator('[data-slot="toast"]')).not.toBeVisible({ timeout: 8000 });
});

test("mobile, light mode, and reduced motion retain usable controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of [
    '[data-slot="button"]',
    '[data-slot="input"]',
    '[data-slot="select"]',
    '[data-slot="checkbox"]',
    '[data-slot="radio-group-item"]',
    '[data-slot="switch"]',
  ]) {
    const targets = await page
      .locator(selector)
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(
      targets.every((height) => height >= 44),
      selector,
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Toggle theme" }).filter({ visible: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(242, 242, 238)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-slot="spinner"]').first()).toHaveCSS("animation-name", "none");
  await expect(page.locator('[data-slot="skeleton"]').first()).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Create funnel", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a funnel" });
  const bounds = await dialog.boundingBox();
  expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390).toBeTruthy();
  await page.keyboard.press("Escape");
});
