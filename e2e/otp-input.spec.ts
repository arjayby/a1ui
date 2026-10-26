import { expect, test } from "@playwright/test";

test("types, pastes, and switches length and characters", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/otp-input");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const input = page.locator(".demo-frame").getByRole("textbox", { name: "Verification code" });
  const slots = page.locator('.demo-frame [data-slot="otp-input-slot"]');
  await expect(slots).toHaveCount(6);
  await input.click();
  await expect(slots.nth(0)).toHaveAttribute("data-active", "true");
  await page.keyboard.type("12a3");
  await expect(input).toHaveValue("123");
  await expect(slots.nth(3)).toHaveAttribute("data-active", "true");
  await page.keyboard.press("Backspace");
  await expect(input).toHaveValue("12");
  await page.keyboard.type("3457");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("6");
  await expect(page.locator('.demo-frame [data-slot="otp-input"]')).toHaveAttribute("data-success", "true");
  await expect(input).toBeFocused();
  await expect(input).not.toHaveAttribute("aria-invalid");
  await expect(page.locator('.demo-frame [data-slot="otp-input-highlight"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Length: 6" }).click();
  await page.getByRole("menuitem", { name: "8", exact: true }).click();
  await page.getByRole("button", { name: "Characters: numeric" }).click();
  await page.getByRole("menuitem", { name: "alphanumeric", exact: true }).click();
  await expect(slots).toHaveCount(8);
  await expect(page.locator('.demo-frame [data-slot="otp-demo-answer"]')).toHaveText("A1B2C3D4");
  await input.fill("ab-12 cd34");
  await expect(input).toHaveValue("AB12CD34");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  expect(errors).toEqual([]);
});

test("fits a phone viewport", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/components/otp-input");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Length: 6" }).click();
  await page.getByRole("menuitem", { name: "8", exact: true }).click();
  await expect(page.locator('.demo-frame [data-slot="otp-input-slot"]')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/otp-input"]').click();
  await expect(page.getByRole("heading", { name: "OTP Input", exact: true })).toBeVisible();
  const item = await (await request.get("/r/otp-input.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/otp-input.tsx");
  expect(item.files[0].content).toContain("export function OtpInput");
  const guide = await request.get("/docs/components/otp-input.md");
  expect(await guide.text()).toContain("@/components/animated/otp-input");
});
