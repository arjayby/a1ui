import { expect, test } from "./fixtures";
import registry from "../registry.json" with { type: "json" };

const framed = {
  components: [
    "alert-dialog",
    "context-menu",
    "dialog",
    "dropdown-menu",
    "hover-card",
    "lightbox",
    "popover",
    "select",
    "sheet",
    "toast",
    "tooltip",
  ],
  blocks: ["activity-pill", "command-palette"],
};

for (const group of ["components", "blocks"] as const) {
  test(`${group} catalog has two columns at most and stacks on a phone`, async ({ page }) => {
    for (const [width, columns] of [
      [1920, 2],
      [1440, 2],
      [390, 1],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${group}`);
      const lefts = await page
        .locator(".catalog-card")
        .evaluateAll((cards) => [
          ...new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left))),
        ]);
      expect(lefts).toHaveLength(columns);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });

  test(`${group} catalog cards show the docs demos as pictures`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/${group}`);
    const type = group === "blocks" ? "registry:block" : "registry:component";
    const names = registry.items.filter((item) => item.type === type).map((item) => item.name);
    const previews = page.locator(".catalog-card .catalog-preview");
    await expect(previews).toHaveCount(names.length);

    for (const name of names) {
      const card = page.locator(".catalog-card").filter({ has: page.locator(`a[href="/${group}/${name}"]`) });
      const preview = card.locator(".catalog-preview");
      // A picture of the component, not a control: nothing in it takes focus or a click.
      await expect(preview).toHaveAttribute("inert", "");
      if (framed[group].includes(name)) {
        await expect(preview.locator("iframe")).toHaveAttribute("src", `/preview/${group}/${name}`);
      } else {
        await expect(preview.locator("iframe")).toHaveCount(0);
        expect(await preview.evaluate((element) => element.childElementCount)).toBeGreaterThan(0);
      }
      // The demo's controls belong to the docs page.
      for (const controls of await preview.locator(".component-demo-controls").all()) {
        await expect(controls).toBeHidden();
      }
    }
  });
}

test("components that open over the page are shown open inside their card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/components");
  const frame = (name: string) => {
    const card = page.locator(".catalog-card").filter({ has: page.locator(`a[href="/components/${name}"]`) });
    return { card, inner: card.locator("iframe").contentFrame() };
  };
  const shown = async (name: string, selector: string) => {
    const { card, inner } = frame(name);
    await card.scrollIntoViewIfNeeded();
    // A frame loads when its card nears the screen, then hydrates and opens its demo.
    await expect(inner.locator(selector).first()).toBeVisible({ timeout: 20_000 });
    return inner;
  };

  await shown("alert-dialog", '[role="alertdialog"]');
  const dialog = await shown("dialog", '[role="dialog"]');
  await shown("dropdown-menu", '[role="menu"]');
  await shown("context-menu", '[role="menu"]');
  await shown("hover-card", '[data-slot="hover-card-content"]');
  await shown("lightbox", '[data-slot="lightbox"]');
  await shown("popover", '[data-slot="popover-content"], [role="dialog"]');
  await shown("select", '[role="listbox"]');
  await shown("toast", '[data-slot="toast"]');
  await shown("tooltip", '[role="tooltip"]');
  const sheet = await shown("sheet", '[data-slot="sheet-content"]');
  await expect(sheet.locator('[data-slot="sheet-content"]')).toBeInViewport();

  // Framed demos lay out at a desktop width, so the dialog is centred, not a phone drawer.
  expect(await dialog.locator("html").evaluate(() => window.innerWidth)).toBeGreaterThanOrEqual(640);

  // The open dialogs stay inside their frames: the catalog itself still scrolls and keeps focus.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
});

test("blocks that open over the page are shown open inside their card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blocks");
  for (const [name, selector] of [
    ["command-palette", '[data-slot="command-palette"]'],
    ["activity-pill", '[data-slot="activity-pill"]'],
  ]) {
    const card = page.locator(".catalog-card").filter({ has: page.locator(`a[href="/blocks/${name}"]`) });
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("iframe").contentFrame().locator(selector).first()).toBeVisible({
      timeout: 20_000,
    });
  }
});

test("framed previews stay out of search engines and unknown ones are not found", async ({
  page,
  request,
}) => {
  await page.goto("/preview/components/dialog");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator(".docs-header")).toHaveCount(0);
  expect((await request.get("/preview/components/badge")).status()).toBe(404);
  expect((await request.get("/preview/nothing/dialog")).status()).toBe(404);
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /preview/");
});
