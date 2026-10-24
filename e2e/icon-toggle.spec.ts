import { expect, test } from "@playwright/test";

test("morphs persistent paths in both directions and handles interruption", async ({ page }) => {
  await page.goto("/components/icon-toggle");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const button = page.locator('.demo-frame [data-slot="icon-toggle"]');
  const result = await button.evaluate(async (element) => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected a button");
    const path = element.querySelector("path");
    if (!path) throw new Error("Expected a path");
    const off = path.getAttribute("d");
    const bounds = element.getBoundingClientRect();
    element.click();
    const samples = [];
    const start = performance.now();
    while (performance.now() - start < 180) {
      samples.push(path.getAttribute("d"));
      await new Promise(requestAnimationFrame);
    }
    element.click();
    return { off, samples, bounds: { width: bounds.width, height: bounds.height } };
  });
  expect(result.samples.some((d) => d !== result.off && !d?.startsWith("M21.3647 13.8647 C"))).toBe(true);
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button.locator("path").first()).toHaveAttribute("d", /^M17\.25 12 C/);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button.locator("path").first()).toHaveAttribute("d", /^M21\.3647 13\.8647 C/);
  await page.keyboard.press("Space");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button.locator("path").first()).toHaveAttribute("d", /^M17\.25 12 C/);
  expect((await button.boundingBox())?.width).toBe(result.bounds.width);
  expect((await button.boundingBox())?.height).toBe(result.bounds.height);
  await expect(button.locator("svg")).toHaveCount(1);
});

test("all icon pairs reverse on mobile with reduced motion and controls reset the preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/icon-toggle");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const button = page.locator('.demo-frame [data-slot="icon-toggle"]');
  for (const { icons, off, on, first } of [
    { icons: "sun / moon", off: /^M17\.25 12 C/, on: /^M21\.3647 13\.8647 C/, first: true },
    { icons: "menu / close", off: /^M4 6 L20 6$/, on: /^M6 6 L18 18$/, first: true },
    { icons: "play / pause", off: /^M8 5 L18 12 L8 19$/, on: /^M16 5 L16 12 L16 19$/, first: false },
    { icons: "plus / minus", off: /^M12 5 L12 19$/, on: /^M5 12 L19 12$/, first: false },
  ]) {
    await page.getByRole("combobox", { name: "Icons", exact: true }).selectOption(icons);
    const path = first ? button.locator("path").first() : button.locator("path").last();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(path).toHaveAttribute("d", off);
    await button.click();
    await expect(path).toHaveAttribute("d", on, { timeout: 150 });
    await button.click();
    await expect(path).toHaveAttribute("d", off, { timeout: 150 });
  }
  await button.click();
  const duration = page.getByRole("slider", { name: "Animation duration", exact: true });
  await duration.focus();
  await page.keyboard.press("Home");
  await expect(duration).toHaveValue("0");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".demo-frame button")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the icon toggle", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/icon-toggle"]').click();
  await expect(page.getByRole("heading", { name: "Icon Toggle", exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="breadcrumb-page"]')).toHaveText("Icon Toggle");
  await expect(page.getByRole("slider", { name: "Animation duration", exact: true })).toHaveValue("0.3");
  const item = await (await request.get("/r/icon-toggle.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toContain("motion");
  expect(item.registryDependencies).toContain("button");
  expect(item.files[0].target).toBe("components/animated/icon-toggle.tsx");
  expect(item.files[0].content).toContain("export function IconToggle");
  const guide = await request.get("/docs/components/icon-toggle.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/icon-toggle");
});
