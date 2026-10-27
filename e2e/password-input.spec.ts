import { expect, test } from "@playwright/test";

test("rates the password, marks unmet rules on submit, and toggles visibility", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/password-input");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const input = frame.getByLabel("Password", { exact: true });
  const root = frame.locator('[data-slot="password-input"]');
  const meter = frame.getByRole("button", { name: "Password requirements" });
  // The popup is portaled out of the demo frame.
  const popover = page.locator('[data-slot="password-input-popover"]');
  const rules = popover.locator('[data-slot="password-input-rule"]');

  await input.click();
  await page.keyboard.type("graphite");
  await expect(root).toHaveAttribute("data-strength", "weak");
  await expect(popover).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(popover).toBeVisible();
  await expect(rules.filter({ hasText: "A number" })).not.toHaveAttribute("data-met");
  await expect(input).toBeFocused();

  await input.fill("Graphite7!");
  await expect(root).toHaveAttribute("data-strength", "strong");
  await expect(input).not.toHaveAttribute("aria-invalid");
  await expect(popover.locator('[data-slot="password-input-strength"]')).toHaveText("Strong");

  await frame.getByRole("button", { name: "Show password" }).click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(input).toBeFocused();

  await page.getByRole("button", { name: "Min length: 8" }).click();
  await page.getByRole("menuitem", { name: "12", exact: true }).click();
  await meter.hover();
  await expect(popover).toBeVisible();
  await expect(rules.first()).toHaveText(/At least 12 characters/);
  await expect(root).toHaveAttribute("data-strength", "good");
  expect(errors).toEqual([]);
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/password-input"]').click();
  await expect(page.getByRole("heading", { name: "Password Input", exact: true })).toBeVisible();
  const item = await (await request.get("/r/password-input.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.registryDependencies).toEqual(["input", "label"]);
  expect(item.files[0].target).toBe("components/animated/password-input.tsx");
  expect(item.files[0].content).toContain("export function PasswordInput");
  const guide = await request.get("/docs/components/password-input.md");
  expect(await guide.text()).toContain("@/components/animated/password-input");
});
