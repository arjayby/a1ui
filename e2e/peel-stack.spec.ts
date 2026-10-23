import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/peel-stack");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("five cards support keyboard navigation without visible numbering or controls", async ({ page }) => {
  const stack = page.getByRole("region", { name: "Design studies" });
  const stage = stack.getByRole("group", { name: /^Stack cards/ });
  await expect(stack.locator("[data-peel-stack-card]")).toHaveCount(5);
  for (const card of await stack.locator("[data-peel-stack-card]").all()) {
    await expect(card).toHaveCSS("opacity", "1");
  }
  await expect(stack.getByRole("button")).toHaveCount(0);
  await expect(stack.getByRole("status")).toHaveClass("sr-only");
  await expect(stack.getByRole("status")).toHaveText("Form studies, 1 of 5");
  await stage.focus();
  await stage.press("ArrowLeft");
  await expect(stack.getByRole("status")).toHaveText("Motion sketches, 5 of 5");
  await stage.press("ArrowRight");
  await expect(stack.getByRole("status")).toHaveText("Form studies, 1 of 5");
  await stage.press("ArrowRight");
  await expect(stack.getByRole("status")).toHaveText("Material notes, 2 of 5");
  await expect(stack.getByRole("group", { name: "Material notes, 2 of 5", exact: true })).toBeVisible();
  await expect(stack.getByRole("group", { name: "Form studies, 1 of 5", exact: true })).toHaveCount(0);
  await stage.press("End");
  await expect(stack.getByRole("status")).toHaveText("Motion sketches, 5 of 5");
  await stage.press("Home");
  await expect(stack.getByRole("status")).toHaveText("Form studies, 1 of 5");
  await expect(page.locator(".demo-caption")).toHaveCSS("text-align", "center");
});

test("a horizontal drag cycles on release while taps keep the current card", async ({ page }) => {
  const stack = page.getByRole("region", { name: "Design studies" });
  const stage = stack.locator('[data-slot="peel-stack-viewport"]');
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.click(x, y);
  await expect(stack.getByRole("status")).toHaveText("Form studies, 1 of 5");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 80, y, { steps: 8 });
  await expect(stack.getByRole("status")).toHaveText("Form studies, 1 of 5");
  await page.mouse.up();
  await expect(stack.getByRole("status")).toHaveText("Material notes, 2 of 5");
});

test("swiping over text clears highlights and ordinary text selection still works", async ({ page }) => {
  const stack = page.getByRole("region", { name: "Design studies" });
  const stage = stack.locator('[data-slot="peel-stack-viewport"]');
  const title = stack.locator('[data-active="true"]').getByText("Form studies", { exact: true });
  await title.dblclick();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).not.toBe("");
  const bounds = (await title.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 80, y, { steps: 12 });
  await expect(stage).toHaveCSS("user-select", "none");
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await page.mouse.up();
  await expect(stage).not.toHaveAttribute("data-swiping");
  await expect(stage).toHaveCSS("user-select", "auto");
  await expect(stack.getByRole("status")).toHaveText("Material notes, 2 of 5");
  await stack.locator('[data-active="true"]').getByText("Material notes", { exact: true }).dblclick();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).not.toBe("");
});

test("cards fit a narrow screen in both themes and respect reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const stack = page.getByRole("region", { name: "Design studies" });
  for (const dark of [false, true]) {
    await page
      .locator("html")
      .evaluate((element, enabled) => element.classList.toggle("dark", enabled), dark);
    const bounds = (await stack.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    for (const card of await stack.locator("[data-peel-stack-card]").all()) {
      const cardBounds = (await card.boundingBox())!;
      expect(cardBounds.x).toBeGreaterThanOrEqual(bounds.x);
      expect(cardBounds.x + cardBounds.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(await card.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe("none");
    }
    const active = stack.locator('[data-active="true"]');
    expect(await active.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
    await stack.getByRole("group", { name: /^Stack cards/ }).press("ArrowRight");
  }
});

test("touch swipes cycle cards and canceled touches preserve selection", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/blocks/peel-stack");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const stack = page.getByRole("region", { name: "Design studies" });
  const stage = stack.locator('[data-slot="peel-stack-viewport"]');
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const session = await context.newCDPSession(page);
  for (const cancel of [true, false]) {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 80, y }] });
    await session.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
    await expect(stack.getByRole("status")).toHaveText(
      cancel ? "Form studies, 1 of 5" : "Material notes, 2 of 5",
    );
  }
  await context.close();
});

test("the catalog preview fits its card and links to the documentation", async ({ page }) => {
  await page.goto("/");
  const card = page
    .locator(".catalog-card")
    .filter({ has: page.getByRole("link", { name: "Peel Stack", exact: true }) });
  const preview = (await card.locator(".catalog-preview").boundingBox())!;
  const active = (await card.locator('[data-peel-stack-card][data-active="true"]').boundingBox())!;
  expect(active.x).toBeGreaterThan(preview.x);
  expect(active.y).toBeGreaterThan(preview.y);
  expect(active.x + active.width).toBeLessThan(preview.x + preview.width);
  expect(active.y + active.height).toBeLessThan(preview.y + preview.height);
  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/blocks\/peel-stack$/);
});
