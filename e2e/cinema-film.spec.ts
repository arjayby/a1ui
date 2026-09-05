import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/cinema-film");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("slider", { name: "Choose provider" })).toHaveValue("3");
});

test("dragging updates the cards and marker together in both directions", async ({ page }) => {
  const carousel = page.getByRole("region", { name: "AI provider cinema film" });
  const viewport = carousel.getByRole("group", { name: "Film cards.", exact: false });
  const slider = carousel.getByRole("slider");
  const marker = slider.locator("..").locator("span span");
  const track = viewport.locator(":scope > div");
  const bounds = (await viewport.boundingBox())!;
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const originalMarker = await marker.getAttribute("style");

  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x - 240, center.y, { steps: 18 });
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(3);
  await expect(marker).not.toHaveAttribute("style", originalMarker!);
  await page.mouse.up();

  // The release continues moving instead of snapping immediately.
  const releasedTransform = await track.getAttribute("style");
  await expect(track).not.toHaveAttribute("style", releasedTransform!);
  await expect(carousel.getByRole("status")).not.toHaveText("Google, 4 of 9");
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(3);

  // Start the return drag from a known resting card.
  await slider.focus();
  await slider.press("End");
  await expect(slider).toHaveValue("8");
  await expect(carousel.getByRole("button", { name: "Next provider" })).toBeDisabled();
  await page.mouse.move(center.x - 100, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 160, center.y, { steps: 18 });
  await expect.poll(async () => Number(await slider.inputValue())).toBeLessThan(8);
  await page.mouse.up();
});

test("arrows, keyboard, and scrubber share the same position and endpoints", async ({ page }) => {
  const carousel = page.getByRole("region", { name: "AI provider cinema film" });
  const viewport = carousel.getByRole("group", { name: "Film cards.", exact: false });
  const slider = carousel.getByRole("slider");
  const previous = carousel.getByRole("button", { name: "Previous provider" });
  const next = carousel.getByRole("button", { name: "Next provider" });

  await next.click();
  await expect(slider).toHaveValue("4");
  await expect(carousel.getByRole("status")).toHaveText("Mistral AI, 5 of 9");
  await previous.click();
  await expect(slider).toHaveValue("3");

  await viewport.focus();
  await viewport.press("End");
  await expect(slider).toHaveValue("8");
  await expect(next).toBeDisabled();
  await expect(previous).toBeEnabled();
  await viewport.press("Home");
  await expect(slider).toHaveValue("0");
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await viewport.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await viewport.press("ArrowLeft");
  await expect(slider).toHaveValue("0");

  const scrubber = (await slider.boundingBox())!;
  await slider.click({ position: { x: scrubber.width / 2, y: scrubber.height / 2 } });
  await expect(slider).toHaveValue("4");
  await expect(carousel.locator('[aria-current="true"]')).toHaveAttribute("aria-label", "Mistral AI, 5 of 9");
  await expect(carousel.locator("img")).toHaveCount(0);
  await expect(carousel.locator("[data-film-frame]")).toHaveCount(9);
});

test("reduced motion jumps directly to the requested card", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const carousel = page.getByRole("region", { name: "AI provider cinema film" });
  const slider = carousel.getByRole("slider");
  await carousel.getByRole("button", { name: "Next provider" }).click();
  await expect(slider).toHaveValue("4");
  const activeCard = (await carousel.locator('[aria-current="true"]').boundingBox())!;
  const frame = (await carousel.boundingBox())!;
  expect(Math.abs(activeCard.x + activeCard.width / 2 - frame.x - frame.width / 2)).toBeLessThan(2);
});

test("scrubbing animates through intermediate positions and preserves repeated key input", async ({
  page,
}) => {
  const carousel = page.getByRole("region", { name: "AI provider cinema film" });
  const viewport = carousel.getByRole("group", { name: "Film cards.", exact: false });
  const track = viewport.locator(":scope > div");
  const slider = carousel.getByRole("slider");
  const scrubber = (await slider.boundingBox())!;

  await slider.click({ position: { x: scrubber.width * 0.75, y: scrubber.height / 2 } });
  await expect(slider).toHaveValue("6");
  // Sample actual rendered positions, not the requested destination.
  const positions = await track.evaluate(
    (element) =>
      new Promise<number[]>((resolve) => {
        const samples: number[] = [];
        const sample = () => {
          samples.push(new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
          if (samples.length < 12) requestAnimationFrame(sample);
          else resolve(samples);
        };
        requestAnimationFrame(sample);
      }),
  );
  expect(new Set(positions.map((position) => Math.round(position))).size).toBeGreaterThan(5);
  expect(positions.at(-1)!).toBeLessThan(positions[0]);
  for (let index = 1; index < positions.length; index += 1) {
    expect(positions[index]).toBeLessThanOrEqual(positions[index - 1]);
  }

  await slider.press("Home");
  await slider.press("ArrowRight");
  await slider.press("ArrowRight");
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("3");
  await expect(slider).toHaveAttribute("aria-valuetext", "Google, 4 of 9");
  await expect
    .poll(async () => {
      const card = (await carousel
        .getByRole("group", { name: "Google, 4 of 9", exact: true })
        .boundingBox())!;
      const bounds = (await viewport.boundingBox())!;
      return Math.abs(card.x + card.width / 2 - bounds.x - bounds.width / 2);
    })
    .toBeLessThan(2);
});

test("touch swipes work on narrow screens without overflowing the page", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/components/cinema-film");
  const slider = page.getByRole("slider", { name: "Choose provider" });
  await expect(slider).toHaveValue("3");
  const viewport = page.getByRole("group", { name: "Film cards.", exact: false });
  await viewport.scrollIntoViewIfNeeded();
  const bounds = (await viewport.boundingBox())!;
  const session = await context.newCDPSession(page);
  const x = bounds.x + bounds.width - 40;
  const y = bounds.y + bounds.height / 2;

  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 12; step += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - step * 20, y }],
    });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});

test("the registry includes installable source and its carousel dependency", async ({ request }) => {
  const response = await request.get("/r/cinema-film.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.dependencies).toContain("embla-carousel-react@^8.6.0");
  expect(item.files[0].content).toContain("export function CinemaFilm");
});
