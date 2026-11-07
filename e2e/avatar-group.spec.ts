import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function open(page: Page) {
  await page.goto("/components/avatar-group");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  return page.locator(".demo-frame").getByRole("group", { name: "Project members" });
}

// Docs pages can shift late under load, so wait until the target stops moving before pointing at it.
async function settled(target: Locator) {
  let last = "";
  await expect
    .poll(async () => {
      const box = await target.boundingBox();
      const now = JSON.stringify(box);
      const same = box !== null && now === last;
      last = now;
      return same;
    })
    .toBe(true);
  return (await target.boundingBox())!;
}

// Starts recording `read(element)` on every frame for up to `ms` milliseconds, before the caller
// acts. With `until`, recording stops once that value is read, so slow machines are not cut short.
async function record(page: Page, selector: string, read: string, ms: number, until?: string) {
  await page.evaluate(
    ({ selector, read, ms, until }) => {
      const reader = new Function("element", `return ${read}`) as (element: Element) => string;
      const values: string[] = [];
      const began = performance.now();
      (window as unknown as { samples: Promise<string[]> }).samples = (async () => {
        while (performance.now() - began < ms) {
          const element = document.querySelector(selector);
          if (element) values.push(reader(element));
          if (until !== undefined && values.at(-1) === until) break;
          await new Promise(requestAnimationFrame);
        }
        return values;
      })();
    },
    { selector, read, ms, until },
  );
}

const recorded = (page: Page) =>
  page.evaluate(() => (window as unknown as { samples: Promise<string[]> }).samples);

test("avatars spring apart, lift with a label, and the chip counts up and fans out", async ({ page }) => {
  const group = await open(page);
  const items = group.locator('> [data-slot="avatar-group-item"]');
  await expect(items).toHaveCount(4);
  const chip = group.getByRole("button", { name: "Show 4 more" });
  await expect(chip).toHaveText("+4");

  // Remounting the group with a new max counts the chip up from zero through every step.
  await record(page, '.demo-frame [data-slot="avatar-group-count"]', "element.textContent", 6000, "+5");
  await page.getByRole("button", { name: /^Max:/ }).click();
  await page.getByRole("menuitem", { name: "3", exact: true }).click();
  // Picking the item can scroll the chip away, and it only counts once it is on screen again.
  await group.scrollIntoViewIfNeeded();
  const counts = await recorded(page);
  expect(counts.some((text) => ["+0", "+1", "+2", "+3", "+4"].includes(text))).toBe(true);
  expect(counts.at(-1)).toBe("+5");
  await expect(group.getByRole("button", { name: "Show 5 more" })).toHaveText("+5");
  await expect(items).toHaveCount(3);
  // The modal menu's backdrop swallows pointer events until it finishes closing.
  await expect(page.getByRole("menu")).toHaveCount(0);

  // Hovering spreads the overlap through intermediate offsets, and the hovered face lifts.
  const second = items.nth(1);
  const shift = (element: Element) => new DOMMatrix(getComputedStyle(element).transform).e;
  await expect(second).toHaveCSS("margin-left", "-12px");
  await expect(second).toHaveCSS("transform", "none");
  const ada = group.getByRole("img", { name: "Ashen Warden" });
  await group.scrollIntoViewIfNeeded();
  const box = await settled(ada);
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // Under load the first hover after a menu closes can be lost, so warm up, then collapse again.
  await expect(async () => {
    await page.mouse.move(center.x, center.y + 120);
    await page.mouse.move(center.x, center.y, { steps: 2 });
    await expect(group).toHaveAttribute("data-expanded", "true", { timeout: 1000 });
  }).toPass();
  await page.mouse.move(center.x, center.y + 120);
  await expect(group).not.toHaveAttribute("data-expanded");
  await expect.poll(() => second.evaluate(shift)).toBe(0);
  await record(
    page,
    '.demo-frame [data-slot="avatar-group-item"]:nth-child(2)',
    "new DOMMatrix(getComputedStyle(element).transform).e",
    500,
  );
  await page.mouse.move(center.x, center.y, { steps: 2 });
  const shifts = (await recorded(page)).map(Number);
  expect(shifts.some((x) => x > 1 && x < 15)).toBe(true);
  await expect.poll(() => second.evaluate(shift)).toBe(16);
  await expect.poll(() => items.nth(2).evaluate(shift)).toBe(32);
  await expect(ada.locator('[data-slot="avatar-label"]')).toHaveText("Ashen Warden");
  await expect
    .poll(() => ada.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).f))
    .toBe(-4);

  // The chip fans the hidden avatars out from itself.
  const more = group.getByRole("button", { name: "Show 5 more" });
  await record(
    page,
    '.demo-frame [data-slot="avatar-group-tray"] [data-slot="avatar-group-item"]',
    "(() => { const style = getComputedStyle(element); const m = new DOMMatrix(style.transform); return style.opacity + ' ' + Math.hypot(m.a, m.b); })()",
    500,
  );
  await more.click();
  const frames = (await recorded(page)).map((value) => {
    const [opacity, scale] = value.split(" ").map(Number);
    return { opacity, scale };
  });
  expect(frames.some(({ opacity }) => opacity > 0.05 && opacity < 0.95)).toBe(true);
  expect(frames.some(({ scale }) => scale > 0.45 && scale < 0.95)).toBe(true);
  const tray = group.getByRole("group", { name: "5 more" });
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(tray.getByRole("img")).toHaveCount(5);
  await expect(tray.locator('[data-slot="avatar-group-item"]').last()).toHaveCSS("opacity", "1");

  await page.mouse.click(5, 5);
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(tray).toHaveCount(0);
});

