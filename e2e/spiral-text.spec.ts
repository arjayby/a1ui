import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// The rotation layer's angle in degrees, read from the transform Motion writes.
function angleOf(rotation: Locator) {
  return rotation.evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
  });
}

// Whether the angle changes over a short interval. The spin eases in and out, so poll this.
async function isTurning(page: Page, rotation: Locator) {
  const before = await angleOf(rotation);
  await page.waitForTimeout(150);
  return (await angleOf(rotation)) !== before;
}

// Marks the page if cached glyphs are rasterized again from here on. A font that finishes
// loading redraws the cache, which is correct, so redraws made while fonts load do not count:
// on a busy machine the Next.js dev overlay's own font can arrive in the middle of a test.
function watchForTextRedraws(page: Page) {
  return page.evaluate(() => {
    let fontsLoading = document.fonts.status === "loading";
    document.fonts.addEventListener("loading", () => (fontsLoading = true));
    // Added after the block's own listener, so it runs once that listener has redrawn.
    document.fonts.addEventListener("loadingdone", () => (fontsLoading = false));
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) {
      if (!fontsLoading) document.documentElement.dataset.textRedrawn = "true";
      return original.apply(this, args);
    };
  });
}

function scalesOf(spiral: Locator) {
  return spiral
    .locator("[data-spiral-coil]")
    .evaluateAll((elements) =>
      elements.map((element) => new DOMMatrix(getComputedStyle(element).transform).a),
    );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/spiral-text");
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
  await watchForTextRedraws(page);
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

test("theme changes recolor cached text without rasterizing the glyphs again", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const canvas = spiral.locator("canvas").nth(5);
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await watchForTextRedraws(page);
  for (const theme of ["dark", "light", "dark"]) {
    await page.getByRole("switch", { name: "Dark theme", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(theme);
    await expect(page.locator("html")).not.toHaveAttribute("data-text-redrawn", "true");
    await expect
      .poll(() =>
        canvas.evaluate((element: HTMLCanvasElement) => {
          const context = element.getContext("2d")!;
          const pixels = context.getImageData(0, 0, element.width, element.height).data;
          const sample = document.createElement("canvas");
          sample.width = sample.height = 1;
          const expected = sample.getContext("2d")!;
          expected.fillStyle = getComputedStyle(
            element.closest("[data-spiral-coil]")!.querySelector("text")!,
          ).fill;
          expected.fillRect(0, 0, 1, 1);
          const color = expected.getImageData(0, 0, 1, 1).data;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] === 255) return color.every((value, channel) => value === pixels[i + channel]);
          }
          return false;
        }),
      )
      .toBe(true);
  }
});

test("release starts a visible ripple within five frames", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  // Count frames from the release itself. A wall-clock wait would also measure how late a
  // loaded machine delivers the input, rather than when the ripple begins.
  await spiral.evaluate((root) => {
    const inner = root.querySelector("[data-spiral-coil]")!;
    root.addEventListener(
      "pointerup",
      () => {
        let frames = 0;
        const sample = () => {
          frames += 1;
          if (Number(getComputedStyle(inner).opacity) < 0.9) root.dataset.rippleFrames = String(frames);
          else if (frames < 60) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      },
      { once: true },
    );
  });
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-ripple-frames", /^[1-5]$/);
});

test("a short hold carries its inward motion into release", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.hover();
  // The wave takes about 700ms to reach this outer ring. Until then the ring should spend the
  // inward speed it had at release, rather than freezing the moment the pointer lifts.
  await spiral.evaluate((root) => {
    const ring = root.querySelector('[data-spiral-coil="11"]')!;
    const scale = () => new DOMMatrix(getComputedStyle(ring).transform).a;
    root.addEventListener(
      "pointerup",
      () => {
        const atRelease = scale();
        let tightest = atRelease;
        let frames = 0;
        const sample = () => {
          frames += 1;
          tightest = Math.min(tightest, scale());
          if (frames < 12) requestAnimationFrame(sample);
          else root.dataset.carried = String(atRelease - tightest);
        };
        requestAnimationFrame(sample);
      },
      { once: true },
    );
  });
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-carried", /\d/);
  expect(Number(await spiral.getAttribute("data-carried"))).toBeGreaterThan(0.002);
});

