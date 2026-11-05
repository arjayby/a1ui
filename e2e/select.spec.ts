import { expect, test, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("/components/select");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  return page.locator(".demo-frame").getByRole("combobox", { name: "Deploy region" });
}

test("list springs open, staggers its items, and fades out before hiding", async ({ page }) => {
  const trigger = await open(page);
  const frames = await trigger.evaluate(async (button: HTMLElement) => {
    async function sample() {
      const frames = [];
      const start = performance.now();
      while (performance.now() - start < 600) {
        await new Promise(requestAnimationFrame);
        const popup = document.querySelector('[data-slot="select-content"]');
        if (!popup || popup.closest("[hidden]")) continue;
        const items = [...popup.querySelectorAll('[data-slot="select-item"]')];
        frames.push({
          opacity: Number(getComputedStyle(popup).opacity),
          scale: new DOMMatrix(getComputedStyle(popup).transform).a,
          first: Number(getComputedStyle(items[0]).opacity),
          last: Number(getComputedStyle(items.at(-1)!).opacity),
        });
      }
      return frames;
    }
    button.click();
    const opening = await sample();
    button.click();
    const closing = await sample();
    return { opening, closing };
  });
  for (const transition of [frames.opening, frames.closing]) {
    expect(transition.some(({ opacity }) => opacity > 0.05 && opacity < 0.95)).toBe(true);
    expect(transition.some(({ scale }) => scale > 0.92 && scale < 0.99)).toBe(true);
  }
  // Later items trail the first one while the list opens.
  expect(frames.opening.some(({ first, last }) => first - last > 0.1)).toBe(true);
  expect(frames.opening.at(-1)).toMatchObject({ opacity: 1, last: 1 });
  expect(frames.opening.at(-1)?.scale).toBeCloseTo(1, 2);
  // Base UI keeps the closed list in the DOM, hidden, once the exit animation ends.
  await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("one highlight travels between items and the value slides in with a drawn check", async ({ page }) => {
  const trigger = await open(page);
  await expect(trigger).toHaveText("Select a region");
  await page.getByRole("button", { name: /^Position:/ }).click();
  await page.getByRole("menuitem", { name: "below", exact: true }).click();
  await trigger.click();
  const list = page.getByRole("listbox");
  await expect(list).toHaveCSS("opacity", "1");
  await expect(list).toHaveCSS("transform", "none");
  await expect(list).toHaveAttribute("data-side", "bottom");
  const listBox = (await list.boundingBox())!;
  expect(listBox.y).toBeGreaterThanOrEqual((await trigger.boundingBox())!.y + 30);
  await expect(list.getByRole("group")).toHaveCount(3);
  await expect(list.locator('[data-slot="select-separator"]')).toHaveCount(2);

  const first = list.getByRole("option", { name: "US East (Virginia)" });
  const target = list.getByRole("option", { name: "Europe (Frankfurt)" });
  await first.hover();
  await expect(first).toHaveAttribute("data-highlighted");
  const from = (await first.boundingBox())!.y - listBox.y;
  const to = (await target.boundingBox())!.y - listBox.y;
  const movement = list.evaluate(async (element) => {
    const positions = [];
    const start = performance.now();
    while (performance.now() - start < 1200) {
      await new Promise(requestAnimationFrame);
      for (const highlight of element.querySelectorAll('[data-slot="select-highlight"]'))
        positions.push(highlight.getBoundingClientRect().y - element.getBoundingClientRect().y);
    }
    return positions;
  });
  await target.hover();
  const positions = await movement;
  expect(positions.some((y) => y > from + 2 && y < to - 2)).toBe(true);
  expect(positions.at(-1)).toBeCloseTo(to, 0);
  await expect(list.locator('[data-slot="select-highlight"]')).toHaveCount(1);

  const disabled = list.getByRole("option", { name: "South America (São Paulo)" });
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await disabled.click({ force: true });
  await expect(list).toBeVisible();

  const texts = target.evaluate(async (option: HTMLElement) => {
    const counts = [];
    option.click();
    const start = performance.now();
    while (performance.now() - start < 300) {
      await new Promise(requestAnimationFrame);
      counts.push(document.querySelectorAll('[data-slot="select-value-text"]').length);
    }
    return counts;
  });
  expect((await texts).some((count) => count === 2)).toBe(true);
  await expect(trigger).toHaveText("Europe (Frankfurt)");
  await expect(page.locator('[data-slot="select-value-text"]')).toHaveCount(1);
  await expect(list).toBeHidden();

  const drawn = await trigger.evaluate(async (button: HTMLElement) => {
    button.click();
    const lengths = [];
    const start = performance.now();
    while (performance.now() - start < 700) {
      await new Promise(requestAnimationFrame);
      const path = document.querySelector('[data-slot="select-check"] path');
      if (path) lengths.push(Number.parseFloat(path.getAttribute("stroke-dasharray") ?? "1"));
    }
    return lengths;
  });
  expect(drawn.some((length) => length > 0.05 && length < 0.95)).toBe(true);
  await expect(list.getByRole("option", { name: "Europe (Frankfurt)" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(list.locator('[data-slot="select-check"]')).toHaveCount(1);
});

test("aligned list puts the selected item over the trigger and the keyboard can pick", async ({ page }) => {
  const trigger = await open(page);
  await trigger.click();
  const list = page.getByRole("listbox");
  await list.getByRole("option", { name: "Asia Pacific (Singapore)" }).click();
  await expect(list).toBeHidden();
  await expect(trigger).toHaveText("Asia Pacific (Singapore)");

  await trigger.click();
  await expect(list).toHaveCSS("opacity", "1");
  await expect(list).toHaveAttribute("data-side", "none");
  const selected = list.getByRole("option", { name: "Asia Pacific (Singapore)" });
  const value = (await page.locator('[data-slot="select-value"]').boundingBox())!;
  const text = (await selected.locator('[data-slot="select-item-text"]').boundingBox())!;
  expect(Math.abs(text.y + text.height / 2 - (value.y + value.height / 2))).toBeLessThan(2);
  expect(Math.abs(text.x - value.x)).toBeLessThan(2);
  await page.keyboard.press("Escape");
  await expect(list).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(list).toBeVisible();
  await expect(selected).toHaveAttribute("data-highlighted");
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("option", { name: "Asia Pacific (Tokyo)" })).toHaveAttribute(
    "data-highlighted",
  );
  await page.keyboard.press("Enter");
  await expect(list).toBeHidden();
  await expect(trigger).toHaveText("Asia Pacific (Tokyo)");
});

test("reduced motion opens instantly on mobile and stays inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const trigger = await open(page);
  const first = await trigger.evaluate(async (button: HTMLElement) => {
    button.click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const popup = document.querySelector('[data-slot="select-content"]')!;
    return Number(getComputedStyle(popup).opacity);
  });
  expect(first).toBe(1);
  const list = page.getByRole("listbox");
  const box = (await list.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await list.getByRole("option", { name: "US West (Oregon)" }).click();
  await expect(list).toBeHidden();
  await expect(trigger).toHaveText("US West (Oregon)");
  await expect(page.locator('[data-slot="select-value-text"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the select", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/select"]').click();
  await expect(page.getByRole("heading", { name: "Select", exact: true })).toBeVisible();
  const item = await (await request.get("/r/select.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/select.tsx");
  expect(item.files[0].content).toContain("export function SelectContent");
  const guide = await request.get("/docs/components/select.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/select");
});