test("reduced motion on mobile spreads instantly and keeps keyboard labels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const group = await open(page);
  const chip = group.getByRole("button", { name: "Show 4 more" });
  await expect(chip).toHaveText("+4");

  const ada = group.getByRole("img", { name: "Ashen Warden" });
  await ada.focus();
  await expect(group).toHaveAttribute("data-expanded", "true");
  await expect(group.locator('> [data-slot="avatar-group-item"]').nth(1)).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, 16, 0)",
  );
  await expect(ada.locator('[data-slot="avatar-label"]')).toHaveCSS("opacity", "1");
  await expect(ada).toHaveCSS("transform", "none");

  for (const name of ["Hollow Seer", "Thornback", "Pale Regent"]) {
    await page.waitForTimeout(120);
    await page.keyboard.press("Tab");
    const avatar = group.getByRole("img", { name });
    await expect(avatar).toBeFocused();
    await expect(avatar.locator('[data-slot="avatar-label"]')).toHaveText(name);
    await expect(ada.locator('[data-slot="avatar-label"]')).toHaveCount(0);
  }
  await page.waitForTimeout(120);
  await page.keyboard.press("Tab");
  await expect(chip).toBeFocused();
  await page.waitForTimeout(120);
  await page.keyboard.press("Enter");
  const tray = group.getByRole("group", { name: "4 more" });
  await expect(tray.getByRole("img")).toHaveCount(4);
  await expect(tray.locator('[data-slot="avatar-group-item"]').first()).toHaveCSS("opacity", "1");
  await expect(tray.locator('[data-slot="avatar-group-item"]').first()).toHaveCSS("transform", "none");

  await page.waitForTimeout(120);
  await page.keyboard.press("Tab");
  await expect(tray.getByRole("img", { name: "Gravecaller" })).toBeFocused();
  await page.waitForTimeout(120);
  await page.keyboard.press("Escape");
  await expect(chip).toBeFocused();
  await expect(tray).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the avatar group", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/avatar-group"]').click();
  await expect(page.getByRole("heading", { name: "Avatar Group", exact: true })).toBeVisible();
  const item = await (await request.get("/r/avatar-group.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion", "@base-ui/react"]);
  expect(item.files[0].target).toBe("components/animated/avatar-group.tsx");
  expect(item.files[0].content).toContain("export function AvatarGroup");
  const guide = await request.get("/docs/components/avatar-group.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/avatar-group");
});
