import { expect, test } from "@playwright/test";

test("validates the email on submit without shifting the layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/validated-input");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const input = frame.getByRole("textbox", { name: "Email" });
  const error = frame.locator('[data-slot="validated-input-error"]');
  const field = frame.locator('[data-slot="validated-input"]');

  // Measure from the stage, since focusing may scroll the page.
  const layout = () =>
    field.evaluate((element) => {
      const stage = element.closest(".component-demo-stage")!.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return { y: box.y - stage.y, height: box.height, stage: stage.height };
    });
  const before = await layout();
  await input.focus();
  await page.keyboard.press("Enter");
  await expect(error).toHaveText("Enter your email address.");
  await expect(frame.locator('[data-slot="validated-input-description"]')).toHaveCSS("opacity", "0");
  expect(await layout()).toEqual(before);
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");

  await input.fill("ada@");
  await expect(error).toHaveText("Enter a valid email address.");
  await input.fill("ada@example.com");
  await expect(error).toHaveCount(0);
  await expect(input).not.toHaveAttribute("aria-invalid");
  await expect(frame.locator('[data-slot="validated-input-icon"]')).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(error).toHaveCount(0);
  await expect(frame.locator('[data-slot="validated-input-description"]')).toHaveCSS("opacity", "1");
  expect(await layout()).toEqual(before);
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
