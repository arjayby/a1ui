import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/spiral-text");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("press feedback is visible within 100ms", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const coil = spiral.locator("[data-spiral-coil]").nth(5);
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(100);
  const scale = await coil.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  expect(scale).toBeLessThan(0.98);
  await page.mouse.up();
});

test("rapid re-grabs reuse the cached text pixels", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.scrollIntoViewIfNeeded();
  const count = await spiral.locator("[data-spiral-coil]").count();
  await expect(spiral.locator("canvas[data-ready=true]")).toHaveCount(count);
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) {
      document.documentElement.dataset.textRedrawn = "true";
      return original.apply(this, args);
    };
  });
  await spiral.hover();
  for (let i = 0; i < 6; i++) {
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(100);
  }
  await expect(page.locator("html")).not.toHaveAttribute("data-text-redrawn", "true");
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
});

test("cached text refreshes after color and size changes", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const canvas = spiral.locator("canvas").nth(5);
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await spiral.evaluate((element) => {
    element.style.color = "rgb(0, 128, 255)";
  });
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        const pixels = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] === 255) return [pixels[i], pixels[i + 1], pixels[i + 2]];
        }
        return [];
      }),
    )
    .toEqual([0, 128, 255]);
  const width = await canvas.evaluate((element: HTMLCanvasElement) => element.width);
  await spiral.evaluate((element) => {
    element.style.width = "300px";
  });
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.width)).toBeLessThan(width);
  await expect(canvas).toBeVisible();
});

test("the homepage spiral stays static without allocating canvas caches", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const rotation = page.locator("[data-spiral-rotation]");
  await expect(rotation).toHaveCSS("animation-play-state", "paused");
  await expect(rotation.locator("canvas[data-ready=true]")).toHaveCount(0);
});

test("re-grabbing preserves ring velocity as well as position", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  const velocities = await spiral.evaluate((root) => {
    const ring = root.querySelector('[data-spiral-coil="2"]')!;
    const wave = ring.getAnimations()[0];
    wave.pause();
    const scale = () => new DOMMatrix(getComputedStyle(ring).transform).a;
    wave.currentTime = 298;
    const before = scale();
    wave.currentTime = 300;
    const atPress = scale();
    root.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "mouse", button: 0 }),
    );
    const hold = ring.getAnimations()[0];
    hold.pause();
    hold.currentTime = 0;
    const start = scale();
    hold.currentTime = 2;
    return {
      before: (atPress - before) / 0.002,
      after: (scale() - start) / 0.002,
      jump: Math.abs(start - atPress),
    };
  });
  expect(velocities.jump).toBeLessThan(0.001);
  expect(Math.abs(velocities.after - velocities.before)).toBeLessThan(0.35);
});

test("release starts a visible ripple within 80ms", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const inner = spiral.locator("[data-spiral-coil]").first();
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(80);
  const opacity = await inner.evaluate((element) => Number(getComputedStyle(element).opacity));
  expect(opacity).toBeLessThan(0.9);
});

test("a short hold carries its inward motion into release", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.hover();
  await page.mouse.down();
  const velocities = await spiral.evaluate((root) => {
    const ring = root.querySelector('[data-spiral-coil="11"]')!;
    const hold = ring.getAnimations()[0];
    hold.pause();
    const scale = () => new DOMMatrix(getComputedStyle(ring).transform).a;
    hold.currentTime = 98;
    const before = scale();
    hold.currentTime = 100;
    const atRelease = scale();
    root.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "mouse", button: 0 }),
    );
    const wave = ring.getAnimations()[0];
    wave.pause();
    wave.currentTime = 0;
    const start = scale();
    wave.currentTime = 2;
    return { before: (atRelease - before) / 0.002, after: (scale() - start) / 0.002 };
  });
  expect(velocities.before).toBeLessThan(-0.5);
  expect(Math.abs(velocities.after - velocities.before)).toBeLessThan(0.35);
});

