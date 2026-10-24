import { expect, test } from "@playwright/test";

test("button width expands and contracts smoothly", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/components/copy-button");
  const button = page.locator('[data-slot="copy-button"][data-animation="blur"]');
  const samples = await button.evaluate(async (element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected a button");
    const widths = [];
    const started = performance.now();
    let copied = false;
    const initialWidth = element.getBoundingClientRect().width;
    element.click();
    while (performance.now() - started < 5000) {
      const state = element.dataset.state;
      const width = element.getBoundingClientRect().width;
      widths.push({ state, width });
      if (state === "copied") copied = true;
      if (copied && state === "idle" && Math.abs(width - initialWidth) < 0.1) break;
      await new Promise(requestAnimationFrame);
    }
    return widths;
  });
  const initialWidth = samples[0].width;
  const finalWidth = Math.max(...samples.map(({ width }) => width));
  const intermediate = ({ width }: { width: number }) => width > initialWidth + 1 && width < finalWidth - 1;
  expect(finalWidth).toBeGreaterThan(initialWidth + 10);
  expect(samples.some((sample) => sample.state === "copied" && intermediate(sample))).toBe(true);
  const afterCopy = samples.slice(samples.findIndex(({ state }) => state === "copied"));
  expect(afterCopy.some((sample) => sample.state === "idle" && intermediate(sample))).toBe(true);
  expect(samples.at(-1)?.width).toBeCloseTo(initialWidth, 0);
});

for (const animation of ["blur", "slide", "flip"]) {
  test(`${animation} copies with the keyboard, animates both slots, and resets`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/components/copy-button");
    const button = page.locator(`[data-slot="copy-button"][data-animation="${animation}"]`);
    await expect(button).toHaveAccessibleName("Copy");
    await expect(button).toHaveCSS("font-family", "Inter, sans-serif");
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
  await page.locator('.catalog-card-link[href="/components/copy-button"]').click();
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
