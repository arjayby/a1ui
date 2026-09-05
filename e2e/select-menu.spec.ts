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

test("menus stay within narrow viewports and can extend outside the swap card", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/components/multichain-swap");
  const trigger = page.getByRole("combobox", { name: "Slippage" });
  await trigger.click();
  const listbox = page.getByRole("listbox", { name: "Slippage" });
  await expect(listbox).toBeVisible();
  const bounds = (await listbox.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(740);
  expect(await listbox.evaluate((element) => element.closest("form"))).toBeNull();
  await page.getByRole("option", { name: "0.1%", exact: true }).click();
  await expect(trigger).toHaveText("0.1%");
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

test("selector installs alone and is also included with the swap", async ({ request }) => {
  const standalone = await (await request.get("/r/select-menu.json")).json();
  const swap = await (await request.get("/r/multichain-swap.json")).json();
  expect(standalone.files[0].content).toContain("export function SelectMenu");
  expect(swap.files.find((file: { path: string }) => file.path.endsWith("/select-menu.tsx")).content).toBe(
    standalone.files[0].content,
  );
});