test("the running ripple does not depend on per-frame DOM writes", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const inner = spiral.locator("[data-spiral-coil]").first();
  const before = await inner.evaluate((element) => getComputedStyle(element).transform);
  await spiral.evaluate((element) => {
    new MutationObserver((records) => {
      if (
        records.some(
          (record) => record.target instanceof HTMLElement && record.target.hasAttribute("data-spiral-coil"),
        )
      ) {
        element.setAttribute("data-frame-style-write", "true");
      }
    }).observe(element, { subtree: true, attributes: true, attributeFilter: ["style"] });
  });
  await page.waitForTimeout(200);
  await expect(spiral).not.toHaveAttribute("data-frame-style-write", "true");
  await expect(inner).not.toHaveCSS("transform", before);
});

test("the shockwave stays circular and centered throughout release", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.hover();
  await page.mouse.down();
  await spiral.evaluate((element) => {
    element
      .getAnimations({ subtree: true })
      .filter((animation) => animation.id === "a1ui-spiral-tightening")
      .forEach((animation) => animation.finish());
  });
  await page.mouse.up();

  for (const time of [300, 600, 1100]) {
    await spiral.evaluate((element, currentTime) => {
      const animations = element
        .getAnimations({ subtree: true })
        .filter((animation) => animation.id === "a1ui-spiral-releasing");
      if (!animations.length) throw new Error("No ripple animations are running");
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = currentTime;
      }
    }, time);
    const scales = await spiral
      .locator("[data-spiral-coil]")
      .evaluateAll((elements) =>
        elements.map((element) => new DOMMatrix(getComputedStyle(element).transform).a),
      );
    if (time === 300) {
      expect(scales[2]).toBeGreaterThan(1);
      expect(scales[11]).toBeCloseTo(0.86);
    } else if (time === 1100) {
      expect(scales[2]).toBeCloseTo(1);
      expect(scales[11]).toBeGreaterThan(1);
    }
    const radiusSpreads = await spiral.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      return Array.from(element.querySelectorAll("text"), (text) => {
        const matrix = text.getScreenCTM();
        if (!matrix) throw new Error("Text has no screen transform");
        const x = text.getAttribute("x")!.split(" ").map(Number);
        const y = text.getAttribute("y")!.split(" ").map(Number);
        const radii = x.map((value, index) => {
          const point = new DOMPoint(value, y[index]).matrixTransform(matrix);
          return Math.hypot(point.x - center.x, point.y - center.y);
        });
        return Math.max(...radii) - Math.min(...radii);
      });
    });
    expect(radiusSpreads.length).toBeGreaterThan(1);
    expect(Math.max(...radiusSpreads)).toBeLessThan(0.1);
  }
});

test("press and release animate without rebuilding glyph layout", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.evaluate((element) => {
    const observer = new MutationObserver((records) => {
      if (records.some((record) => ["x", "y", "rotate"].includes(record.attributeName ?? ""))) {
        element.setAttribute("data-glyph-layout-changed", "true");
      }
    });
    observer.observe(element, { subtree: true, attributes: true, attributeFilter: ["x", "y", "rotate"] });
  });
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  await page.waitForTimeout(600);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await expect(spiral).not.toHaveAttribute("data-glyph-layout-changed", "true");
});

test("re-grabbing catches the moving rings without snapping or ending the new hold", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const inner = spiral.locator("[data-spiral-coil]").nth(2);
  const scale = () => inner.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await spiral.evaluate((element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      if (animation.id !== "a1ui-spiral-releasing") continue;
      animation.pause();
      animation.currentTime = 300;
    }
  });
  const before = await scale();
  expect(before).toBeGreaterThan(1);
  await page.mouse.down();
  expect(Math.abs((await scale()) - before)).toBeLessThan(0.05);
  await page.waitForTimeout(1900);
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  expect(await scale()).toBeCloseTo(0.86);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
});

test("rapid touch presses and cancellations leave no stuck gesture or animation", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.scrollIntoViewIfNeeded();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const bounds = await spiral.boundingBox();
  if (!bounds) throw new Error("Spiral Text has no visible bounds");
  const session = await page.context().newCDPSession(page);
  for (let attempt = 0; attempt < 3; attempt++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }],
    });
    await expect(spiral).toHaveAttribute("data-interaction", "tightening");
    await page.waitForTimeout(30);
    await session.send("Input.dispatchTouchEvent", {
      type: attempt === 1 ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
    await expect(spiral).toHaveAttribute("data-interaction", "releasing");
  }
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  const animations = await spiral.evaluate(
    (element) =>
      element.getAnimations({ subtree: true }).filter((animation) => animation.id.startsWith("a1ui-spiral-"))
        .length,
  );
  expect(animations).toBe(0);
  expect(errors).toEqual([]);
  await session.detach();
});

