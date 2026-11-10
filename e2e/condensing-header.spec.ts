import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const demoName = "Scrollable Condensing Header demo";

async function openDemo(page: Page) {
  await page.goto("/blocks/condensing-header");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const demo = page.getByRole("region", { name: demoName });
  await expect(demo.locator('[data-slot="condensing-header"]')).toHaveAttribute("data-ready", "");
  await demo.scrollIntoViewIfNeeded();
  return demo;
}

/** Scrolls the panel (when given an offset), lets two frames pass, and reads what is on screen. */
function read(demo: Locator, scrollTop?: number) {
  return demo.evaluate(async (panel, offset) => {
    if (offset !== undefined) panel.scrollTop = offset;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const origin = panel.getBoundingClientRect();
    const round = (value: number) => Math.round(value * 10) / 10;
    const part = (slot: string) => {
      const element = panel.querySelector<HTMLElement>(`[data-slot="condensing-header-${slot}"]`);
      if (!element) throw new Error(`Missing ${slot}`);
      const bounds = element.getBoundingClientRect();
      return {
        x: round(bounds.left + bounds.width / 2 - origin.left),
        y: round(bounds.top + bounds.height / 2 - origin.top),
        width: round(bounds.width),
        top: round(bounds.top - origin.top),
        bottom: round(bounds.bottom - origin.top),
        opacity: Number(Number(getComputedStyle(element).opacity).toFixed(2)),
      };
    };

    return {
      heading: part("heading"),
      twin: part("twin"),
      slot: part("compact"),
      bar: part("bar"),
      extras: part("extras"),
      material: part("material").opacity,
      edge: part("edge").opacity,
      firstRowTop: round(panel.querySelector("li")!.getBoundingClientRect().top - origin.top),
    };
  }, scrollTop);
}

