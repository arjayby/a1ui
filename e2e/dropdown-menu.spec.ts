import { expect, test } from "@playwright/test";

const highlight = '[data-slot="dropdown-menu-highlight"]';

test("popup fades and scales on both open and close before unmounting", async ({ page }) => {
  await page.goto("/components/dropdown-menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  const trigger = page.getByRole("button", { name: "Workspace", exact: true });
  const frames = await trigger.evaluate(async (button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error("Expected a button");
    async function sample() {
      const frames = [];
      const start = performance.now();
      while (performance.now() - start < 350) {
        await new Promise(requestAnimationFrame);
        const popup = document.querySelector('[data-slot="dropdown-menu-content"]');
        if (popup) {
          const style = getComputedStyle(popup);
          frames.push({ opacity: Number(style.opacity), scale: parseFloat(style.scale) });
        }
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
    expect(transition.some(({ opacity }) => opacity > 0 && opacity < 1)).toBe(true);
    expect(transition.some(({ scale }) => scale > 0.95 && scale < 1)).toBe(true);
  }
  expect(frames.opening.at(-1)?.opacity).toBe(1);
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0);
});

test("hover and keyboard focus move the shared highlight without activating actions", async ({ page }) => {
  await page.goto("/components/dropdown-menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  const trigger = page.getByRole("button", { name: "Workspace", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Workspace actions" });
  await expect(menu).toHaveCSS("opacity", "1");
  await expect(menu.getByRole("menuitem")).toHaveCount(7);
  await expect(menu.getByRole("group")).toHaveCount(2);
  await expect(menu.locator("svg")).toHaveCount(0);
  await expect(page.getByText("Resources", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Hover a row or use the arrow keys", { exact: true })).toHaveCount(0);
  const first = menu.getByRole("menuitem", { name: "New project", exact: true });
  const settings = menu.getByRole("menuitem", { name: "Settings", exact: true });
  await first.hover();
  await expect(first).toHaveAttribute("data-highlighted");
  const start = await first.boundingBox();
  const destination = await settings.boundingBox();
  const menuBox = await menu.boundingBox();
  if (!start || !destination || !menuBox) throw new Error("Expected visible menu geometry");

  const movement = menu.evaluate(async (element) => {
    const positions = [];
    const start = performance.now();
    while (performance.now() - start < 650) {
      await new Promise(requestAnimationFrame);
      for (const indicator of element.querySelectorAll('[data-slot="dropdown-menu-highlight"]')) {
        positions.push(indicator.getBoundingClientRect().y - element.getBoundingClientRect().y);
      }
    }
    return positions;
  });
  await settings.hover();
  const positions = await movement;
  expect(positions.some((y) => y > start.y - menuBox.y + 2 && y < destination.y - menuBox.y - 2)).toBe(true);
  expect(positions.at(-1)).toBeCloseTo(destination.y - menuBox.y, 0);
  await expect(menu.locator(highlight)).toHaveCount(1);
  await expect(settings).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".demo-frame").getByRole("status")).toBeEmpty();

  await page.keyboard.press("Home");
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute("data-highlighted");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Projects", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const disabled = menu.getByRole("menuitem", { name: "Invite members" });
  await expect(disabled).toBeFocused();
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await expect(disabled).toHaveAttribute("data-highlighted");
  await page.keyboard.press("Enter");
  await expect(menu).toBeVisible();
  await expect(page.locator(".demo-frame").getByRole("status")).toBeEmpty();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Switch workspace", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute("data-highlighted");
  await page.keyboard.press("Enter");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".demo-frame").getByRole("status")).toHaveText("Settings selected");

  await page.keyboard.press("ArrowDown");
  await expect(first).toBeFocused();
  await page.keyboard.type("se");
  await expect(settings).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("nested menu opens with hover and keyboard, keeps its own highlight, and selects an action", async ({
  page,
}) => {
  await page.goto("/components/dropdown-menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  const trigger = page.getByRole("button", { name: "Workspace", exact: true });
  await trigger.click();
  const parent = page.getByRole("menu", { name: "Workspace actions", exact: true });
  await expect(parent).toHaveCSS("opacity", "1");
  const subTrigger = parent.getByRole("menuitem", { name: "Switch workspace", exact: true });
  await subTrigger.hover();
  const submenu = page.getByRole("menu", { name: "Switch workspace", exact: true });
  await expect(submenu).toBeVisible();
  await expect(subTrigger).toHaveAttribute("aria-expanded", "true");
  const personal = submenu.getByRole("menuitem", { name: "Personal workspace", exact: true });
  const design = submenu.getByRole("menuitem", { name: "Design team", exact: true });
  await personal.hover();
  await design.hover();
  await expect(design).toHaveAttribute("data-highlighted");
  await expect(subTrigger).toHaveAttribute("data-popup-open");
  await expect(subTrigger.locator(highlight)).toHaveCount(1);
  await expect(submenu.locator(highlight)).toHaveCount(1);

  await page.keyboard.press("ArrowLeft");
  await expect(submenu).not.toBeVisible();
  await expect(subTrigger).toBeFocused();
  await page.mouse.move(0, 0);
  await page.keyboard.press("ArrowRight");
  await expect(personal).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(design).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(submenu).not.toBeVisible();
  await expect(parent).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator(".demo-frame").getByRole("status")).toHaveText("Design team selected");
});

test("reduced motion is instant and mobile menus dismiss on outside interaction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/dropdown-menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  const menu = page.getByRole("menu", { name: "Workspace actions" });
  await expect(menu).toHaveCSS("transition-duration", "0s");
  await expect(menu).toHaveCSS("opacity", "1");
  await page.keyboard.press("End");
  const settings = menu.getByRole("menuitem", { name: "Settings", exact: true });
  await expect(settings).toBeFocused();
  const positions = await settings.evaluate(async (element) => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const indicator = element.querySelector('[data-slot="dropdown-menu-highlight"]');
    if (!indicator) throw new Error("Missing highlight");
    return { item: element.getBoundingClientRect().y, highlight: indicator.getBoundingClientRect().y };
  });
  expect(positions.highlight).toBeCloseTo(positions.item, 1);
  const box = await menu.boundingBox();
  if (!box) throw new Error("Missing popup");
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.mouse.click(5, 5);
  await expect(menu).not.toBeVisible();
});

test("catalog, source, and registry expose the installable dropdown", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/dropdown-menu"]').click();
  await expect(page.getByRole("heading", { name: "Dropdown Menu", exact: true })).toBeVisible();
  const item = await (await request.get("/r/dropdown-menu.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.registryDependencies).toEqual(expect.arrayContaining(["dropdown-menu"]));
  expect(item.files[0].target).toBe("components/animated/dropdown-menu.tsx");
  expect(item.files[0].content).toContain("export function DropdownMenuItem");
  const guide = await request.get("/docs/components/dropdown-menu.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/dropdown-menu");
});
