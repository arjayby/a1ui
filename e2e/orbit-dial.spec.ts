import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/orbit-dial");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page).toHaveTitle("Orbit Dial | a1ui");
});

test("keyboard, slider, and demo reset update the same value", async ({ page }) => {
  const slider = page.getByRole("slider", { name: "Texture intensity" });
  await expect(slider).toHaveValue("64");
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("65");
  await expect(slider).toHaveAttribute("aria-valuetext", "65 percent");
  await expect(page.locator("[data-orbit-dial-value]")).toHaveText("65");
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  await slider.press("ArrowDown");
  await expect(slider).toHaveValue("0");
  await slider.press("End");
  await expect(slider).toHaveValue("100");
  await slider.press("ArrowLeft");
  await expect(slider).toHaveValue("99");
  await page.getByRole("button", { name: "Reset to 64%" }).click();
  await expect(slider).toHaveValue("64");
});

test("pointer dragging stops at the arc gap and can return", async ({ page }) => {
  const dial = page.locator("[data-orbit-dial-face]");
  await dial.scrollIntoViewIfNeeded();
  const bounds = (await dial.boundingBox())!;
  const point = (degrees: number) => ({
    x: bounds.x + bounds.width / 2 + Math.sin((degrees * Math.PI) / 180) * bounds.width * 0.4,
    y: bounds.y + bounds.height / 2 - Math.cos((degrees * Math.PI) / 180) * bounds.height * 0.4,
  });
  const slider = page.getByRole("slider", { name: "Texture intensity" });
  await page.mouse.move(point(130).x, point(130).y);
  await page.mouse.down();
  for (const degrees of [140, 160, 179, -179, -160]) {
    await page.mouse.move(point(degrees).x, point(degrees).y);
    await expect(slider).toHaveValue("100");
  }
  for (const degrees of [-179, 160, 120, 60, 0]) {
    await page.mouse.move(point(degrees).x, point(degrees).y);
  }
  await expect(slider).toHaveValue("50");
  await page.mouse.up();
  await expect(slider).toBeFocused();
  await expect(dial).not.toHaveAttribute("data-dragging");
});

test("the dial stays usable on a narrow screen with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const slider = page.getByRole("slider", { name: "Texture intensity" });
  await slider.scrollIntoViewIfNeeded();
  const bounds = (await slider.boundingBox())!;
  await slider.click({ position: { x: bounds.width * 0.5, y: bounds.height / 2 } });
  await expect(slider).toHaveValue("50");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the registry delivers a self-contained component", async ({ request }) => {
  const response = await request.get("/r/orbit-dial.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.name).toBe("orbit-dial");
  expect(item.dependencies).toContain("clsx");
  expect(item.files[0].path).toBe("src/registry/orbit-dial.tsx");
  expect(item.files[0].content).toContain("export function OrbitDial");
});

test("the catalog contains the complete dial and slider", async ({ page }) => {
  await page.goto("/");
  const dial = page.locator(".catalog-preview [data-orbit-dial]");
  await dial.scrollIntoViewIfNeeded();
  const preview = page.locator(".catalog-preview").filter({ has: page.locator("[data-orbit-dial]") });
  const dialBounds = (await dial.boundingBox())!;
  const previewBounds = (await preview.boundingBox())!;
  expect(dialBounds.y).toBeGreaterThanOrEqual(previewBounds.y);
  expect(dialBounds.y + dialBounds.height).toBeLessThanOrEqual(previewBounds.y + previewBounds.height);
  expect(dialBounds.x).toBeGreaterThanOrEqual(previewBounds.x);
  expect(dialBounds.x + dialBounds.width).toBeLessThanOrEqual(previewBounds.x + previewBounds.width);
});
