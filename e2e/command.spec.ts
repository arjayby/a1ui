import { expect, test } from "@playwright/test";

test("highlight glides, results reflow, and the list height eases as the search narrows", async ({
  page,
}) => {
  await page.goto("/components/command");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const input = frame.getByRole("combobox", { name: "Search commands" });
  await input.focus();
  await expect(frame.locator('[data-slot="command-highlight"]')).toHaveCount(1);

  const glide = await frame.evaluate(async (element) => {
    const input = element.querySelector("input")!;
    const top = () => element.querySelector('[data-slot="command-highlight"]')!.getBoundingClientRect().top;
    const start = top();
    const samples: number[] = [];
    for (let step = 0; step < 3; step++) {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve));
      samples.push(top());
    }
    const began = performance.now();
    while (performance.now() - began < 250) {
      await new Promise(requestAnimationFrame);
      samples.push(top());
    }
    const target = element.querySelector("[data-highlighted]")!.getBoundingClientRect().top;
    return { start, target, samples };
  });
  expect(glide.samples.some((y) => y > glide.start + 4 && y < glide.target - 4)).toBe(true);
  await expect(frame.getByRole("option", { name: /Toggle dark mode/ })).toHaveAttribute(
    "data-highlighted",
    "",
  );

  const narrow = await frame.evaluate(async (element) => {
    const input = element.querySelector("input")!;
    const list = element.querySelector('[data-slot="command-list"]')!;
    const billing = () =>
      [...element.querySelectorAll('[role="option"]')].find((option) =>
        option.textContent?.includes("Billing"),
      )!;
    const startHeight = list.getBoundingClientRect().height;
    const startTop = billing().getBoundingClientRect().top;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "bil");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const heights: number[] = [];
    const tops: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 700) {
      await new Promise(requestAnimationFrame);
      heights.push(list.getBoundingClientRect().height);
      tops.push(billing().getBoundingClientRect().top);
    }
    return { startHeight, startTop, heights, tops };
  });
  const endHeight = narrow.heights.at(-1)!;
  const endTop = narrow.tops.at(-1)!;
  expect(endHeight).toBeLessThan(narrow.startHeight - 100);
  expect(narrow.heights.some((h) => h < narrow.startHeight - 4 && h > endHeight + 4)).toBe(true);
  expect(narrow.tops.some((y) => y < narrow.startTop - 4 && y > endTop + 4)).toBe(true);
  await expect(frame.getByRole("option")).toHaveCount(1);
  await expect(frame.getByText("Settings", { exact: true })).toBeVisible();

  await input.fill("zzz");
  await expect(frame.getByRole("status")).toHaveText("No results found.");
  await input.fill("calc");
  await page.keyboard.press("Enter");
  await expect(frame.locator('[data-slot="command-demo-result"]')).toHaveText("Ran “Calculator”");
  await expect(input).toHaveValue("calc");
});

test("⌘K springs the dialog in, runs a command, and closes", async ({ page }) => {
  await page.goto("/components/command");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const sampling = page.evaluate(async () => {
    const samples: { opacity: number; scale: number }[] = [];
    const began = performance.now();
    while (performance.now() - began < 1000) {
      await new Promise(requestAnimationFrame);
      const popup = document.querySelector<HTMLElement>('[data-slot="command-dialog"]');
      if (!popup) continue;
      const style = getComputedStyle(popup);
      samples.push({ opacity: Number(style.opacity), scale: new DOMMatrix(style.transform).a });
      if (samples.length > 40) break;
    }
    return samples;
  });
  await page.keyboard.press("ControlOrMeta+k");
  const samples = await sampling;
  expect(samples.some((s) => s.opacity > 0.05 && s.opacity < 0.95)).toBe(true);
  expect(samples.some((s) => s.scale > 0.96 && s.scale < 0.995)).toBe(true);

  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  // The site's own ⌘K search stays closed while the palette claims the shortcut.
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(dialog.getByRole("combobox")).toBeFocused();
  await page.keyboard.type("prof");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-slot="command-demo-result"]')).toHaveText("Ran “Profile”");

  await page.getByRole("button", { name: "Press ⌘K" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("dialog fits a phone and filters instantly with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/command");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Press ⌘K" }).click();
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);

  const heights = await dialog.evaluate(async (element) => {
    const input = element.querySelector("input")!;
    const list = element.querySelector('[data-slot="command-list"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "cal");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const samples: number[] = [];
    for (let frame = 0; frame < 12; frame++) {
      await new Promise(requestAnimationFrame);
      samples.push(list.getBoundingClientRect().height);
    }
    return samples;
  });
  // Reduced motion jumps straight to the new height: no in-between values, whenever it lands.
  const [before, after] = [heights[0], heights.at(-1)];
  expect(heights.every((height) => height === before || height === after)).toBe(true);
  await expect(dialog.getByRole("option")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include command", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/command"]').click();
  await expect(page.getByRole("heading", { name: "Command", exact: true })).toBeVisible();
  const item = await (await request.get("/r/command.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/command.tsx");
  expect(item.files[0].content).toContain("export function CommandDialog");
  const guide = await request.get("/docs/components/command.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/command");
});
