import { expect, test } from "@playwright/test";

const labels = ["Grace", "Runes", "Ashes", "Oaths"];

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

for (const width of [1440, 390, 320]) {
  test(`showcase fits all four sigils and opens the demo at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

    const card = page.locator(".catalog-card").filter({
      has: page.getByRole("link", { name: "Particle Menu", exact: true }),
    });
    await card.scrollIntoViewIfNeeded();
    const preview = card.locator(".particle-menu-preview");
    await expect(preview.locator("span")).toHaveText(labels);
    const bounds = await preview.boundingBox();
    if (!bounds) throw new Error("Particle Menu preview has no visible bounds");

    for (const item of await preview.locator("li").all()) {
      const box = await item.boundingBox();
      if (!box) throw new Error("Showcase sigil has no visible bounds");
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.y).toBeGreaterThanOrEqual(bounds.y);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    }

    await card.getByRole("link", { name: "Particle Menu", exact: true }).click();
    await expect(page).toHaveURL(/\/components\/particle-menu$/);
    await expect(page.getByRole("navigation", { name: "Particle menu demo" }).getByRole("button")).toHaveText(
      labels,
    );
  });
}

test.describe("particle menu demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.goto("/components/particle-menu");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.getByRole("navigation", { name: "Particle menu demo" }).scrollIntoViewIfNeeded();
    await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  });

  for (const label of labels) {
    test(`${label} scatters on hover and gradually returns after leaving`, async ({ page }) => {
      const menu = page.getByRole("navigation", { name: "Particle menu demo" });
      const button = menu.getByRole("button", { name: label, exact: true });
      const path = button.locator("path");
      const resting = await path.getAttribute("d");
      expect(resting).toBeTruthy();

      await button.locator("svg").hover();
      await page.clock.runFor(1000);
      const scattered = await path.getAttribute("d");
      expect(scattered === resting, "hover should scatter the sigil").toBe(false);

      await page.mouse.move(0, 0);
      await page.clock.runFor(250);
      const earlyReturn = await path.getAttribute("d");
      expect(earlyReturn === scattered, "return movement should start without a delay").toBe(false);

      await page.clock.runFor(500);
      const lateReturn = await path.getAttribute("d");
      expect(lateReturn === earlyReturn, "particles should keep moving during the return").toBe(false);
      expect(lateReturn === resting, "the return should still be visible after 750 ms").toBe(false);

      await page.clock.runFor(4500);
      expect((await path.getAttribute("d")) === resting, "the exact sigil should be restored").toBe(true);
    });
  }

  test("hovering again interrupts the return without jumping back to rest", async ({ page }) => {
    const button = page
      .getByRole("navigation", { name: "Particle menu demo" })
      .getByRole("button", { name: "Runes", exact: true });
    const path = button.locator("path");
    const resting = await path.getAttribute("d");
    expect(resting).toBeTruthy();

    await button.locator("svg").hover();
    await page.clock.runFor(1000);
    await page.mouse.move(0, 0);
    await page.clock.runFor(500);
    const returning = await path.getAttribute("d");
    expect(returning === resting).toBe(false);

    await button.locator("svg").hover();
    expect((await path.getAttribute("d")) === returning, "re-entry should preserve particle positions").toBe(
      true,
    );
    await page.clock.runFor(200);
    const resumed = await path.getAttribute("d");
    expect(resumed === returning, "the pointer should affect the particles immediately").toBe(false);
    expect(resumed === resting).toBe(false);

    await page.mouse.move(0, 0);
    await page.clock.runFor(5000);
    expect((await path.getAttribute("d")) === resting).toBe(true);
  });

  test("keyboard users can focus every sigil and see its particle response", async ({ page }) => {
    const menu = page.getByRole("navigation", { name: "Particle menu demo" });
    const buttons = menu.getByRole("button");
    await expect(buttons).toHaveText(labels);
    const resting = await menu
      .locator("path")
      .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));

    // Establish a starting point, then enter the menu using real keyboard input.
    await buttons.first().focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");

    for (const [index, label] of labels.entries()) {
      const button = menu.getByRole("button", { name: label, exact: true });
      await expect(button).toBeFocused();
      const focus = await button.evaluate((element) => ({
        visible: element.matches(":focus-visible"),
        outline: getComputedStyle(element).outlineStyle,
        width: Number.parseFloat(getComputedStyle(element).outlineWidth),
      }));
      expect(focus.visible).toBe(true);
      expect(focus.outline).not.toBe("none");
      expect(focus.width).toBeGreaterThan(0);

      await page.clock.runFor(200);
      expect((await button.locator("path").getAttribute("d")) === resting[index]).toBe(false);
      await page.keyboard.press("Tab");
    }

    await page.clock.runFor(5000);
    for (const [index, button] of (await buttons.all()).entries()) {
      await expect(button).not.toBeFocused();
      expect((await button.locator("path").getAttribute("d")) === resting[index]).toBe(true);
    }
  });

  test.describe("with reduced motion", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test("sigils stay still throughout pointer and keyboard interactions", async ({ page }) => {
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
      const menu = page.getByRole("navigation", { name: "Particle menu demo" });
      const paths = menu.locator("path");
      // Detect even a brief geometry change that a final-state assertion would miss.
      await paths.evaluateAll((elements) => {
        for (const element of elements) {
          const resting = element.getAttribute("d");
          const observer = new MutationObserver((records) => {
            if (
              element.getAttribute("d") !== resting ||
              records.some((record) => record.oldValue !== resting)
            ) {
              element.setAttribute("data-geometry-changed", "true");
            }
          });
          observer.observe(element, { attributes: true, attributeFilter: ["d"], attributeOldValue: true });
        }
      });

      for (const button of await menu.getByRole("button").all()) {
        await button.locator("svg").hover();
        await page.clock.runFor(300);
        await page.mouse.move(0, 0);
        await page.clock.runFor(1000);
      }

      await menu.getByRole("button").first().focus();
      await page.keyboard.press("Tab");
      await expect(menu.getByRole("button", { name: "Runes", exact: true })).toBeFocused();
      await page.clock.runFor(1000);
      for (const path of await paths.all()) {
        await expect(path).not.toHaveAttribute("data-geometry-changed", "true");
      }
    });
  });

  test("enabling reduced motion cancels an ongoing return", async ({ page }) => {
    const button = page
      .getByRole("navigation", { name: "Particle menu demo" })
      .getByRole("button", { name: "Ashes", exact: true });
    const path = button.locator("path");
    const resting = await path.getAttribute("d");
    expect(resting).toBeTruthy();

    await button.locator("svg").hover();
    await page.clock.runFor(1000);
    await page.mouse.move(0, 0);
    await page.clock.runFor(250);
    expect((await path.getAttribute("d")) === resting).toBe(false);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(async () => (await path.getAttribute("d")) === resting).toBe(true);
    await button.locator("svg").hover();
    await page.clock.runFor(5000);
    expect((await path.getAttribute("d")) === resting).toBe(true);
  });

  test.describe("on a touch screen", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test("holding a sigil scatters it and lifting the finger starts a gradual return", async ({ page }) => {
      const button = page
        .getByRole("navigation", { name: "Particle menu demo" })
        .getByRole("button", { name: "Oaths", exact: true });
      const path = button.locator("path");
      const resting = await path.getAttribute("d");
      expect(resting).toBeTruthy();
      const box = await button.locator("svg").boundingBox();
      if (!box) throw new Error("Oaths sigil has no visible bounds");

      // Chromium's native touch input allows a hold between touchstart and touchend.
      const touch = await page.context().newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
      });
      await page.clock.runFor(300);
      expect((await path.getAttribute("d")) === resting).toBe(false);

      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.clock.runFor(750);
      expect((await path.getAttribute("d")) === resting).toBe(false);
      await page.clock.runFor(4500);
      expect((await path.getAttribute("d")) === resting).toBe(true);
      await touch.detach();
    });
  });
});
