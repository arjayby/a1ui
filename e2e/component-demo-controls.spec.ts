import { expect, test } from "@playwright/test";

for (const component of ["copy-button", "loading-button", "confirm-button"]) {
  test(`${component} keeps one preview and resets it when controls change`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/components/${component}`);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const button = page.locator(`.demo-frame [data-slot="${component}"]`);
    await expect(page.locator(".demo-frame button")).toHaveCount(1);
    await page.getByRole("combobox", { name: "Animation", exact: true }).selectOption("flip");
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

    await page.getByRole("combobox", { name: "Animation", exact: true }).selectOption("slide");
    await expect(button).toHaveAttribute("data-state", "idle");
    await expect(button).toHaveAttribute("data-animation", "slide");
    await expect(page.locator(".demo-frame button")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("changing the loading outcome clears error feedback and runs a successful request", async ({ page }) => {
  await page.goto("/components/loading-button");
  const outcome = page.getByRole("combobox", { name: "Outcome", exact: true });
  const button = page.locator('.demo-frame [data-slot="loading-button"]');
  await outcome.selectOption("error");
  await button.click();
  await expect(button).toHaveAttribute("data-state", "error");
  await outcome.selectOption("success");
  await expect(button).toHaveAccessibleName("Submit");
  await button.click();
  await expect(button).toHaveAttribute("data-state", "success");
});
