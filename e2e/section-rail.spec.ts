import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/section-rail");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("section rail demo has a large viewport and a full sample document", async ({ page }) => {
  const demo = page.getByRole("region", { name: "Scrollable Section Rail demo" });
  const rail = demo.getByRole("navigation", { name: "Demo sections" });
  const layout = await demo.evaluate((element) => {
    const rail = element.querySelector<HTMLElement>('nav[aria-label="Demo sections"]');

    if (!rail) throw new Error("Demo rail is missing");

    const demoRect = element.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();

    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      centerDelta: Math.abs(railRect.top + railRect.height / 2 - (demoRect.top + demoRect.height / 2)),
    };
  });

  await expect(rail.getByRole("link")).toHaveCount(12);
  expect(layout.clientHeight).toBeGreaterThanOrEqual(480);
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight * 3);
  await expect(demo.locator("section p")).toHaveCount(24);
  expect(layout.centerDelta).toBeLessThanOrEqual(2);

  await demo.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect(rail.getByRole("link", { name: "Summary" })).toHaveAttribute("aria-current", "location");
});

for (const activation of ["click", "keyboard"] as const) {
  test(`marker ${activation} scrolls to its section and updates the active marker`, async ({ page }) => {
    const demo = page.getByRole("region", { name: "Scrollable Section Rail demo" });
    const rail = demo.getByRole("navigation", { name: "Demo sections" });
    const target = rail.getByRole("link", { name: "Motion", exact: true });
    await demo.scrollIntoViewIfNeeded();
    const initialScrollTop = await demo.evaluate((element) => element.scrollTop);
    let outerScrollTop: number;

    if (activation === "click") {
      outerScrollTop = await page.evaluate(() => window.scrollY);
      await target.click();
    } else {
      await demo.focus();
      for (let index = 0; index < 8; index += 1) await page.keyboard.press("Tab");
      await expect(target).toBeFocused();
      outerScrollTop = await page.evaluate(() => window.scrollY);
      await page.keyboard.press("Enter");
    }

    await expect(page).toHaveURL(/#rail-demo-motion$/);
    await expect(target).toHaveAttribute("aria-current", "location");
    await expect.poll(() => demo.evaluate((element) => element.scrollTop)).toBeGreaterThan(initialScrollTop);
    await expect
      .poll(() =>
        demo.evaluate((element) => {
          const section = element.querySelector("#rail-demo-motion");
          if (!section) throw new Error("Motion section is missing");
          const container = element.getBoundingClientRect();
          const bounds = section.getBoundingClientRect();
          return bounds.top >= container.top && bounds.top < container.bottom;
        }),
      )
      .toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBe(outerScrollTop);
  });
}

test("mobile rail jumps stay inside the panel and respect reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const demo = page.getByRole("region", { name: "Scrollable Section Rail demo" });
  await demo.scrollIntoViewIfNeeded();
  const outerScrollTop = await page.evaluate(() => window.scrollY);
  await demo.getByRole("link", { name: "Motion", exact: true }).click();
  await expect(demo.getByRole("link", { name: "Motion", exact: true })).toHaveAttribute(
    "aria-current",
    "location",
  );
  expect(await demo.evaluate((element) => element.scrollTop)).toBeGreaterThan(1000);
  expect(await page.evaluate(() => window.scrollY)).toBe(outerScrollTop);
});
