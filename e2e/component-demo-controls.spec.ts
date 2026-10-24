import { expect, test } from "@playwright/test";

test("demo dropdowns animate focus, support keyboard selection, and dismiss without changing the value", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/loading-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const trigger = page.getByRole("button", { name: /^Animation:/ });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "Animation", exact: true });
  await expect(menu.getByRole("menuitem", { name: "blur", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.keyboard.press("End");
  const flip = menu.getByRole("menuitem", { name: "flip", exact: true });
  await expect(flip).toBeFocused();
  await expect(flip.locator('[data-slot="dropdown-menu-highlight"]')).toHaveCount(1);
  const bounds = await menu.boundingBox();
  if (!bounds) throw new Error("Expected a visible dropdown");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAccessibleName("Animation: blur");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAccessibleName("Animation: flip");
  await expect(page.locator('.demo-frame [data-slot="loading-button"]')).toHaveAttribute(
    "data-animation",
    "flip",
  );
});

for (const component of ["copy-button", "loading-button", "confirm-button"]) {
  test(`${component} keeps one preview and resets it when controls change`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/components/${component}`);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const button = page.locator(`.demo-frame [data-slot="${component}"]`);
    await expect(page.locator(".component-demo-stage button")).toHaveCount(1);
    await page.getByRole("button", { name: /^Animation:/ }).click();
    await page.getByRole("menuitem", { name: "flip", exact: true }).click();
    await expect(button).toHaveAttribute("data-animation", "flip");

    const duration = page.getByRole("slider", { name: "Animation duration", exact: true });
    await duration.focus();
    await page.keyboard.press("Home");
    await expect(duration).toHaveValue("0");
    await expect(duration).toHaveAttribute("aria-valuetext", "0.0 seconds");

    if (component === "confirm-button") {
      const holdDuration = page.getByRole("slider", { name: "Hold duration", exact: true });
      await holdDuration.focus();
      await page.keyboard.press("Home");
      await expect(holdDuration).toHaveValue("0.5");
      await button.focus();
      await page.keyboard.down("Enter");
      await expect(button).toHaveAttribute("data-state", "confirmed", { timeout: 1200 });
      await page.keyboard.up("Enter");
    } else {
      await button.click();
      await expect(button).toHaveAttribute("data-state", component === "copy-button" ? "copied" : "success");
    }

    await page.getByRole("button", { name: /^Animation:/ }).click();
    await page.getByRole("menuitem", { name: "slide", exact: true }).click();
    await expect(button).toHaveAttribute("data-state", "idle");
    await expect(button).toHaveAttribute("data-animation", "slide");
    await expect(page.locator(".component-demo-stage button")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("changing the loading outcome clears error feedback and runs a successful request", async ({ page }) => {
  await page.goto("/components/loading-button");
  const outcome = page.getByRole("button", { name: /^Outcome:/ });
  const button = page.locator('.demo-frame [data-slot="loading-button"]');
  await outcome.click();
  await page.getByRole("menuitem", { name: "error", exact: true }).click();
  await button.click();
  await expect(button).toHaveAttribute("data-state", "error");
  await outcome.click();
  await page.getByRole("menuitem", { name: "success", exact: true }).click();
  await expect(button).toHaveAccessibleName("Submit");
  await button.click();
  await expect(button).toHaveAttribute("data-state", "success");
});