test("text rotates by default while the background stays fixed", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotatingLayer = spiral.locator("div").first();
  const transform = () => rotatingLayer.evaluate((element) => getComputedStyle(element).transform);

  await expect(page.getByRole("button", { name: "Rotate text" })).toHaveCount(0);
  await expect(rotatingLayer).toHaveCSS("animation-play-state", "running");
  const restingTransform = await transform();
  await expect.poll(transform).not.toBe(restingTransform);

  // Grabbing pauses the spin immediately, then release resumes it.
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  await expect(rotatingLayer).toHaveCSS("animation-play-state", "paused");
  await page.mouse.up();
  await expect(rotatingLayer).toHaveCSS("animation-play-state", "running");
  await expect(spiral).toHaveAttribute("data-interaction", "resting");

  await expect(spiral.locator(":scope > svg")).toHaveCSS("transform", "none");
});

test("rotation respects changes to reduced motion", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotatingLayer = spiral.locator("div").first();
  await expect(rotatingLayer).toHaveCSS("animation-name", "spin");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rotatingLayer).toHaveCSS("animation-name", "none");
  await expect(rotatingLayer).toHaveCSS("transform", "none");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(rotatingLayer).toHaveCSS("animation-name", "spin");
});

test("rotation pauses offscreen and resumes when visible", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotation = spiral.locator("[data-spiral-rotation]");
  await spiral.scrollIntoViewIfNeeded();
  await expect(rotation).toHaveCSS("animation-play-state", "running");
  await spiral.hover();
  await page.mouse.down();
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "releasing");
  await page.getByRole("heading", { name: "API reference" }).scrollIntoViewIfNeeded();
  await expect(rotation).toHaveCSS("animation-play-state", "paused");
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await spiral.scrollIntoViewIfNeeded();
  await expect(rotation).toHaveCSS("animation-play-state", "running");
});

for (const releaseOutside of [false, true]) {
  test(`spiral text moves and returns to rest after releasing ${releaseOutside ? "outside" : "inside"}`, async ({
    page,
  }) => {
    const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
    await spiral.scrollIntoViewIfNeeded();
    const text = spiral.locator("text").first();
    const coil = spiral.locator("[data-spiral-coil]").nth(5);
    const restingTransform = await coil.evaluate((element) => getComputedStyle(element).transform);
    const restingX = await text.getAttribute("x");
    const restingY = await text.getAttribute("y");
    if (!restingX || !restingY) throw new Error("Spiral Text has no glyph coordinates");

    await spiral.hover();
    await page.mouse.down();
    await expect(spiral).toHaveAttribute("data-interaction", "tightening");
    await expect(coil).not.toHaveCSS("transform", restingTransform);

    if (releaseOutside) {
      const box = await spiral.boundingBox();
      if (!box) throw new Error("Spiral Text has no visible bounds");
      await page.mouse.move(box.x - 10, box.y + box.height / 2);
    }
    await page.mouse.up();
    await expect(spiral).toHaveAttribute("data-interaction", "releasing");
    await expect(spiral).toHaveAttribute("data-interaction", "resting");
    await expect(coil).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await expect(text).toHaveAttribute("x", restingX);
    await expect(text).toHaveAttribute("y", restingY);
  });
}

test("reduced motion keeps the spiral still throughout a press and release", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.scrollIntoViewIfNeeded();
  const text = spiral.locator("text").first();
  // Observe the entire interaction so a transient geometry change also fails the test.
  await text.evaluate((element) => {
    const observer = new MutationObserver((records) => {
      if (records.some((record) => ["x", "y"].includes(record.attributeName ?? ""))) {
        element.setAttribute("data-geometry-changed", "true");
      }
    });
    observer.observe(element, { attributes: true, attributeFilter: ["x", "y"] });
  });
  await page.clock.install();
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "pressed-reduced");
  await page.clock.runFor(1300);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await page.clock.runFor(1300);
  await expect(text).not.toHaveAttribute("data-geometry-changed", "true");
});
