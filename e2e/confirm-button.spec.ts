import { expect, test } from "@playwright/test";

test("reset keeps the outgoing and incoming labels steady while the check exits", async ({ page }) => {
  await page.goto("/components/confirm-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const button = page.locator('.demo-frame [data-direction="right"]');
  await button.focus();
  await page.keyboard.down("Enter");
  await expect(button).toHaveText("Confirmed");
  await page.keyboard.up("Enter");
  const positions = await button.evaluate(async (element) => {
    const confirmed: number[] = [];
    const idle: number[] = [];
    const started = performance.now();
    while (performance.now() - started < 2500) {
      for (const label of element.querySelectorAll('[data-slot="confirm-button-label"] > span')) {
        if (Number(getComputedStyle(label).opacity) <= 0) continue;
        const x = label.getBoundingClientRect().x;
        if (label.textContent === "Confirmed") confirmed.push(x);
        if (label.textContent === "Hold to confirm") idle.push(x);
      }
      await new Promise(requestAnimationFrame);
    }
    return { confirmed, idle };
  });
  for (const samples of [positions.confirmed, positions.idle]) {
    expect(samples.length).toBeGreaterThan(3);
    expect(Math.max(...samples) - Math.min(...samples)).toBeLessThan(0.5);
  }
});

test("the label and success check animate with blur without resizing the button", async ({ page }) => {
  await page.goto("/components/confirm-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const button = page.locator('.demo-frame [data-direction="right"]');
  await expect(button.locator("svg")).toHaveCount(0);
  await button.focus();
  await page.keyboard.down("Enter");
  const samples = await button.evaluate(async (element) => {
    const initialWidth = element.getBoundingClientRect().width;
    let stableWidth = true;
    let labelAnimated = false;
    let iconAnimated = false;
    const started = performance.now();
    while (performance.now() - started < 1800) {
      stableWidth &&= Math.abs(element.getBoundingClientRect().width - initialWidth) < 0.1;
      for (const label of element.querySelectorAll('[data-slot="confirm-button-label"] > span')) {
        labelAnimated ||= !["none", "blur(0px)"].includes(getComputedStyle(label).filter);
      }
      const icon = element.querySelector('[data-slot="confirm-button-icon"]');
      iconAnimated ||= Boolean(icon && !["none", "blur(0px)"].includes(getComputedStyle(icon).filter));
      await new Promise(requestAnimationFrame);
    }
    return { stableWidth, labelAnimated, iconAnimated };
  });
  await page.keyboard.up("Enter");
  expect(samples).toEqual({ stableWidth: true, labelAnimated: true, iconAnimated: true });
  await expect(button).toHaveText("Confirmed");
  await expect(button.locator('[data-slot="confirm-button-icon"] svg')).toHaveCount(1);
  await expect(button.locator('[data-slot="confirm-button-icon"]')).toHaveCSS("color", "rgb(166, 185, 139)");
  await expect(button).toHaveText("Hold to confirm");
  await expect(button.locator("svg")).toHaveCount(0);
});

for (const direction of ["right", "up", "left", "down"]) {
  test(`${direction} fills during a hold, cancels early, and confirms once at the end`, async ({ page }) => {
    await page.goto("/components/confirm-button");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.clock.install();
    const button = page.locator(`.demo-frame [data-direction="${direction}"]`);
    const fill = button.locator('[data-slot="confirm-button-fill"]');
    const label = button.locator('[data-slot="confirm-button-label"]').last();
    await button.hover();
    const idleStyles = await button.evaluate((element) => ({
      color: getComputedStyle(element).color,
    }));
    await page.mouse.down();
    await page.clock.runFor(750);
    await expect(button).toHaveAttribute("data-state", "holding");
    await expect(button).toHaveText("Keep holding");
    const holdingBackground = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
    await expect(fill).toHaveCSS("background-color", idleStyles.color);
    await expect(fill).toBeVisible();
    const progress = await fill.evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return { x: matrix.a, y: matrix.d, origin: getComputedStyle(element).transformOrigin };
    });
    const vertical = direction === "up" || direction === "down";
    expect(vertical ? progress.y : progress.x).toBeGreaterThan(0.4);
    expect(vertical ? progress.y : progress.x).toBeLessThan(0.6);
    const box = await button.boundingBox();
    if (!box) throw new Error("Expected visible button");
    const [originX, originY] = progress.origin.split(" ").map(parseFloat);
    if (direction === "right") expect(originX).toBe(0);
    if (direction === "left") expect(originX).toBeCloseTo(box.width - 2, 0);
    if (direction === "down") expect(originY).toBe(0);
    if (direction === "up") expect(originY).toBeCloseTo(box.height - 2, 0);
    await page.mouse.up();
    await page.clock.runFor(2000);
    await expect(button).toHaveAttribute("data-state", "idle");
    await expect(fill).toHaveCSS(
      "transform",
      vertical ? "matrix(1, 0, 0, 0, 0, 0)" : "matrix(0, 0, 0, 1, 0, 0)",
    );
    await expect(button).toHaveAttribute("data-state", "idle");
    await page.mouse.down();
    await page.clock.runFor(1850);
    await expect(button).toHaveText("Confirmed");
    await expect(fill).toBeHidden();
    await expect(label).toHaveCSS("color", "rgb(166, 185, 139)");
    await expect(button).toHaveCSS("color", idleStyles.color);
    await expect(button).toHaveCSS("background-color", holdingBackground);
    await page.clock.runFor(2000);
    await expect(button).toHaveText("Confirmed");
    await page.mouse.up();
    await expect(button).toHaveText("Confirmed");
    await page.clock.runFor(1900);
    await expect(button).toHaveText("Confirmed");
    await page.clock.runFor(100);
    await expect(button).toHaveAccessibleName("Hold to confirm");
    await expect(label).toHaveCSS("color", idleStyles.color);
  });
}

