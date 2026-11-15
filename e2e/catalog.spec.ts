import { expect, test } from "./fixtures";
import registry from "../registry.json" with { type: "json" };

for (const group of ["components", "blocks"] as const) {
  const type = group === "blocks" ? "registry:block" : "registry:component";
  const entries = registry.items
    .filter((item) => item.type === type)
    .sort((a, b) => a.title.localeCompare(b.title));

  test(`${group} catalog is one numbered row per entry, in title order`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${group}`);
    const rows = page.locator(".catalog-row");
    await expect(rows).toHaveCount(entries.length);
    await expect(page.locator(".catalog-row-link")).toHaveText(entries.map((entry) => entry.title));
    await expect(page.locator(".catalog-row-number")).toHaveText(
      entries.map((_, index) => String(index + 1).padStart(2, "0")),
    );
    await expect(page.locator(".catalog-row-description")).toHaveText(
      entries.map((entry) => entry.description),
    );
    // An index, not a gallery: no demo is mounted or framed on the page.
    await expect(page.locator(".catalog-list iframe, .catalog-list .demo-frame")).toHaveCount(0);
  });

  test(`${group} catalog rows are a single column that fits the screen`, async ({ page }) => {
    for (const width of [1920, 1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${group}`);
      const lefts = await page
        .locator(".catalog-row")
        .evaluateAll((rows) => [...new Set(rows.map((row) => Math.round(row.getBoundingClientRect().left)))]);
      expect(lefts).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      // The description never pushes a row past two lines of text on a phone, or one on a desktop.
      const tallest = await page
        .locator(".catalog-row")
        .evaluateAll((rows) => Math.max(...rows.map((row) => row.getBoundingClientRect().height)));
      expect(tallest).toBeLessThanOrEqual(width < 640 ? 96 : 48);
    }
  });

  test(`${group} catalog row is one link that covers the whole row`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${group}`);
    const [first] = entries;
    const row = page.locator(".catalog-row").first();
    await expect(row.getByRole("link")).toHaveCount(1);
    await expect(row.getByRole("link")).toHaveAccessibleName(first.title);
    // A click on the description, well away from the name, still opens the entry.
    const description = (await row.locator(".catalog-row-description").boundingBox())!;
    await page.mouse.click(description.x + description.width / 2, description.y + description.height / 2);
    await expect(page).toHaveURL(new RegExp(`/${group}/${first.name}$`));
  });
}

test("the retired card previews are not served", async ({ request }) => {
  expect((await request.get("/preview/components/dialog")).status()).toBe(404);
  expect(await (await request.get("/robots.txt")).text()).not.toContain("/preview/");
});
