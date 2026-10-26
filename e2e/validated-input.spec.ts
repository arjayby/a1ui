import { expect, test } from "@playwright/test";

test("validates the email on blur and submit", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/validated-input");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const input = frame.getByRole("textbox", { name: "Email" });
  const error = frame.locator('[data-slot="validated-input-error"]');
  const result = frame.locator('[data-slot="validated-input-demo-result"]');

  await frame.getByRole("button", { name: "Subscribe" }).click();
  await expect(error).toHaveText("Enter your email address.");
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(result).toHaveText("Nothing yet");

  await input.fill("ada@");
  await expect(error).toHaveText("Enter a valid email address.");
  await input.fill("ada@example.com");
  await expect(error).toHaveCount(0);
  await expect(input).not.toHaveAttribute("aria-invalid");
  await expect(frame.locator('[data-slot="validated-input-icon"]')).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(result).toHaveText("ada@example.com");
  expect(errors).toEqual([]);
});

test("waits until the field is left before showing an error", async ({ page }) => {
  await page.goto("/components/validated-input");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const input = frame.getByRole("textbox", { name: "Email" });
  await input.click();
  await page.keyboard.type("ada");
  await expect(frame.locator('[data-slot="validated-input-error"]')).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(frame.locator('[data-slot="validated-input-error"]')).toHaveText(
    "Enter a valid email address.",
  );
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/validated-input"]').click();
  await expect(page.getByRole("heading", { name: "Validated Input", exact: true })).toBeVisible();
  const item = await (await request.get("/r/validated-input.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toContain("zod");
  expect(item.registryDependencies).toEqual(["input", "label"]);
  expect(item.files[0].target).toBe("components/animated/validated-input.tsx");
  expect(item.files[0].content).toContain("export function ValidatedInput");
  const guide = await request.get("/docs/components/validated-input.md");
  expect(await guide.text()).toContain("@/components/animated/validated-input");
});
