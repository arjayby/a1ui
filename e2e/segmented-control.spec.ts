import type { Locator } from "@playwright/test";

import { expect, revealed, test } from "./fixtures";

const route = "/components/segmented-control";

/** The thumb, the clipped label layer and every segment, measured in one frame. */
function measure(control: Locator) {
  return control.evaluate((element) => {
    const box = (target: Element) => {
      const { left, right, top, bottom, width, height } = target.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const inverse = element.querySelector('[data-slot="segmented-control-inverse"]')!;
    // inset(top right bottom left) resolved against the layer's own box gives the visible window.
    const layer = box(inverse);
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden";
    inverse.append(probe);
    const lengths = getComputedStyle(inverse)
      .clipPath.replace(/^inset\(|\)$/g, "")
      .match(/calc\([^)]*\)|[^\s]+/g)!;
    // The computed value drops sides that repeat, like any four-sided shorthand.
    const [first, second = first, third = first, fourth = second] = lengths;
    const [top, right, bottom, left] = [first, second, third, fourth].map((length, index) => {
      probe.style.width = index % 2 ? length : "0";
      probe.style.height = index % 2 ? "0" : length;
      const size = probe.getBoundingClientRect();
      return index % 2 ? size.width : size.height;
    });
    probe.remove();
    const thumb = element.querySelector('[data-slot="segmented-control-thumb"]');
    return {
      track: box(element),
      thumb: thumb ? box(thumb) : null,
      window: {
        left: layer.left + left,
        right: layer.right - right,
        top: layer.top + top,
        bottom: layer.bottom - bottom,
      },
      items: [...element.querySelectorAll('[data-slot="segmented-control-item"]')].map(box),
      position: Number((element as HTMLElement).style.getPropertyValue("--segment-position")),
    };
  });
}

test("the thumb shrinks when held, follows the pointer, and lands on the nearest option", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await revealed(page);
  const control = page.locator(".demo-frame").getByRole("radiogroup", { name: "Range" });
  await control.scrollIntoViewIfNeeded();
  const week = control.getByRole("radio", { name: "Week" });
  await expect(week).toHaveAttribute("aria-checked", "true");

  const rest = await measure(control);
  if (!rest.thumb) throw new Error("Expected a thumb");
  // Every segment reserves the same width, and the thumb covers the selected one exactly.
  for (const item of rest.items) expect(item.width).toBeCloseTo(rest.items[0].width, 1);
  expect(rest.thumb.left).toBeCloseTo(rest.items[1].left, 1);
  expect(rest.thumb.width).toBeCloseTo(rest.items[1].width, 1);

  // Grab the thumb off-centre, a quarter of the way in.
  const y = rest.thumb.top + rest.thumb.height / 2;
  const grabX = rest.thumb.left + rest.thumb.width / 4;
  await page.mouse.move(grabX, y);
  await page.mouse.down();
  await expect(control).toHaveAttribute("data-dragging");
  await expect.poll(async () => (await measure(control)).thumb!.width).toBeCloseTo(rest.thumb.width - 3, 1);
  const held = await measure(control);
  expect(held.thumb!.height).toBeCloseTo(rest.thumb.height - 3, 1);

  // It tracks 1:1 from the point where it was grabbed, and the inverted labels stay clipped to it.
  for (const travel of [10, 37, 80, -25]) {
    await page.mouse.move(grabX + travel, y);
    await expect
      .poll(async () => (await measure(control)).thumb!.left)
      .toBeCloseTo(held.thumb!.left + travel, 0);
    const moved = await measure(control);
    expect(moved.window.left).toBeCloseTo(moved.thumb!.left, 0);
    expect(moved.window.right).toBeCloseTo(moved.thumb!.right, 0);
    expect(moved.window.top).toBeCloseTo(moved.thumb!.top, 0);
  }
  // Nothing is chosen until it is let go.
  await expect(week).toHaveAttribute("aria-checked", "true");

  // Hold it mostly over Month, pause so there is no throw, and let go.
  const segment = rest.items[0].width;
  await page.mouse.move(grabX + segment * 0.7, y);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(control).not.toHaveAttribute("data-dragging");
  await expect(control.getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".demo-frame").getByText("Showing the last month")).toBeVisible();
  await expect(control.locator('input[type="hidden"][name="range"]')).toHaveValue("month");
  // The press focused Week; focus follows the thumb to the option it chose.
  await expect(control.getByRole("radio", { name: "Month" })).toBeFocused();
  await expect.poll(async () => (await measure(control)).position).toBeCloseTo(2, 2);
  const settled = await measure(control);
  expect(settled.thumb!.left).toBeCloseTo(rest.items[2].left, 0);
  expect(settled.thumb!.width).toBeCloseTo(rest.thumb.width, 0);
  // The layout did not move when the selection did.
  expect(settled.track).toEqual(rest.track);
  expect(settled.items).toEqual(rest.items);

  // Pulled far past the end it resists, squashing against the track instead of leaving it.
  await page.mouse.move(settled.thumb!.left + 10, y);
  await page.mouse.down();
  await page.mouse.move(settled.track.right + 300, y, { steps: 4 });
  await expect.poll(async () => (await measure(control)).position).toBeGreaterThan(3);
  const stretched = await measure(control);
  expect(stretched.position).toBeLessThan(3.25);
  expect(stretched.thumb!.right).toBeLessThanOrEqual(stretched.track.right - 3);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(control.getByRole("radio", { name: "Year" })).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await measure(control)).position).toBeCloseTo(3, 2);
  expect(errors).toEqual([]);
});

