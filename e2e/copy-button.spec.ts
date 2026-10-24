import { expect, test } from "@playwright/test";

for (const animation of ["blur", "slide", "flip"]) {
  test(`${animation} copies with the keyboard, animates both slots, and resets`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/components/copy-button");
    const button = page.locator(`[data-slot="copy-button"][data-animation="${animation}"]`);
    await expect(button).toHaveAccessibleName("Copy");
    await expect(button).toHaveAttribute("data-size", "default");
    await expect(button).toHaveClass(/ui-button/);
    const width = (await button.boundingBox())?.width;
    expect(width).toBeLessThan(90);
    const neighbors = page.locator(`[data-slot="copy-button"]:not([data-animation="${animation}"])`);
    const positions = await neighbors.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { x, y } = button.getBoundingClientRect();
        return { x, y };
      }),
    );
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("data-state", "copied");
    await expect(button).toHaveAccessibleName("Copied");
    await expect(button).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Copied to clipboard." })).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("hello@a1ui.dev");
    await expect(button.locator("svg")).toHaveCount(1);
    await expect(button).toHaveText("Copied");
    expect(
      await neighbors.evaluateAll((buttons) =>
        buttons.map((button) => {
          const { x, y } = button.getBoundingClientRect();
          return { x, y };
        }),
      ),
    ).toEqual(positions);
    expect(
      await button
        .getByText("Copied", { exact: true })
        .evaluate((label) => label.scrollWidth <= label.clientWidth),
    ).toBe(true);
    expect((await button.boundingBox())?.width).toBeLessThan(100);
    await expect(button).toHaveAttribute("data-state", "idle", { timeout: 4000 });
    await expect(button).toHaveAccessibleName("Copy");
    await expect(button).toBeEnabled();
  });
}

test("failed clipboard writes show an error and allow retry", async ({ page }) => {
  await page.addInitScript(() => {
    let attempts = 0;
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () => (++attempts === 1 ? Promise.reject(new Error("Denied")) : Promise.resolve()),
      },
    });
  });
  await page.goto("/components/copy-button");
  const button = page.locator('[data-slot="copy-button"][data-animation="slide"]');
  await button.click();
  await expect(button).toHaveAttribute("data-state", "error");
  await expect(page.getByRole("status").filter({ hasText: "Couldn't copy. Try again." })).toBeVisible();
  await expect(button).toHaveAccessibleName("Copy");
  await button.click();
  await expect(button).toHaveAttribute("data-state", "copied");
});

for (const animation of ["blur", "slide", "flip"]) {
  test(`${animation} preserves the confirmation on mobile with reduced motion`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/components/copy-button");
    const button = page.locator(`[data-slot="copy-button"][data-animation="${animation}"]`);
    await button.click();
    await expect(button).toHaveText("Copied");
    await expect(button.locator("svg")).toHaveCount(1);
    await expect(button.locator('[aria-hidden="true"] > span').first()).toHaveCSS("transform", "none");
    await expect(button.getByText("Copied", { exact: true })).toHaveCSS("filter", "blur(0px)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("the components page links to the installable component", async ({ page, request }) => {
  await page.goto("/components");
  await page.getByRole("link", { name: "Copy Button documentation" }).click();
  await expect(page).toHaveURL(/\/components\/copy-button$/);
  await expect(page.locator('[data-slot="breadcrumb-page"]')).toHaveText("Copy Button");
  await expect(page.locator('[data-slot="copy-button"]')).toHaveCount(3);
  expect(
    await page
      .locator('[data-slot="copy-button"]')
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-animation"))),
  ).toEqual(["blur", "slide", "flip"]);
  const reference = page.getByRole("region", { name: "Reference table" });
  await expect(reference).toContainText("animation");
  await expect(reference).toContainText("duration");
  await expect(reference).toContainText('"blur" | "slide" | "flip"');
  const item = await (await request.get("/r/copy-button.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toContain("motion");
  expect(item.files[0].target).toBe("components/animated/copy-button.tsx");
  expect(item.files[0].content).toContain('from "motion/react"');
  const guide = await request.get("/docs/components/copy-button.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/copy-button");
});