test("pointer exit and cancellation prevent confirmation", async ({ page }) => {
  await page.goto("/components/confirm-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.clock.install();
  const button = page.locator('.demo-frame [data-direction="right"]');
  await button.hover();
  await page.mouse.down();
  await page.clock.runFor(600);
  await page.mouse.move(0, 0);
  await page.clock.runFor(2000);
  await page.mouse.up();
  await expect(button).toHaveAttribute("data-state", "idle");
  await button.hover();
  await page.mouse.down();
  await page.clock.runFor(600);
  await button.evaluate((element) =>
    element.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 1 })),
  );
  await page.clock.runFor(2000);
  await page.mouse.up();
  await expect(button).toHaveAttribute("data-state", "idle");
});

test("keyboard holds work with reduced motion on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/confirm-button");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.clock.install();
  const button = page.locator('.demo-frame [data-direction="right"]');
  await button.focus();
  await page.keyboard.down("Space");
  await page.clock.runFor(700);
  await page.keyboard.up("Space");
  await page.clock.runFor(1850);
  await expect(button).toHaveAttribute("data-state", "idle");
  await page.keyboard.down("Enter");
  await page.clock.runFor(1850);
  await expect(button).toHaveText("Confirmed");
  await page.keyboard.up("Enter");
  await expect(button).toHaveText("Confirmed");
  await expect(button.locator('[data-slot="confirm-button-icon"]')).toHaveCSS("filter", "blur(0px)");
  await expect(button.locator('[data-slot="confirm-button-icon"]')).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("the library links to an installable component and its API reference", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/confirm-button"]').click();
  await expect(page.locator('[data-slot="breadcrumb-page"]')).toHaveText("Confirm Button");
  await expect(
    page
      .getByRole("navigation", { name: "Library" })
      .getByRole("link", { name: "Confirm Button", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const buttons = page.locator(".demo-frame button");
  await expect(buttons).toHaveText(Array(4).fill("Hold to confirm"));
  expect(
    await buttons.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-direction")),
    ),
  ).toEqual(["right", "up", "left", "down"]);
  await expect(page.locator(".demo-frame p")).toHaveCount(0);
  await expect(page.locator('[data-slot="confirm-direction"]')).toHaveText(["right", "up", "left", "down"]);
  const reference = page.getByRole("region", { name: "Reference table" });
  await expect(reference).toContainText("direction");
  await expect(reference).toContainText("duration");
  const item = await (await request.get("/r/confirm-button.json")).json();
  expect(item.registryDependencies).toContain("button");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@phosphor-icons/react"]));
  expect(item.files[0].target).toBe("components/animated/confirm-button.tsx");
  const guide = await request.get("/docs/components/confirm-button.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("Required hold time and fill duration in seconds");
});

test("touch holds cancel on release and confirm only after the full duration", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto("http://localhost:3000/components/confirm-button");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.clock.install();
    const button = page.locator('.demo-frame [data-direction="right"]');
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error("Expected visible button");
    const client = await context.newCDPSession(page);
    const touchPoints = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints });
    await page.clock.runFor(700);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.clock.runFor(2000);
    await expect(button).toHaveAttribute("data-state", "idle");
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints });
    await page.clock.runFor(1850);
    await expect(button).toHaveText("Confirmed");
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(button).toHaveText("Confirmed");
  } finally {
    await context.close();
  }
});