test("a throw carries the thumb past where it was let go, and it can be caught mid-flight", async ({
  page,
}) => {
  await page.goto(route);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await revealed(page);
  const control = page.locator(".demo-frame").getByRole("radiogroup", { name: "Range" });
  await control.scrollIntoViewIfNeeded();

  // Events are dispatched in the page so their timing cannot be stretched by a busy machine.
  await control.evaluate((element: HTMLElement) => {
    const track = element.getBoundingClientRect();
    const segment = (track.width - 6) / 4;
    const y = track.top + track.height / 2;
    const fire = (type: string, x: number, timeStamp: number) => {
      const event = new PointerEvent(type, {
        bubbles: true,
        pointerId: 5,
        button: 0,
        clientX: x,
        clientY: y,
      });
      Object.defineProperty(event, "timeStamp", { value: timeStamp });
      element.dispatchEvent(event);
    };
    // Week is selected and grabbed by its middle. A third of a segment in 48ms is a short, fast
    // throw: let go at 1.33, nearer to Week than to Month.
    const start = track.left + 3 + segment * 1.5;
    fire("pointerdown", start, 1000);
    for (let step = 1; step <= 3; step++) fire("pointermove", start + (segment * step) / 9, 1000 + step * 16);
    fire("pointerup", start + segment / 3, 1048);
  });
  // The landing point is projected from the velocity, so the throw reaches Month.
  await expect(control.getByRole("radio", { name: "Month" })).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await measure(control)).position).toBeCloseTo(2, 2);

  // Send the thumb to the far end and catch it on the way. It stops under the pointer at once.
  const caught = await control.evaluate(async (element: HTMLElement) => {
    const position = () => Number(element.style.getPropertyValue("--segment-position"));
    const items = [...element.querySelectorAll<HTMLElement>('[data-slot="segmented-control-item"]')];
    const frame = () => new Promise(requestAnimationFrame);
    for (let attempt = 0; attempt < 20; attempt++) {
      const far = position() < 1.5 ? 3 : 0;
      items[far].click();
      for (let wait = 0; wait < 120; wait++) {
        await frame();
        const at = position();
        if (Math.abs(at - far) < 0.01) break;
        if (Math.abs(at - Math.round(at)) < 0.15) continue;
        const track = element.getBoundingClientRect();
        const segment = (track.width - 6) / 4;
        const x = track.left + 3 + (at + 0.5) * segment;
        const init = { bubbles: true, pointerId: 6, button: 0, clientX: x, clientY: track.top + 10 };
        element.dispatchEvent(new PointerEvent("pointerdown", init));
        // The style is written once per frame, so give the stopped value a frame to land.
        await frame();
        await frame();
        const heldAt = position();
        for (let later = 0; later < 6; later++) await frame();
        const stillAt = position();
        const dragging = element.hasAttribute("data-dragging");
        element.dispatchEvent(new PointerEvent("pointerup", init));
        return {
          seenAt: at,
          heldAt,
          stillAt,
          dragging,
          far,
          checked: items[far].getAttribute("aria-checked"),
        };
      }
    }
    return null;
  });
  if (!caught) throw new Error("The thumb never showed up mid-flight");
  expect(caught.dragging).toBe(true);
  expect(caught.stillAt).toBe(caught.heldAt);
  expect(Math.abs(caught.heldAt - caught.seenAt)).toBeLessThan(0.2);
  // Letting go without dragging lets it carry on to the option that was clicked.
  expect(caught.checked).toBe("true");
  await expect.poll(async () => (await measure(control)).position).toBeCloseTo(caught.far, 2);
});

