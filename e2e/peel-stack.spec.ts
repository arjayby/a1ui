import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/peel-stack");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("buttons and keyboard cycle the stack and expose only the selected card", async ({ page }) => {
  const stack = page.getByRole("region", { name: "Design studies" });
  const stage = stack.getByRole("group", { name: /^Stack cards/ });
  await expect(stack.getByRole("status")).toHaveText("01 / 03Form studies");
  await stack.getByRole("button", { name: "Previous card" }).click();
  await expect(stack.getByRole("status")).toHaveText("03 / 03Field recordings");
  await stack.getByRole("button", { name: "Next card" }).click();
  await expect(stack.getByRole("status")).toHaveText("01 / 03Form studies");
  await stage.focus();
  await stage.press("ArrowRight");
  await expect(stack.getByRole("status")).toHaveText("02 / 03Material notes");
  await expect(stack.getByRole("group", { name: "Material notes, 2 of 3", exact: true })).toBeVisible();
  await expect(stack.getByRole("group", { name: "Form studies, 1 of 3", exact: true })).toHaveCount(0);
  await stage.press("End");
  await expect(stack.getByRole("status")).toHaveText("03 / 03Field recordings");
  await stage.press("Home");
  await expect(stack.getByRole("status")).toHaveText("01 / 03Form studies");
  await stage.press("Tab");
  await expect(stack.getByRole("button", { name: "Previous card" })).toBeFocused();
});

test("a horizontal drag cycles on release while taps keep the current card", async ({ page }) => {
  const stack = page.getByRole("region", { name: "Design studies" });
  const stage = stack.locator('[data-slot="peel-stack-viewport"]');
  await stage.scrollIntoViewIfNeeded();
  const bounds = (await stage.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.click(x, y);
  await expect(stack.getByRole("status")).toHaveText("01 / 03Form studies");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 80, y, { steps: 8 });
  await expect(stack.getByRole("status")).toHaveText("01 / 03Form studies");
  await page.mouse.up();
  await expect(stack.getByRole("status")).toHaveText("02 / 03Material notes");
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
    await stack.getByRole("button", { name: "Next card" }).click();
  }
});

test("touch swipes cycle cards and canceled touches preserve selection", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/components/peel-stack");
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
      cancel ? "01 / 03Form studies" : "02 / 03Material notes",
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
  await expect(page).toHaveURL(/\/components\/peel-stack$/);
});
