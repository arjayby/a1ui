import { expect, test, type Locator, type Page } from "@playwright/test";

// Under load the docs page can still shift after hydration. Wait for the target to hold still
// before pointing at it so the cursor lands where the test means it to.
async function waitUntilSettled(target: Locator) {
  await target.scrollIntoViewIfNeeded();
  let previous = "";
  await expect
    .poll(
      async () => {
        const box = await target.boundingBox();
        const current = JSON.stringify(box && [Math.round(box.x), Math.round(box.y)]);
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { intervals: [150] },
    )
    .toBe(true);
  return (await target.boundingBox())!;
}

function frameStyles(page: Page) {
  return page.locator(".demo-frame").evaluate((element) =>
    [...element.querySelectorAll<HTMLElement>('[data-slot="carousel-item-frame"]')].map((frame) => {
      const style = getComputedStyle(frame);
      return { scale: new DOMMatrix(style.transform).a, opacity: Number(style.opacity) };
    }),
  );
}

async function openDemo(page: Page) {
  await page.goto("/components/carousel");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  await expect(frame.getByRole("button", { name: "Go to slide 1" })).toHaveAttribute("aria-current", "true");
  return frame;
}

test("slides scale with the drag and the dot indicator stretches mid-scroll", async ({ page }) => {
  const frame = await openDemo(page);
  const previous = frame.getByRole("button", { name: "Previous slide" });
  await expect(previous).toBeDisabled();

  const resting = await frameStyles(page);
  expect(resting[0].scale).toBeCloseTo(1, 2);
  expect(resting[1].scale).toBeCloseTo(0.88, 2);
  expect(resting[1].opacity).toBeCloseTo(0.5, 2);

  // Hold a drag partway: the neighbour has grown part of the way and stays there while held.
  const box = await waitUntilSettled(frame.getByRole("group", { name: "1 of 6" }));
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++) await page.mouse.move(box.x + box.width / 2 - step * 15, y);
  await page.waitForTimeout(150);
  const held = await frameStyles(page);
  expect(held[1].scale).toBeGreaterThan(0.89);
  expect(held[1].scale).toBeLessThan(0.99);
  expect(held[0].scale).toBeLessThan(0.99);
  // Flick onward so the release carries to the next slide.
  for (let step = 9; step <= 14; step++) await page.mouse.move(box.x + box.width / 2 - step * 15, y);
  await page.mouse.up();
  await expect(frame.getByRole("button", { name: "Go to slide 2" })).toHaveAttribute("aria-current", "true");
  await expect(previous).toBeEnabled();

  // A button scroll passes through intermediate scales, and the indicator spans two dots on the way.
  const samples = await frame.evaluate(async (element) => {
    const frames = [...element.querySelectorAll<HTMLElement>('[data-slot="carousel-item-frame"]')];
    const indicator = element.querySelector<HTMLElement>('[data-slot="carousel-dots-indicator"]')!;
    const dot = element.querySelector<HTMLElement>('[data-slot="carousel-dot"]')!.offsetWidth;
    element.querySelector<HTMLButtonElement>('[data-slot="carousel-next"]')!.click();
    const result: { scale: number; width: number; dot: number }[] = [];
    const began = performance.now();
    while (performance.now() - began < 600) {
      result.push({
        scale: new DOMMatrix(getComputedStyle(frames[2]).transform).a,
        width: indicator.getBoundingClientRect().width,
        dot,
      });
      await new Promise(requestAnimationFrame);
    }
    return result;
  });
  expect(samples.some(({ scale }) => scale > 0.9 && scale < 0.98)).toBe(true);
  expect(samples.some(({ width, dot }) => width > dot * 1.5)).toBe(true);
  // Once settled, the slide is full size and the indicator is back to a single dot.
  const indicator = frame.locator('[data-slot="carousel-dots-indicator"]');
  await expect.poll(async () => (await indicator.boundingBox())!.width).toBeLessThan(samples[0].dot + 0.5);
  expect((await frameStyles(page))[2].scale).toBeCloseTo(1, 2);
  await expect(frame.getByRole("button", { name: "Go to slide 3" })).toHaveAttribute("aria-current", "true");

  // Arrow keys move the carousel, at a human pace, and next disables on the last slide.
  await frame.locator('[data-slot="carousel-content"]').focus();
  for (const slide of [4, 5, 6]) {
    await page.keyboard.press("ArrowRight");
    await expect(frame.getByRole("button", { name: `Go to slide ${slide}` })).toHaveAttribute(
      "aria-current",
      "true",
    );
  }
  await expect(frame.getByRole("button", { name: "Next slide" })).toBeDisabled();
  await expect(frame.getByText("Radio telescope, 6 of 6")).toBeVisible();
});

test("reduced motion on a phone keeps scrolling without scale, fade, or parallax", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const frame = await openDemo(page);
  const styles = await frameStyles(page);
  expect(styles.every(({ scale, opacity }) => scale === 1 && opacity === 1)).toBe(true);
  const layers = await frame.evaluate((element) =>
    [
      ...element.querySelectorAll<HTMLElement>('[data-slot="carousel-item-layer"], [data-carousel-parallax]'),
    ].map((layer) => getComputedStyle(layer).transform),
  );
  expect(layers.every((transform) => transform === "none")).toBe(true);

  const next = frame.getByRole("button", { name: "Next slide" });
  await waitUntilSettled(next);
  await next.click();
  await expect(frame.getByRole("button", { name: "Go to slide 2" })).toHaveAttribute("aria-current", "true");
  const slide = frame.getByRole("group", { name: "2 of 6" });
  const [slideBox, viewport] = await Promise.all([
    slide.boundingBox(),
    frame.locator('[data-slot="carousel-content"]').boundingBox(),
  ]);
  // The second slide is centred in the viewport right away.
  expect(Math.abs(slideBox!.x + slideBox!.width / 2 - (viewport!.x + viewport!.width / 2))).toBeLessThan(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include carousel", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/carousel"]').click();
  await expect(page.getByRole("heading", { name: "Carousel", exact: true })).toBeVisible();
  const item = await (await request.get("/r/carousel.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "embla-carousel-react"]));
  expect(item.files[0].target).toBe("components/animated/carousel.tsx");
  expect(item.files[0].content).toContain("export function CarouselDots");
  const guide = await request.get("/docs/components/carousel.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/carousel");
});
