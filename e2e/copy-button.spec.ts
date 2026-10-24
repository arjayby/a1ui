import { expect, test } from "@playwright/test";

test("button width and position stay fixed while copying and resetting", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/components/copy-button");
  const button = page.locator('.demo-frame [data-slot="copy-button"][data-animation="blur"]');
  const samples = await button.evaluate(async (element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected a button");
    const widths = [];
    const started = performance.now();
    let copied = false;
    element.click();
    while (performance.now() - started < 5000) {
      const state = element.dataset.state;
      const { x, y, width, height } = element.getBoundingClientRect();
      widths.push({ state, x, y, width, height });
      if (state === "copied") copied = true;
      if (copied && state === "idle" && performance.now() - started > 2600) break;
      await new Promise(requestAnimationFrame);
    }
    return widths;
  });
  const initial = samples[0];
  expect(samples.some(({ state }) => state === "copied")).toBe(true);
  expect(samples.at(-1)?.state).toBe("idle");
  for (const sample of samples) {
    expect(sample.width).toBeCloseTo(initial.width, 1);
    expect(sample.height).toBeCloseTo(initial.height, 1);
    expect(sample.x).toBeCloseTo(initial.x, 1);
    expect(sample.y).toBeCloseTo(initial.y, 1);
  }
});

for (const animation of ["blur", "slide", "flip"]) {
  test(`${animation} copies with the keyboard, animates both slots, and resets`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/components/copy-button");
    await page.getByRole("combobox", { name: "Animation", exact: true }).selectOption(animation);
    const button = page.locator(`.demo-frame [data-slot="copy-button"][data-animation="${animation}"]`);
    await expect(button).toHaveAccessibleName("Copy");
    await expect(button).toHaveCSS("font-family", "Inter, sans-serif");
    await expect(button).toHaveAttribute("data-size", "default");
    await expect(button).toHaveClass(/ui-button/);
    const width = (await button.boundingBox())?.width;
    expect(width).toBeLessThan(100);
    await expect(page.locator('.demo-frame [data-slot="copy-button"]')).toHaveCount(1);
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
      await button
        .getByText("Copied", { exact: true })
        .evaluate((label) => label.scrollWidth <= label.clientWidth),
    ).toBe(true);
    expect((await button.boundingBox())?.width).toBe(width);
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
  await page.getByRole("combobox", { name: "Animation", exact: true }).selectOption("slide");
  const button = page.locator('.demo-frame [data-slot="copy-button"][data-animation="slide"]');
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
    await page.getByRole("combobox", { name: "Animation", exact: true }).selectOption(animation);
    const button = page.locator(`.demo-frame [data-slot="copy-button"][data-animation="${animation}"]`);
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
  await page.locator('.catalog-card-link[href="/components/copy-button"]').click();
  await expect(page).toHaveURL(/\/components\/copy-button$/);
  await expect(page.locator('[data-slot="breadcrumb-page"]')).toHaveText("Copy Button");
  await expect(page.locator('.demo-frame [data-slot="copy-button"]')).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "Animation", exact: true })).toHaveValue("blur");
  await expect(page.getByRole("slider", { name: "Animation duration", exact: true })).toHaveValue("0.3");
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
