import { expect, test, type Locator } from "@playwright/test";

// Clicks inside the page, then samples one segment's opacity and horizontal offset every frame.
function clickAndSample(target: Locator, segment: string, ms = 400) {
  return target.evaluate(
    async (element: HTMLElement, { segment, ms }) => {
      element.click();
      const samples: { opacity: number; x: number }[] = [];
      const began = performance.now();
      while (performance.now() - began < ms) {
        const node = document.querySelector<HTMLElement>(`.demo-frame ${segment}`);
        if (node) {
          const style = getComputedStyle(node);
          samples.push({ opacity: Number(style.opacity), x: new DOMMatrix(style.transform).m41 });
        }
        await new Promise(requestAnimationFrame);
      }
      return samples;
    },
    { segment, ms },
  );
}

// Outgoing segments stay in the DOM while they animate, marked aria-hidden.
const current = (nav: Locator) => nav.locator('li:not([aria-hidden]) > [aria-current="page"]');

const labels = (nav: Locator) =>
  nav
    .locator('[data-slot="breadcrumb-list"] > li')
    .evaluateAll((items) =>
      items.map((item) => item.querySelector("a, span[aria-current], button")?.textContent || "…"),
    );

test("the ellipsis staggers hidden segments in and new segments slide in from the right", async ({
  page,
}) => {
  await page.goto("/components/breadcrumb");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const nav = frame.getByRole("navigation", { name: "Breadcrumb" });
  await expect(nav.getByRole("listitem")).toHaveCount(4);
  expect(await labels(nav)).toEqual(["Home", "…", "registry", "components"]);
  await expect(current(nav)).toHaveText("components");

  const ellipsis = nav.getByRole("button", { name: "Show 3 hidden pages" });
  const reveal = await clickAndSample(ellipsis, '[data-index="2"]');
  expect(reveal.some((sample) => sample.opacity > 0.05 && sample.opacity < 0.95)).toBe(true);
  expect(reveal.some((sample) => sample.x < -0.5)).toBe(true);
  await expect(nav.getByRole("link", { name: "Projects" })).toBeFocused();
  await expect.poll(() => labels(nav)).toEqual(["Home", "Projects", "a1ui", "src", "registry", "components"]);

  await page.waitForTimeout(150);
  await page.keyboard.press("Escape");
  await expect(nav.getByRole("button", { name: "Show 3 hidden pages" })).toBeFocused();
  await expect.poll(() => labels(nav)).toEqual(["Home", "…", "registry", "components"]);

  await frame.getByRole("button", { name: "Up one level" }).click();
  await expect(current(nav)).toHaveText("registry");
  await expect.poll(() => labels(nav)).toEqual(["Home", "…", "src", "registry"]);

  const deeper = await clickAndSample(
    frame.getByRole("button", { name: "components", exact: true }),
    '[data-index="5"]',
  );
  expect(deeper.some((sample) => sample.x > 1 && sample.x < 15)).toBe(true);
  expect(deeper.some((sample) => sample.opacity > 0.05 && sample.opacity < 0.95)).toBe(true);
  await expect(current(nav)).toHaveText("components");
  await expect(nav.getByRole("link", { name: "registry" })).toHaveAttribute(
    "href",
    "#/Projects/a1ui/src/registry",
  );
});

test("collapses to fit a 390px screen and expands instantly with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/breadcrumb");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Collapse at:/ }).click();
  await page.getByRole("menuitem", { name: "fit only", exact: true }).click();
  const frame = page.locator(".demo-frame");
  const nav = frame.getByRole("navigation", { name: "Breadcrumb" });
  const ellipsis = nav.getByRole("button", { name: /hidden pages?$/ });
  await expect(ellipsis).toBeVisible();
  const [list, box] = await Promise.all([nav.locator("ol").first().boundingBox(), nav.boundingBox()]);
  // Fitting keeps the collapsed trail on a single line inside the nav.
  expect(list!.height).toBeLessThan(32);
  expect(list!.x + list!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);

  const reveal = await clickAndSample(ellipsis, '[data-index="1"]', 200);
  expect(reveal.length).toBeGreaterThan(0);
  expect(reveal.every((sample) => sample.opacity === 1 && Math.abs(sample.x) < 0.01)).toBe(true);
  await expect(nav.getByRole("link", { name: "Projects" })).toBeFocused();
  await expect(current(nav)).toHaveText("components");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the breadcrumb", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/breadcrumb"]').click();
  await expect(page.getByRole("heading", { name: "Breadcrumb", exact: true })).toBeVisible();
  const item = await (await request.get("/r/breadcrumb.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/breadcrumb.tsx");
  expect(item.files[0].content).toContain("export function Breadcrumb");
  const guide = await request.get("/docs/components/breadcrumb.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/breadcrumb");
});