test("the demo scrolls a long list under one real heading", async ({ page }) => {
  const demo = await openDemo(page);

  await expect(demo.getByRole("heading")).toHaveCount(1);
  await expect(demo.getByRole("heading", { name: "Notes", level: 3 })).toBeVisible();
  for (const copy of ["compact", "twin"]) {
    await expect(demo.locator(`[data-slot="condensing-header-${copy}"]`)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  }
  expect(await demo.evaluate((panel) => panel.scrollHeight / panel.clientHeight)).toBeGreaterThan(2);

  const rest = await read(demo, 0);
  expect(rest.heading.opacity).toBe(1);
  expect(rest.twin.opacity).toBe(0);
  expect(rest.material).toBe(0);
  expect(rest.edge).toBe(0);
  expect(rest.heading.y).toBeGreaterThan(rest.bar.bottom);
});

for (const driver of ["timeline", "frame"] as const) {
  test(`the title travels into the bar and back with the scroll (${driver})`, async ({ page }) => {
    if (driver === "frame") {
      // Browsers without scroll-driven animations take the requestAnimationFrame path.
      await page.addInitScript(() => {
        const supports = CSS.supports.bind(CSS);
        CSS.supports = (...query: [string, string?]) =>
          !query.join(":").includes("animation-timeline") && supports(...(query as [string]));
      });
    }
    const demo = await openDemo(page);
    await expect(demo.locator('[data-slot="condensing-header"]')).toHaveAttribute("data-driver", driver);

    const rest = await read(demo, 0);
    const midway = await read(demo, 21);
    // Both layers share a centre and blend, so it reads as one title on its way to the bar.
    expect(Math.abs(midway.heading.x - midway.twin.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(midway.heading.y - midway.twin.y)).toBeLessThanOrEqual(0.5);
    expect(midway.heading.x).toBeGreaterThan(rest.heading.x);
    expect(midway.heading.y).toBeLessThan(rest.heading.y);
    expect(midway.heading.width).toBeLessThan(rest.heading.width);
    expect(midway.heading.opacity).toBeGreaterThan(0.5);
    expect(midway.twin.opacity).toBeGreaterThan(0.5);
    // The content has moved exactly as far as the scroll.
    expect(midway.firstRowTop).toBeCloseTo(rest.firstRowTop - 21, 0);
    expect(midway.material).toBe(0);
    expect(midway.edge).toBe(0);

    const condensed = await read(demo, 600);
    expect(Math.abs(condensed.twin.x - condensed.slot.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(condensed.twin.y - condensed.slot.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(condensed.twin.width - condensed.slot.width)).toBeLessThanOrEqual(1);
    expect(condensed.twin.opacity).toBe(1);
    expect(condensed.heading.opacity).toBe(0);
    expect(condensed.extras.opacity).toBe(0);
    expect(condensed.material).toBe(1);
    expect(condensed.edge).toBe(1);
    await expect(demo.getByRole("heading", { name: "Notes", level: 3 })).toHaveCount(1);

    // Linked to the position, not played: the same offset always gives the same frame.
    expect(await read(demo, 21)).toEqual(midway);
    expect(await read(demo, 0)).toEqual(rest);
  });
}

test("the bar has no edge until something is underneath it", async ({ page }) => {
  const demo = await openDemo(page);
  const rest = await read(demo, 0);
  // The subtitle sits right under the title, so it reaches the bar after the title's own height.
  const under = Math.round(rest.extras.top - rest.bar.bottom);
  expect(under).toBeGreaterThan(20);

  const before = await read(demo, under - 2);
  expect(before.edge).toBe(0);
  expect(before.material).toBeGreaterThan(0.8);

  const after = await read(demo, under + 14);
  expect(after.edge).toBe(1);
  expect(after.material).toBe(1);
  // The subtitle and search row fade while they slide under the bar.
  expect(after.extras.opacity).toBeGreaterThan(0);
  expect(after.extras.opacity).toBeLessThan(1);
});

test("a wheel scroll condenses the header without moving the page", async ({ page }) => {
  const demo = await openDemo(page);
  const header = demo.locator('[data-slot="condensing-header"]');
  const pageOffset = await page.evaluate(() => window.scrollY);

  await demo.hover();
  await page.mouse.wheel(0, 400);
  await expect(header).toHaveAttribute("data-collapsed", "");
  await expect.poll(async () => (await read(demo)).twin.opacity).toBe(1);

  await page.mouse.wheel(0, -1000);
  await expect(header).not.toHaveAttribute("data-condensed");
  await expect.poll(async () => (await read(demo)).heading.opacity).toBe(1);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageOffset);
});

test("keyboard scrolling condenses the header and skips the collapsed search", async ({ page }) => {
  const demo = await openDemo(page);
  const header = demo.locator('[data-slot="condensing-header"]');
  const search = demo.getByRole("searchbox", { name: "Search notes" });

  await demo.focus();
  await page.keyboard.press("Tab");
  await expect(demo.getByRole("button", { name: "Folders" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(demo.getByRole("button", { name: "Edit" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(search).toBeFocused();

  await demo.focus();
  await page.keyboard.press("End");
  await expect(header).toHaveAttribute("data-collapsed", "");
  await expect(demo.locator('[data-slot="condensing-header-extras"]')).toHaveAttribute("inert", "");
  // The bar's actions stay reachable; the collapsed search does not take focus.
  await page.keyboard.press("Tab");
  await expect(demo.getByRole("button", { name: "Folders" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(search).not.toBeFocused();

  await demo.focus();
  await page.keyboard.press("Home");
  await expect(header).not.toHaveAttribute("data-condensed");
  await expect(demo.locator('[data-slot="condensing-header-extras"]')).not.toHaveAttribute("inert");
});

test("reduced motion swaps the two titles with a cross-fade", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const demo = await openDemo(page);
  const heading = demo.locator('[data-slot="condensing-header-heading"]');
  const compact = demo.locator('[data-slot="condensing-header-compact"]');

  await expect(demo.locator('[data-slot="condensing-header-twin"]')).toBeHidden();
  await expect(heading).toHaveCSS("transition-property", "opacity");
  await expect(heading).toHaveCSS("transition-duration", "0.18s");
  await expect(heading).toHaveCSS("opacity", "1");
  await expect(compact).toHaveCSS("opacity", "0");

  const rest = await read(demo, 0);
  const scrolled = await read(demo, 10);
  // Nothing scales or slides sideways: the large title only scrolls away with the content.
  expect(scrolled.heading.width).toBe(rest.heading.width);
  expect(scrolled.heading.x).toBe(rest.heading.x);
  expect(scrolled.heading.y).toBeCloseTo(rest.heading.y - 10, 0);

  await read(demo, 600);
  await expect(compact).toHaveCSS("opacity", "1");
  await expect(heading).toHaveCSS("opacity", "0");
  await expect(demo.locator('[data-slot="condensing-header-material"]')).toHaveCSS("opacity", "1");
  await expect(demo.locator('[data-slot="condensing-header-edge"]')).toHaveCSS("opacity", "1");

  await read(demo, 0);
  await expect(compact).toHaveCSS("opacity", "0");
  await expect(heading).toHaveCSS("opacity", "1");
  await expect(demo.locator('[data-slot="condensing-header-material"]')).toHaveCSS("opacity", "0");
});

test("reduced transparency gives the bar a solid background", async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  const demo = await openDemo(page);
  const material = demo.locator('[data-slot="condensing-header-material"]');

  await expect(material).toHaveCSS("backdrop-filter", "none");
  expect(
    await material.evaluate((element) => {
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.fillStyle = getComputedStyle(element).backgroundColor;
      probe.fillRect(0, 0, 1, 1);
      return probe.getImageData(0, 0, 1, 1).data[3];
    }),
  ).toBe(255);
});

test("more contrast gives the bar a solid background and a full-strength border", async ({ page }) => {
  const demo = await openDemo(page);
  const material = demo.locator('[data-slot="condensing-header-material"]');
  const edge = demo.locator('[data-slot="condensing-header-edge"]');
  await expect(material).not.toHaveCSS("backdrop-filter", "none");
  const hairline = await edge.evaluate((element) => getComputedStyle(element).backgroundColor);

  await page.emulateMedia({ contrast: "more" });
  await expect(material).toHaveCSS("backdrop-filter", "none");
  const foreground = await demo.evaluate((panel) => getComputedStyle(panel).color);
  await expect(edge).toHaveCSS("background-color", foreground);
  expect(foreground).not.toBe(hairline);
  expect((await read(demo, 600)).edge).toBe(1);
});

test("the header fits a phone and docks the title in the centre of the bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const demo = await openDemo(page);

  const condensed = await read(demo, 600);
  expect(Math.abs(condensed.twin.x - condensed.bar.x)).toBeLessThanOrEqual(1);
  expect(condensed.twin.opacity).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("registry serves condensing-header source", async ({ request }) => {
  const response = await request.get("/r/condensing-header.json");
  expect(response.ok()).toBeTruthy();

  const item = await response.json();
  expect(item.name).toBe("condensing-header");
  expect(item.type).toBe("registry:block");
  expect(item.files[0]).toMatchObject({
    type: "registry:component",
    target: "components/blocks/condensing-header.tsx",
  });
  expect(item.files[0].content).toContain("export function CondensingHeader");
});
