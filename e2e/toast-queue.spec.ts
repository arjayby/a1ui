import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/toast-queue");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("new and dismissed toasts animate, while the queue keeps three active messages", async ({ page }) => {
  const queue = page.locator('[data-slot="toast-queue"]');
  const items = queue.locator('[data-slot="toast-queue-item"]');
  await expect(items).toHaveCount(2);
  await page.getByRole("button", { name: "Trigger event +" }).click();
  await expect(items.first()).toHaveAttribute("data-state", "open");
  await expect(items.first()).toHaveCSS("animation-name", "a1ui-toast-queue-in");
  await page.getByRole("button", { name: "Trigger event +" }).click();
  await expect(items.filter({ hasText: "Preview published" }).last()).toHaveAttribute(
    "data-state",
    "exiting",
  );
  await expect(items).toHaveCount(3);
  await queue.getByRole("button", { name: "Dismiss Component copied" }).first().click();
  await expect(items.filter({ hasText: "Component copied" }).first()).toHaveAttribute(
    "data-state",
    "exiting",
  );
  await expect(items.filter({ hasText: "Component copied" })).toHaveCount(1);
});

test("reduced motion removes a dismissed toast without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const queue = page.locator('[data-slot="toast-queue"]');
  const item = queue.locator('[data-slot="toast-queue-item"]').first();
  await expect(item).toHaveCSS("animation-name", "none");
  await item.getByRole("button").click();
  await expect(queue.locator('[data-slot="toast-queue-item"]')).toHaveCount(1);
});