test("is a radio group for the keyboard, in both writing directions", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const view = frame.getByRole("radiogroup", { name: "View" });
  const names = ["List", "Board", "Calendar", "Timeline"];
  const radio = (name: string) => view.getByRole("radio", { name });
  await expect(radio("Timeline")).toBeDisabled();
  expect(await view.getByRole("radio").evaluateAll((items) => items.map((item) => item.tabIndex))).toEqual([
    0, -1, -1, -1,
  ]);

  await radio("List").focus();
  await page.keyboard.press("ArrowRight");
  await expect(radio("Board")).toBeFocused();
  await expect(radio("Board")).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("End");
  // Timeline is disabled, so End stops on Calendar and the next arrow wraps to List.
  await expect(radio("Calendar")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(radio("List")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(radio("Calendar")).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Home");
  await expect(radio("List")).toHaveAttribute("aria-checked", "true");
  // Tab leaves the group in one step: only the checked option is a tab stop.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  for (const name of names) await expect(radio(name)).not.toBeFocused();
  await radio("Calendar").click();
  await expect(radio("Calendar")).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await measure(view)).position).toBeCloseTo(2, 2);

  // Right to left, the first option sits on the right and the arrows follow the layout.
  await view.evaluate((element) => element.parentElement!.setAttribute("dir", "rtl"));
  const mirrored = await measure(view);
  expect(mirrored.items[0].left).toBeGreaterThan(mirrored.items[3].left);
  expect(mirrored.thumb!.left).toBeCloseTo(mirrored.items[2].left, 0);
  expect(mirrored.window.left).toBeCloseTo(mirrored.thumb!.left, 0);
  expect(mirrored.window.right).toBeCloseTo(mirrored.thumb!.right, 0);
  await radio("Calendar").focus();
  await page.keyboard.press("ArrowRight");
  await expect(radio("Board")).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await measure(view)).position).toBeCloseTo(1, 2);
  const settled = await measure(view);
  expect(settled.thumb!.left).toBeCloseTo(settled.items[1].left, 0);
});

test("sizes change the track height and keep the segments equal", async ({ page }) => {
  await page.goto(route);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const control = page.locator(".demo-frame").getByRole("radiogroup", { name: "Range" });
  for (const [size, height] of [
    ["sm", 32],
    ["lg", 44],
  ] as const) {
    await page.getByRole("button", { name: /^Size:/ }).click();
    await page.getByRole("menuitem", { name: size, exact: true }).click();
    await expect(control).toHaveAttribute("data-size", size);
    const { track, items, thumb } = await measure(control);
    expect(track.height).toBe(height);
    for (const item of items) expect(item.width).toBeCloseTo(items[0].width, 1);
    expect(thumb!.height).toBe(height - 6);
  }
});

test("reduced motion cross-fades the thumb in place, by click and by drag", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(route);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const control = page.locator(".demo-frame").getByRole("radiogroup", { name: "Range" });
  await control.scrollIntoViewIfNeeded();
  // No sliding thumb: each option carries its own fill.
  await expect(control.locator('[data-slot="segmented-control-thumb"]')).toHaveCount(0);
  const fills = control.locator('[data-slot="segmented-control-inverse"] > span');
  await expect(fills.nth(1)).toHaveAttribute("data-active");
  await expect(fills.nth(1)).toHaveCSS("opacity", "1");

  const fading = await control.evaluate(async (element) => {
    const cells = [
      ...element.querySelectorAll<HTMLElement>('[data-slot="segmented-control-inverse"] > span'),
    ];
    const before = cells.map((cell) => cell.getBoundingClientRect().left);
    element.querySelectorAll<HTMLElement>('[data-slot="segmented-control-item"]')[3].click();
    const samples: number[][] = [];
    const began = performance.now();
    while (performance.now() - began < 400) {
      await new Promise(requestAnimationFrame);
      samples.push([Number(getComputedStyle(cells[1]).opacity), Number(getComputedStyle(cells[3]).opacity)]);
    }
    return {
      samples,
      moved: cells.some((cell, index) => cell.getBoundingClientRect().left !== before[index]),
    };
  });
  // The old fill fades out while the new one fades in, and nothing travels.
  expect(fading.moved).toBe(false);
  expect(fading.samples.some(([from, to]) => from > 0 && from < 1 && to > 0 && to < 1)).toBe(true);
  await expect(fills.nth(3)).toHaveCSS("opacity", "1");
  await expect(fills.nth(1)).toHaveCSS("opacity", "0");
  await expect(control.getByRole("radio", { name: "Year" })).toHaveAttribute("aria-checked", "true");

  // A touch drag steps through the options and chooses on release.
  const bounds = await control.boundingBox();
  if (!bounds) throw new Error("Expected the control");
  const segment = (bounds.width - 6) / 4;
  const point = (index: number) => ({
    x: bounds.x + 3 + segment * (index + 0.5),
    y: bounds.y + bounds.height / 2,
  });
  const client = await context.newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(3)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(2)] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point(0)] });
  await expect(fills.nth(0)).toHaveAttribute("data-active");
  await expect(control.getByRole("radio", { name: "Year" })).toHaveAttribute("aria-checked", "true");
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(control.getByRole("radio", { name: "Day" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".demo-frame").getByText("Showing the last day")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/segmented-control"]').click();
  await expect(page.getByRole("heading", { name: "Segmented Control", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "breadcrumb", exact: true })
      .locator('[data-slot="breadcrumb-page"]'),
  ).toHaveText("Segmented Control");
  const item = await (await request.get("/r/segmented-control.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/segmented-control.tsx");
  expect(item.files[0].content).toContain("export function SegmentedControl");
  const guide = await request.get("/docs/components/segmented-control.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/segmented-control");
});
