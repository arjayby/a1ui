import { expect, test } from "@playwright/test";

test("select menu supports keyboard navigation, typeahead, and focus return", async ({ page }) => {
  await page.goto("/components/select-menu");
  const outside = (await page.getByRole("heading", { name: "Select Menu", exact: true }).boundingBox())!;
  const trigger = page.getByRole("combobox", { name: "Environment" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /Production/ })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: /Archived/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(trigger).toHaveText("Production");
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("option", { name: /Development/ })).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("s");
  await expect(page.getByRole("option", { name: /Staging/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("Staging");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  // The open listbox hides surrounding content from assistive technology.
  // Click its backdrop as a pointer user would instead of querying a hidden heading.
  await page.mouse.click(outside.x + 5, outside.y + 5);
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("option keycaps select an environment and return focus to the trigger", async ({ page }) => {
  await page.goto("/components/select-menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const trigger = page.getByRole("combobox", { name: "Environment" });
  await trigger.focus();
  await page.keyboard.press("2");
  await expect(trigger).toHaveText("Production");
  await page.keyboard.press("Enter");
  const staging = page.getByRole("option", { name: "Staging", exact: true });
  await expect(staging.locator("kbd")).toHaveText("2");
  await expect(staging).toHaveAttribute("aria-keyshortcuts", "2");
  await page.keyboard.press("4");
  await expect(trigger).toHaveText("Production");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  for (const [key, label] of [
    ["2", "Staging"],
    ["3", "Development"],
    ["1", "Production"],
  ]) {
    if (key !== "2") {
      await page.keyboard.press("Enter");
      await expect(page.getByRole("listbox")).toBeVisible();
    }
    await page.keyboard.press(key);
    await expect(trigger).toHaveText(label);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("registry serves the standalone selector", async ({ request }) => {
  const standalone = await (await request.get("/r/select-menu.json")).json();
  expect(standalone.dependencies).toContain("@base-ui/react@^1.8.0");
  expect(standalone.files[0].content).toContain("export function SelectMenu");
});
