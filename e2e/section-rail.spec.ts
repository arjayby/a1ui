import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/section-rail");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("section rail demo is compact, scrollable, and has more markers", async ({ page }) => {
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
  expect(layout.clientHeight).toBeLessThanOrEqual(320);
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);
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

    if (activation === "click") {
      await target.click();
    } else {
      await demo.focus();
      for (let index = 0; index < 8; index += 1) await page.keyboard.press("Tab");
      await expect(target).toBeFocused();
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
  });
}
