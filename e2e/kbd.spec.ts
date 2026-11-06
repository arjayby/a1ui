import { expect, test, type Locator, type Page } from "@playwright/test";

// Docs pages can shift late while the machine is busy, so wait for the target to stop moving.
async function settledBox(locator: Locator) {
  let previous = await locator.boundingBox();
  await expect
    .poll(async () => {
      const next = await locator.boundingBox();
      const settled =
        previous !== null &&
        next !== null &&
        Math.abs(previous.x - next.x) < 0.5 &&
        Math.abs(previous.y - next.y) < 0.5;
      previous = next;
      return settled;
    })
    .toBe(true);
  return previous!;
}

const capY = (key: Locator) =>
  key.locator('[data-slot="kbd-cap"]').evaluate((cap) => new DOMMatrix(getComputedStyle(cap).transform).f);

function sampleCapY(key: Locator, ms: number) {
  return key.locator('[data-slot="kbd-cap"]').evaluate(async (cap, ms) => {
    const samples: number[] = [];
    const began = performance.now();
    while (performance.now() - began < ms) {
      samples.push(new DOMMatrix(getComputedStyle(cap).transform).f);
      await new Promise(requestAnimationFrame);
    }
    return samples;
  }, ms);
}

async function open(page: Page) {
  await page.goto("/components/kbd");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  return page.locator(".demo-frame");
}

test("caps sink while keys are held, spring back on release, and the combo pulses", async ({ page }) => {
  const frame = await open(page);
  const keys = frame.locator('[data-slot="kbd-demo-keys"] [data-slot="kbd"]');
  const shift = keys.filter({ hasText: "Shift" });
  await expect(keys).toHaveCount(6);

  await page.keyboard.down("Shift");
  await expect(shift).toHaveAttribute("data-pressed", "true");
  await expect.poll(() => capY(shift)).toBeCloseTo(2, 1);
  const release = sampleCapY(shift, 600);
  await page.keyboard.up("Shift");
  const samples = await release;
  await expect(shift).not.toHaveAttribute("data-pressed");
  expect(samples.some((y) => y > 0.2 && y < 1.8)).toBe(true);
  await expect.poll(() => capY(shift)).toBeCloseTo(0, 1);

  // ⌘ + Shift + Enter on a Mac, Ctrl + Shift + Enter elsewhere: each key presses on its own.
  const group = frame.locator('[data-slot="kbd-group"]');
  const comboKeys = group.locator('[data-slot="kbd"]');
  // The Desktop Chrome device reports Windows, so follow the labels the page detected.
  const mod = (await group.textContent())!.includes("Ctrl") ? "Control" : "Meta";
  await page.keyboard.down(mod);
  await expect(comboKeys.nth(0)).toHaveAttribute("data-pressed", "true");
  await expect(comboKeys.nth(1)).not.toHaveAttribute("data-pressed");
  await page.waitForTimeout(80);
  await page.keyboard.down("Shift");
  await expect(comboKeys.nth(1)).toHaveAttribute("data-pressed", "true");
  await expect(group).not.toHaveAttribute("data-complete");
  await page.waitForTimeout(80);
  const pulse = group.locator('[data-slot="kbd-group-keys"]').evaluate(async (element) => {
    const scales: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 700) {
      scales.push(new DOMMatrix(getComputedStyle(element).transform).a);
      await new Promise(requestAnimationFrame);
    }
    return scales;
  });
  await page.keyboard.down("Enter");
  await expect(group).toHaveAttribute("data-complete", "true");
  expect((await pulse).some((scale) => scale > 1.005 && scale < 1.06)).toBe(true);
  await page.keyboard.up("Enter");
  await expect(group).not.toHaveAttribute("data-complete");
  await page.keyboard.up("Shift");
  await page.keyboard.up(mod);
  await expect(group.locator("[data-pressed]")).toHaveCount(0);

  const escape = keys.filter({ hasText: "Esc" });
  const box = await settledBox(escape);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(escape).toHaveAttribute("data-pressed", "true");
  await page.mouse.up();
  await expect(escape).not.toHaveAttribute("data-pressed");
});

test("labels follow the platform and presses land instantly on mobile with reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const frame = await open(page);
  await page.getByRole("button", { name: /^Labels:/ }).click();
  await page.getByRole("menuitem", { name: "other", exact: true }).click();
  const group = frame.locator('[data-slot="kbd-group"]');
  await expect(group).toContainText("Ctrl");
  await page.getByRole("button", { name: /^Labels:/ }).click();
  await page.getByRole("menuitem", { name: "mac", exact: true }).click();
  await expect(group.locator('[data-slot="kbd"] [aria-hidden="true"]').first()).toHaveText("⌘");
  await page.getByRole("button", { name: /^Combo:/ }).click();
  await page.getByRole("menuitem", { name: "shift + enter", exact: true }).click();
  await expect(group.locator('[data-slot="kbd"]')).toHaveCount(2);
  // Keep Enter away from the menu trigger that just regained focus.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  const alt = frame.locator('[data-slot="kbd-demo-keys"] [data-slot="kbd"]').filter({ hasText: "Option" });
  const press = sampleCapY(alt, 300);
  await page.keyboard.down("Alt");
  const samples = await press;
  await expect(alt).toHaveAttribute("data-pressed", "true");
  expect(samples.every((y) => y === 0 || y === 2)).toBe(true);
  expect(samples.at(-1)).toBe(2);
  await page.keyboard.up("Alt");
  await expect.poll(() => capY(alt)).toBe(0);

  await page.keyboard.down("Shift");
  await page.waitForTimeout(80);
  await page.keyboard.down("Enter");
  await expect(group).toHaveAttribute("data-complete", "true");
  await expect(group.locator('[data-slot="kbd-group-glow"]')).toHaveCSS("opacity", "1");
  await page.keyboard.up("Enter");
  await page.keyboard.up("Shift");
  await expect(group.locator('[data-slot="kbd-group-glow"]')).toHaveCSS("opacity", "0");

  const box = (await frame.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include kbd", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/kbd"]').click();
  await expect(page.getByRole("heading", { name: "Kbd", exact: true })).toBeVisible();
  const item = await (await request.get("/r/kbd.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/kbd.tsx");
  expect(item.files[0].content).toContain("export function KbdGroup");
  const guide = await request.get("/docs/components/kbd.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/kbd");
});
