import { expect, test } from "@playwright/test";

test("segmented surface slides between items and follows the keyboard", async ({ page }) => {
  await page.goto("/components/toggle-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const view = frame.getByRole("group", { name: "View" });
  const result = await view.evaluate(async (element) => {
    const items = [...element.querySelectorAll<HTMLButtonElement>('[data-slot="toggle-group-item"]')];
    const left = () =>
      element.querySelector('[data-slot="toggle-group-indicator"]')!.getBoundingClientRect().left;
    const start = left();
    items[2].click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      samples.push(left());
      await new Promise(requestAnimationFrame);
    }
    return { start, target: items[2].getBoundingClientRect().left, samples };
  });
  expect(result.samples.some((x) => x > result.start + 2 && x < result.target - 2)).toBe(true);
  const calendar = view.getByRole("button", { name: "Calendar" });
  await expect(calendar).toHaveAttribute("aria-pressed", "true");
  await expect(view.locator('[data-slot="toggle-group-indicator"]')).toHaveCount(1);

  // Clicking the pressed item keeps it pressed.
  await calendar.click();
  await expect(calendar).toHaveAttribute("aria-pressed", "true");

  const alignment = frame.getByRole("group", { name: "Text alignment" });
  await alignment.getByRole("button", { name: "Align left" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(alignment.getByRole("button", { name: "Align center" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(alignment.getByRole("button", { name: "Justify" })).toBeDisabled();
});

test("chips pop in with a drawn check in multiple mode", async ({ page }) => {
  await page.goto("/components/toggle-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Mode:/ }).click();
  await page.getByRole("menuitem", { name: "multiple", exact: true }).click();
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
      const fill = element.querySelector<HTMLElement>('[data-slot="toggle-group-fill"]');
      const path = element.querySelector('[data-slot="toggle-group-check"] path');
      if (fill) scales.push(fill.getBoundingClientRect().width / element.getBoundingClientRect().width);
      if (path) lengths.push(Number.parseFloat(path.getAttribute("stroke-dasharray") ?? "0"));
      await new Promise(requestAnimationFrame);
    }
    return { scales, lengths };
  });
  expect(samples.scales.some((scale) => scale > 0.6 && scale < 0.97)).toBe(true);
  expect(samples.lengths.some((length) => length > 0.05 && length < 0.95)).toBe(true);
  await expect(marketing).toHaveAttribute("aria-pressed", "true");
  await expect(frame.getByText("3 teams selected")).toBeVisible();

  // The centered row re-centers while the new check widens, so press by keyboard rather than position.
  await teams.getByRole("button", { name: "Design" }).press("Space");
  await expect(teams.getByRole("button", { name: "Design" })).toHaveAttribute("aria-pressed", "false");
  await expect(frame.getByText("2 teams selected")).toBeVisible();
  await expect(teams.getByRole("button", { name: "Support" })).toBeDisabled();
});

test("outline chips fit on mobile and press instantly with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/toggle-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Mode:/ }).click();
  await page.getByRole("menuitem", { name: "multiple", exact: true }).click();
  await page.getByRole("button", { name: /^Variant:/ }).click();
  await page.getByRole("menuitem", { name: "outline", exact: true }).click();
  const frame = page.locator(".demo-frame");
  const italic = frame.getByRole("button", { name: "Italic" });
  await italic.click();
  await expect(italic).toHaveAttribute("aria-pressed", "true");
  const fill = italic.locator('[data-slot="toggle-group-fill"]');
  const [fillBox, itemBox] = await Promise.all([fill.boundingBox(), italic.boundingBox()]);
  expect(fillBox!.width).toBeGreaterThanOrEqual(itemBox!.width - 1);
  const teams = frame.getByRole("group", { name: "Teams" });
  const teamsBox = await teams.boundingBox();
  expect(teamsBox!.x).toBeGreaterThanOrEqual(0);
  expect(teamsBox!.x + teamsBox!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the toggle group", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/toggle-group"]').click();
  await expect(page.getByRole("heading", { name: "Toggle Group", exact: true })).toBeVisible();
  const item = await (await request.get("/r/toggle-group.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/toggle-group.tsx");
  expect(item.files[0].content).toContain("export function ToggleGroupItem");
  const guide = await request.get("/docs/components/toggle-group.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/toggle-group");
});