test("the running ripple animates only transform and opacity", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const count = await spiral.locator("[data-spiral-coil]").count();
  await expect(spiral.locator("canvas[data-ready=true]")).toHaveCount(count);
  const boxes = () =>
    spiral.locator("[data-spiral-coil]").evaluateAll((elements) =>
      elements.map((element) => {
        const { width, height, left, top } = (element as HTMLElement).style;
        const canvas = element.querySelector("canvas")!;
        return [width, height, left, top, canvas.width, canvas.height];
      }),
    );
  const resting = await boxes();
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const inner = spiral.locator("[data-spiral-coil]").first();
  const before = await inner.evaluate((element) => getComputedStyle(element).transform);
  // Record every inline style property the rings carry while the wave runs.
  await spiral.evaluate((element) => {
    const seen = new Set<string>();
    new MutationObserver((records) => {
      for (const record of records) {
        if (!(record.target instanceof HTMLElement) || !record.target.hasAttribute("data-spiral-coil"))
          continue;
        for (const property of Array.from(record.target.style)) seen.add(property);
        element.dataset.animated = [...seen].sort().join(" ");
      }
    }).observe(element, { subtree: true, attributes: true, attributeFilter: ["style"] });
  });
  await page.waitForTimeout(200);
  await expect(inner).not.toHaveCSS("transform", before);
  await expect(spiral).toHaveAttribute(
    "data-animated",
    "height left opacity top transform width will-change",
  );
  expect(await boxes()).toEqual(resting);
});

test("the shockwave stays circular and centered throughout release", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.hover();
  await page.mouse.down();
  await expect.poll(async () => (await scalesOf(spiral))[11]).toBeCloseTo(0.86, 3);
  await page.mouse.up();

  const expectCircular = async () => {
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
  };

  // Each state lasts about half a second, so poll faster than the default backoff.
  const intervals = [40];
  // Early in the wave an inner ring swells past rest while an outer ring is still gathered.
  await expect
    .poll(
      async () => {
        const scales = await scalesOf(spiral);
        return scales[2] > 1.02 && Math.abs(scales[11] - 0.86) < 0.005;
      },
      { intervals },
    )
    .toBe(true);
  await expectCircular();
  // Later the inner ring is back at rest and the swell has moved out to the outer ring.
  await expect
    .poll(
      async () => {
        const scales = await scalesOf(spiral);
        return Math.abs(scales[2] - 1) < 0.005 && scales[11] > 1.01;
      },
      { intervals },
    )
    .toBe(true);
  await expectCircular();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await expectCircular();
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
  await spiral.hover();
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(250);
  // Sample the ring as the press lands and on the frames after it. The listener sits on the
  // element, so it reads the ring before the block has handled the press.
  await spiral.evaluate((root) => {
    const ring = root.querySelector('[data-spiral-coil="2"]')!;
    const scale = () => new DOMMatrix(getComputedStyle(ring).transform).a;
    root.addEventListener(
      "pointerdown",
      () => {
        const samples = [scale()];
        const sample = () => {
          samples.push(scale());
          if (samples.length < 5) requestAnimationFrame(sample);
          else root.dataset.regrab = samples.join(" ");
        };
        requestAnimationFrame(sample);
      },
      { once: true },
    );
  });
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-regrab", /\d/);
  const samples = (await spiral.getAttribute("data-regrab"))!.split(" ").map(Number);
  // The wave had swollen the ring past rest. A spring from there covers at most a quarter of
  // the way to the gathered pose in one frame, even a late one. Snapping to rest or to that
  // pose would cover far more.
  expect(samples[0]).toBeGreaterThan(1.08);
  const distance = samples[0] - 0.86;
  for (let index = 1; index < samples.length; index++) {
    expect(Math.abs(samples[index] - samples[index - 1])).toBeLessThan(distance * 0.35);
  }
  await page.waitForTimeout(1900);
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  expect((await scalesOf(spiral))[2]).toBeCloseTo(0.86);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
});

test("rapid touch presses and cancellations leave no stuck gesture or moving ring", async ({ page }) => {
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
  const scales = await scalesOf(spiral);
  await page.waitForTimeout(100);
  expect(scales.every((scale) => scale === 1)).toBe(true);
  expect(await scalesOf(spiral)).toEqual(scales);
  expect(errors).toEqual([]);
  await session.detach();
});

