import { expect, test } from "@playwright/test";

for (const animation of ["blur", "slide", "flip"]) {
  test(`${animation} waits for an async action, confirms, and resets`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/components/loading-button");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const button = page.locator(
      `[data-outcome="success"] [data-slot="loading-button"][data-animation="${animation}"]`,
    );
    await expect(button).toHaveAccessibleName("Submit");
    await expect(button).toHaveClass(/ui-button/);
    await expect(button.locator("svg")).toHaveCount(0);
    await expect(button.locator('[aria-hidden="true"]')).toHaveCount(1);
    const idleColor = await button.evaluate((element) => getComputedStyle(element).color);
    const idleBackground = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("data-state", "loading");
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toHaveAccessibleName("Submitting");
    await expect(button).toBeDisabled();
    await expect(button.locator("svg")).toHaveCount(1);
    await expect(button.locator("svg")).toHaveCSS("animation-name", "spin");
    await expect(button).toHaveAttribute("data-state", "success");
    await expect(button).toHaveAttribute("aria-busy", "false");
    await expect(button).toHaveText("Submitted");
    await expect(button).toHaveCSS("color", "rgb(166, 185, 139)");
    await expect(button).toHaveCSS("background-color", idleBackground);
    await expect(button).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Submitted" })).toBeAttached();
    await expect(button).toHaveAttribute("data-state", "idle");
    await expect(button).toHaveText("Submit");
    await expect(button).toBeEnabled();
    await expect(button).toHaveCSS("color", idleColor);
    await expect(button.locator("svg")).toHaveCount(0);
    await expect(button.locator('[aria-hidden="true"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test("the error example shows red feedback inside the button and allows retry without resizing", async ({
  page,
}) => {
  await page.goto("/components/loading-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const example = page.locator('[data-outcome="error"]');
  const button = example.getByRole("button");
  const initial = await button.boundingBox();
  const background = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAccessibleName("Submitting");
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("data-state", "error");
  await expect(button).toHaveAccessibleName("Try again");
  await expect(button).toHaveText("Try again");
  await expect(button).toHaveCSS("color", "rgb(213, 138, 128)");
  await expect(button).toHaveCSS("background-color", background);
  await expect(button).toBeEnabled();
  await expect(button.locator("svg")).toHaveCount(0);
  await expect(example.getByRole("status")).toHaveClass("sr-only");
  expect(await button.boundingBox()).toEqual(initial);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("data-state", "loading");
  await expect(button).toHaveAttribute("data-state", "error");
});

test("the button stays fixed through loading, success, and reset while animating its content", async ({
  page,
}) => {
  await page.goto("/components/loading-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const button = page.locator('[data-outcome="success"] [data-slot="loading-button"][data-animation="blur"]');
  const samples = await button.evaluate(async (element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected a button");
    const widths = [];
    let iconAnimated = false;
    let labelAnimated = false;
    const initial = element.getBoundingClientRect();
    const started = performance.now();
    element.click();
    while (performance.now() - started < 4300) {
      widths.push(element.getBoundingClientRect().width);
      const [icon, label] = element.querySelectorAll('[aria-hidden="true"] > span');
      iconAnimated ||= Boolean(icon && getComputedStyle(icon).filter !== "blur(0px)");
      labelAnimated ||= Boolean(label && getComputedStyle(label).filter !== "blur(0px)");
      await new Promise(requestAnimationFrame);
    }
    return { widths, initialWidth: initial.width, iconAnimated, labelAnimated };
  });
  expect(samples.widths.every((width) => Math.abs(width - samples.initialWidth) < 0.1)).toBe(true);
  await expect(button).toHaveAttribute("data-state", "idle");
  expect(samples.iconAnimated).toBe(true);
  expect(samples.labelAnimated).toBe(true);
});

test("reduced motion preserves loading feedback on mobile without spinning", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/loading-button");
  const button = page.locator('[data-slot="loading-button"][data-animation="flip"]');
  await button.click();
  await expect(button).toHaveText("Submitting");
  await expect(button.locator("svg")).toHaveCount(1);
  await expect(button.locator("svg")).toHaveCSS("animation-name", "none");
  await expect(button.locator('[aria-hidden="true"] > span').first()).toHaveCSS("transform", "none");
  await expect(button).toHaveText("Submitted");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("the library links to an installable loading button with documentation", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/loading-button"]').click();
  await expect(page).toHaveURL(/\/components\/loading-button$/);
  await expect(page.locator('[data-slot="breadcrumb-page"]')).toHaveText("Loading Button");
  await expect(
    page
      .getByRole("navigation", { name: "Library" })
      .getByRole("link", { name: "Loading Button", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator('[data-slot="loading-button"]')).toHaveCount(4);
  await expect(page.getByRole("region", { name: "Reference table" })).toContainText("onClick");
  const item = await (await request.get("/r/loading-button.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toContain("motion");
  expect(item.registryDependencies).toContain("button");
  expect(item.files[0].target).toBe("components/animated/loading-button.tsx");
  expect(item.files[0].content).toContain("export function LoadingButton");
  const guide = await request.get("/docs/components/loading-button.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("if (!response.ok)");
});
