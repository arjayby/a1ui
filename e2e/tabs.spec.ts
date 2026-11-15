import { expect, test } from "./fixtures";

test("indicator glides between tabs and panels follow mouse and keyboard", async ({ page }) => {
  await page.goto("/components/tabs");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  // The outgoing panel stays in the DOM, inert, while it fades out.
  const panel = frame.locator('[role="tabpanel"]:not([inert])');
  const result = await frame.evaluate(async (element) => {
    const tabs = [...element.querySelectorAll<HTMLButtonElement>('[data-slot="tabs-trigger"]')];
    const left = () => element.querySelector('[data-slot="tabs-indicator"]')!.getBoundingClientRect().left;
    const start = left();
    tabs[2].click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      samples.push(left());
      await new Promise(requestAnimationFrame);
    }
    return { start, target: tabs[2].getBoundingClientRect().left, samples };
  });
  expect(result.samples.some((x) => x > result.start + 2 && x < result.target - 2)).toBe(true);
  await expect(frame.getByRole("tab", { name: "Reports" })).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("Scheduled reports");
  await expect(frame.locator('[data-slot="tabs-indicator"]')).toHaveCount(1);

  await frame.getByRole("tab", { name: "Reports" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("Integrations connected");
});

test("one hover highlight follows the pointer and the panel resizes smoothly", async ({ page }) => {
  await page.goto("/components/tabs");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const hover = frame.locator('[data-slot="tabs-hover"]');

  await frame.getByRole("tab", { name: "Analytics" }).hover();
  await frame.getByRole("tab", { name: "Reports" }).hover();
  await expect(hover).toHaveCount(1);
  await expect(
    frame.getByRole("tab", { name: "Reports" }).locator('[data-slot="tabs-hover"][data-visible]'),
  ).toHaveCount(1);
  // Over the active tab the highlight hides instead of stacking on the indicator.
  await frame.getByRole("tab", { name: "Overview" }).hover();
  await expect(hover).not.toHaveAttribute("data-visible", "");
  await page.mouse.move(2, 2);
  await expect(hover).toHaveCount(0);

  const result = await frame.evaluate(async (element) => {
    const panel = () => element.querySelector<HTMLElement>('[data-slot="tabs-content"]:not([inert])')!;
    const start = panel().offsetHeight;
    element.querySelectorAll<HTMLButtonElement>('[data-slot="tabs-trigger"]')[1].click();
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 200) {
      await new Promise(requestAnimationFrame);
      samples.push(panel().offsetHeight);
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { start, samples, end: panel().offsetHeight, inline: panel().style.height };
  });
  expect(result.end).toBeGreaterThan(result.start + 20);
  expect(result.samples.some((height) => height > result.start + 2 && height < result.end - 2)).toBe(true);
  expect(result.inline).toBe("");
});

test("the pill can be dragged to another tab and the old panel fades out in place", async ({ page }) => {
  await page.goto("/components/tabs");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const panel = frame.locator('[role="tabpanel"]:not([inert])');
  const indicator = frame.locator('[data-slot="tabs-indicator"]');
  const middle = async (name: string) => {
    const box = (await frame.getByRole("tab", { name }).boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const [from, to] = [await middle("Overview"), await middle("Reports")];

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, from.y, { steps: 30 });
  // Mid-drag the pill follows the pointer, offset only by the few pixels it took to start the
  // drag, and nothing is selected yet.
  const held = (await indicator.boundingBox())!;
  expect(Math.abs(held.x + held.width / 2 - (from.x + to.x) / 2)).toBeLessThan(12);
  await expect(frame.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(frame.getByRole("tab", { name: "Reports" })).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("Scheduled reports");

  // A short drag that stays nearest the same tab drops the pill back home.
  await page.mouse.move(to.x, to.y);
  await page.mouse.down();
  await page.mouse.move(to.x + 14, to.y, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(frame.getByRole("tab", { name: "Reports" })).toHaveAttribute("aria-selected", "true");
  await expect
    .poll(async () => {
      const box = (await indicator.boundingBox())!;
      return Math.abs(box.x + box.width / 2 - to.x);
    })
    .toBeLessThan(1);
  await expect(indicator).toHaveCount(1);

  // The outgoing panel is taken out of flow while it fades, then removed.
  await frame.getByRole("tab", { name: "Overview" }).click();
  const leaving = frame.locator('[data-slot="tabs-content"][data-ending-style]');
  await expect(leaving).toHaveCSS("position", "absolute");
  await expect(leaving).toHaveCount(0);
  await expect(frame.locator('[data-slot="tabs-content"]')).toHaveCount(1);
});

test("underline variant keeps its bar visible on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/tabs");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Variant:/ }).click();
  await page.getByRole("menuitem", { name: "underline", exact: true }).click();
  const frame = page.locator(".demo-frame");
  // The outgoing panel stays in the DOM, inert, while it fades out.
  const panel = frame.locator('[role="tabpanel"]:not([inert])');
  await frame.getByRole("tab", { name: "Analytics" }).click();
  const bar = frame.locator('[data-slot="tabs-indicator"]');
  await expect(bar).toBeVisible();
  const [barBox, listBox] = await Promise.all([bar.boundingBox(), frame.getByRole("tablist").boundingBox()]);
  expect(barBox!.height).toBeGreaterThan(0);
  expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(listBox!.y + listBox!.height);
  await expect(panel).toContainText("Average session length");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include tabs", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-row-link[href="/components/tabs"]').click();
  await expect(page.getByRole("heading", { name: "Tabs", exact: true })).toBeVisible();
  const item = await (await request.get("/r/tabs.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/tabs.tsx");
  expect(item.files[0].content).toContain("export function TabsTrigger");
  const guide = await request.get("/docs/components/tabs.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/tabs");
});
