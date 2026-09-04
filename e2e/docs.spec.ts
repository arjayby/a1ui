import { expect, test } from "@playwright/test";

test("catalog opens component documentation in the agreed order", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Section Rail/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Spiral Text/ }).first()).toBeVisible();

  await page
    .getByRole("link", { name: /Section Rail/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/components\/section-rail$/);
  await expect(page.locator(".component-doc-body h2")).toHaveText([
    "Demo",
    "Installation",
    "Code",
    "API reference",
  ]);
});

test("selected component navigation keeps its label visible", async ({ page }) => {
  await page.goto("/components/section-rail");
  const activeLink = page
    .getByRole("navigation", { name: "Components" })
    .getByRole("link", { name: "Section Rail" });

  const colors = await activeLink.evaluate((element) => {
    const linkStyles = getComputedStyle(element);
    const pageStyles = getComputedStyle(document.body);

    return {
      background: linkStyles.backgroundColor,
      color: linkStyles.color,
      pageBackground: pageStyles.backgroundColor,
      pageForeground: pageStyles.color,
    };
  });

  expect(colors).toMatchObject({
    background: colors.pageForeground,
    color: colors.pageBackground,
  });
});

test("section rail demo is compact, scrollable, and has more markers", async ({ page }) => {
  await page.goto("/components/section-rail");

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

test("search finds component documentation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /Search/ }).click();

  const search = page.getByRole("dialog").getByRole("textbox");
  await search.fill("Spiral Text");
  await expect(page.getByRole("dialog").getByText("Spiral Text", { exact: true })).toBeVisible();
});

test("spiral text tightens and returns to rest after release", async ({ page }) => {
  await page.goto("/components/spiral-text");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const spiral = page.getByRole("img", { name: "THE CONTENT ARCHITECTURE ·" });

  await spiral.scrollIntoViewIfNeeded();
  const box = await spiral.boundingBox();
  if (!box) throw new Error("Spiral Text demo has no visible bounds");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(spiral).toHaveAttribute("data-interaction", "tightening");
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(spiral).toHaveAttribute("data-interaction", "releasing");
  await expect(spiral).toHaveAttribute("data-interaction", "resting", { timeout: 2_000 });
});

test("registry endpoints contain installable source", async ({ request }) => {
  const response = await request.get("/r/section-rail.json");
  expect(response.ok()).toBeTruthy();

  const item = await response.json();
  expect(item.name).toBe("section-rail");
  expect(item.files[0].content).toContain("export function SectionRail");
});

test("mobile navigation exposes the component selector and search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByLabel("Choose a component")).toBeVisible();
  await expect(page.getByRole("button", { name: "Search documentation" })).toBeVisible();
  await page.getByLabel("Choose a component").selectOption("/components/spiral-text");
  await expect(page).toHaveURL(/\/components\/spiral-text$/);
});
