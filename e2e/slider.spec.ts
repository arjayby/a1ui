import { expect, test } from "@playwright/test";

test("catches stops in both directions, releases them, and allows precise keyboard input", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/slider");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const slider = page.getByRole("slider", { name: "Intensity" });
  const stopLabels = page.locator('.demo-frame [data-slot="slider-stop-labels"]');
  await expect(stopLabels).toHaveCount(0);
  await page.getByRole("switch", { name: "Stop labels" }).check();
  await expect(stopLabels).toHaveText("0255075100");
  await page.getByRole("switch", { name: "Stop labels" }).uncheck();
  await expect(stopLabels).toHaveCount(0);
  const control = page.locator('.demo-frame [data-slot="slider-control"]');
  const bounds = await control.boundingBox();
  if (!bounds) throw new Error("Expected slider control");
  const move = (value: number) =>
    page.mouse.move(bounds.x + (bounds.width * value) / 100, bounds.y + bounds.height / 2);
  await move(50);
  await page.mouse.down();
  for (const [pointer, selected] of [
    [43, 43],
    [47, 50],
    [51, 50],
    [54, 54],
    [75, 75],
    [110, 100],
    [43, 43],
    [53, 50],
    [47, 50],
    [46, 46],
    [-10, 0],
  ]) {
    await move(pointer);
    await expect(slider).toHaveAttribute("aria-valuenow", String(selected));
  }
  await page.mouse.up();
  await slider.focus();
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "100");
  await page.keyboard.press("Home");
  await page.keyboard.press("PageUp");
  await expect(slider).toHaveAttribute("aria-valuenow", "10");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "11");
  await page.getByRole("button", { name: "Catch: medium" }).click();
  await page.getByRole("menuitem", { name: "firm", exact: true }).click();
  await control.click({ position: { x: bounds.width * 0.45, y: bounds.height / 2 } });
  await expect(slider).toHaveAttribute("aria-valuenow", "50");
  await expect(page.locator('.demo-frame [data-slot="slider-stop"][data-active]')).toHaveCount(1);
  await page.getByRole("button", { name: "Stops: quarters" }).click();
  await page.getByRole("menuitem", { name: "uneven", exact: true }).click();
  await expect(page.locator('.demo-frame [data-slot="slider-stop"]')).toHaveCount(5);
  await expect(page.locator('.demo-frame [data-slot="slider-stop"]').nth(1)).toHaveAttribute("style", /15%/);
  expect(errors).toEqual([]);
});

test("touch catches stops on mobile with reduced motion", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/components/slider");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const control = page.locator('.demo-frame [data-slot="slider-control"]');
  await control.scrollIntoViewIfNeeded();
  const bounds = await control.boundingBox();
  if (!bounds) throw new Error("Expected slider control");
  const client = await context.newCDPSession(page);
  const point = (value: number) => ({
    x: bounds.x + (bounds.width * value) / 100,
    y: bounds.y + bounds.height / 2,
  });
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(50)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(20)] });
  await expect(page.getByRole("slider", { name: "Intensity" })).toHaveAttribute("aria-valuenow", "20");
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(27)] });
  await expect(page.getByRole("slider", { name: "Intensity" })).toHaveAttribute("aria-valuenow", "25");
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator('.demo-frame [data-slot="slider-knob"]')).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/slider"]').click();
  await expect(page.getByRole("heading", { name: "Slider", exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="breadcrumb-page"]')).toHaveText("Slider");
  const item = await (await request.get("/r/slider.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/slider.tsx");
  expect(item.files[0].content).toContain("export function Slider");
  const guide = await request.get("/docs/components/slider.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/slider");
});
