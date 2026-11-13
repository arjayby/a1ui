import { expect, test } from "./fixtures";

test("chips pop in with a drawn check", async ({ page }) => {
  await page.goto("/components/chip-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const teams = frame.getByRole("group", { name: "Teams" });
  const marketing = teams.getByRole("button", { name: "Marketing" });
  await expect(marketing).toHaveAttribute("aria-pressed", "false");
  const samples = await marketing.evaluate(async (element: HTMLElement) => {
    element.click();
    const scales: number[] = [];
    const lengths: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      const fill = element.querySelector<HTMLElement>('[data-slot="chip-group-fill"]');
      const path = element.querySelector('[data-slot="chip-group-check"] path');
      if (fill) scales.push(fill.getBoundingClientRect().width / element.getBoundingClientRect().width);
      if (path) lengths.push(Number.parseFloat(path.getAttribute("stroke-dasharray") ?? "0"));
      await new Promise(requestAnimationFrame);
    }
    return { scales, lengths };
  });
  expect(samples.scales.some((scale) => scale > 0.6 && scale < 0.97)).toBe(true);
  expect(samples.lengths.some((length) => length > 0.05 && length < 0.95)).toBe(true);
  await expect(marketing).toHaveAttribute("aria-pressed", "true");
  await expect(teams.getByRole("button")).toHaveCount(3);

  // The centered row re-centers while the new check widens, so press by keyboard rather than position.
  await teams.getByRole("button", { name: "Design" }).press("Space");
  await expect(teams.getByRole("button", { name: "Design" })).toHaveAttribute("aria-pressed", "false");
});

test("outline chips fit on mobile and press instantly with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/chip-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Variant:/ }).click();
  await page.getByRole("menuitem", { name: "outline", exact: true }).click();
  const frame = page.locator(".demo-frame");
  const marketing = frame.getByRole("button", { name: "Marketing" });
  await marketing.click();
  await expect(marketing).toHaveAttribute("aria-pressed", "true");
  const fill = marketing.locator('[data-slot="chip-group-fill"]');
  const [fillBox, itemBox] = await Promise.all([fill.boundingBox(), marketing.boundingBox()]);
  expect(fillBox!.width).toBeGreaterThanOrEqual(itemBox!.width - 1);
  const teams = frame.getByRole("group", { name: "Teams" });
  const teamsBox = await teams.boundingBox();
  expect(teamsBox!.x).toBeGreaterThanOrEqual(0);
  expect(teamsBox!.x + teamsBox!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the chip group", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/chip-group"]').click();
  await expect(page.getByRole("heading", { name: "Chip Group", exact: true })).toBeVisible();
  const item = await (await request.get("/r/chip-group.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/chip-group.tsx");
  expect(item.files[0].content).toContain("export function ChipGroupItem");
  const guide = await request.get("/docs/components/chip-group.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/chip-group");
});

test("the old toggle group URLs redirect to the chip group", async ({ page, request }) => {
  await page.goto("/components/toggle-group");
  await expect(page).toHaveURL(/\/components\/chip-group$/);
  const guide = await request.get("/docs/components/toggle-group.md");
  expect(guide.url()).toMatch(/\/docs\/components\/chip-group\.md$/);
});