test("text rotates by default while the background stays fixed", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotation = spiral.locator("[data-spiral-rotation]");

  await expect(page.getByRole("button", { name: "Rotate text" })).toHaveCount(0);
  await expect.poll(() => isTurning(page, rotation)).toBe(true);

  // Grabbing eases the spin to a stop, then release starts it turning again.
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  await expect.poll(() => isTurning(page, rotation)).toBe(false);
  await page.mouse.up();
  await expect.poll(() => isTurning(page, rotation)).toBe(true);
  await expect(spiral).toHaveAttribute("data-interaction", "resting");

  await expect(spiral.locator(":scope > svg")).toHaveCSS("transform", "none");
});

test("the pause control stops the rotation at its current angle and resumes from it", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotation = spiral.locator("[data-spiral-rotation]");
  await expect.poll(() => angleOf(rotation)).toBeGreaterThan(1);

  await page.getByRole("button", { name: "Pause rotation" }).click();
  const atPause = await angleOf(rotation);
  await expect.poll(() => isTurning(page, rotation)).toBe(false);
  // It coasts to a stop a little past where it was paused, rather than snapping back to zero.
  const stopped = await angleOf(rotation);
  expect(stopped).toBeGreaterThanOrEqual(atPause);
  expect(stopped - atPause).toBeLessThan(3);

  await page.getByRole("button", { name: "Resume rotation" }).click();
  // It picks up from the angle it stopped at. The bound allows a slow machine two seconds.
  const resumed = await angleOf(rotation);
  expect(resumed).toBeGreaterThanOrEqual(stopped);
  expect(resumed - stopped).toBeLessThan(12);
  await expect.poll(() => isTurning(page, rotation)).toBe(true);
});

test("rotation respects changes to reduced motion", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotation = spiral.locator("[data-spiral-rotation]");
  await expect.poll(() => angleOf(rotation)).toBeGreaterThan(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => isTurning(page, rotation)).toBe(false);
  // The figure holds the angle it had reached instead of jumping back to upright.
  const held = await angleOf(rotation);
  expect(held).toBeGreaterThan(1);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => isTurning(page, rotation)).toBe(true);
  expect(await angleOf(rotation)).toBeGreaterThanOrEqual(held);
});

test("rotation pauses offscreen and resumes when visible", async ({ page }) => {
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  const rotation = spiral.locator("[data-spiral-rotation]");
  await spiral.scrollIntoViewIfNeeded();
  await expect.poll(() => isTurning(page, rotation)).toBe(true);
  await spiral.hover();
  await page.mouse.down();
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "releasing");
  await page.getByRole("heading", { name: "API reference" }).scrollIntoViewIfNeeded();
  await expect.poll(() => isTurning(page, rotation)).toBe(false);
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await spiral.scrollIntoViewIfNeeded();
  await expect.poll(() => isTurning(page, rotation)).toBe(true);
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
    await expect(coil).toHaveCSS("transform", restingTransform);
    await expect(coil).toHaveCSS("opacity", "1");
    await expect(text).toHaveAttribute("x", restingX);
    await expect(text).toHaveAttribute("y", restingY);
  });
}

test("reduced motion answers a press with a fade and keeps the spiral still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });
  await spiral.scrollIntoViewIfNeeded();
  const rotation = spiral.locator("[data-spiral-rotation]");
  await expect(rotation).toHaveCSS("transform", "none");
  // Observe the entire interaction so a transient movement also fails the test.
  await spiral.evaluate((element) => {
    new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target as HTMLElement;
        const moved =
          record.attributeName === "style"
            ? !["", "none"].includes(target.style.transform)
            : record.attributeName !== null;
        if (moved) element.setAttribute("data-moved", "true");
      }
    }).observe(element, { subtree: true, attributes: true, attributeFilter: ["style", "x", "y"] });
  });
  await spiral.hover();
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "pressed-reduced");
  await expect(rotation).toHaveCSS("opacity", "0.7");
  await page.waitForTimeout(600);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "resting");
  await expect(rotation).toHaveCSS("opacity", "1");
  await page.waitForTimeout(600);
  await expect(spiral).not.toHaveAttribute("data-moved", "true");
});
