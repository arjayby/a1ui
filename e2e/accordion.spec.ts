import { expect, test } from "@playwright/test";

test("panels glide to their height, reverse smoothly mid-open, and keep one item open", async ({ page }) => {
  await page.goto("/components/accordion");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const shipping = frame.getByRole("button", { name: "How long does shipping take?" });
  const returns = frame.getByRole("button", { name: "Can I return an item?" });
  await expect(shipping).toHaveAttribute("aria-expanded", "true");

  const opening = await returns.evaluate(async (button: HTMLElement) => {
    const item = button.closest('[data-slot="accordion-item"]')!;
    const chevron = () => new DOMMatrix(getComputedStyle(item.querySelector("svg")!).transform);
    button.click();
    const heights: number[] = [];
    const angles: number[] = [];
    const opacities: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 450) {
      const panel = item.querySelector<HTMLElement>('[data-slot="accordion-content"]');
      heights.push(panel?.getBoundingClientRect().height ?? 0);
      const first = panel?.querySelector('[data-slot="accordion-content-inner"] > *');
      opacities.push(first ? Number(getComputedStyle(first).opacity) : 0);
      const { a, b } = chevron();
      angles.push(Math.abs((Math.atan2(b, a) * 180) / Math.PI));
      await new Promise(requestAnimationFrame);
    }
    const panel = item.querySelector<HTMLElement>('[data-slot="accordion-content"]')!;
    return { heights, angles, opacities, final: panel.scrollHeight };
  });
  expect(opening.heights.some((h) => h > 4 && h < opening.final - 4)).toBe(true);
  expect(opening.angles.some((angle) => angle > 20 && angle < 160)).toBe(true);
  expect(opening.opacities.some((opacity) => opacity > 0.05 && opacity < 0.95)).toBe(true);
  await expect(returns).toHaveAttribute("aria-expanded", "true");
  await expect(shipping).toHaveAttribute("aria-expanded", "false");
  await expect(frame.getByRole("region")).toHaveCount(1);
  await expect(frame.getByRole("region")).toContainText("Send anything back within 30 days");

  // Clicking again mid-open turns the panel around from where it is, without a jump.
  const interrupted = await frame
    .getByRole("button", { name: "Is there a warranty?" })
    .evaluate(async (button: HTMLElement) => {
      const item = button.closest('[data-slot="accordion-item"]')!;
      const height = () =>
        item.querySelector('[data-slot="accordion-content"]')?.getBoundingClientRect().height ?? 0;
      button.click();
      const began = performance.now();
      while (performance.now() - began < 110) await new Promise(requestAnimationFrame);
      const before = height();
      button.click();
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const after: number[] = [];
      while (performance.now() - began < 700) {
        after.push(height());
        await new Promise(requestAnimationFrame);
      }
      return { before, after };
    });
  expect(interrupted.before).toBeGreaterThan(2);
  expect(interrupted.after[0]).toBeLessThanOrEqual(interrupted.before + 8);
  expect(interrupted.after.at(-1)).toBe(0);

  await shipping.focus();
  await page.keyboard.press("Enter");
  await expect(shipping).toHaveAttribute("aria-expanded", "true");
  await expect(returns).toHaveAttribute("aria-expanded", "false");
});

test("plus icon and multiple mode open instantly on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/accordion");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Icon:/ }).click();
  await page.getByRole("menuitem", { name: "plus", exact: true }).click();
  await page.getByRole("button", { name: /^Mode:/ }).click();
  await page.getByRole("menuitem", { name: "multiple", exact: true }).click();
  const frame = page.locator(".demo-frame");
  await expect(frame.locator('[data-slot="accordion-icon"][data-icon="plus"]')).toHaveCount(3);

  const returns = frame.getByRole("button", { name: "Can I return an item?" });
  const height = await returns.evaluate(async (button: HTMLElement) => {
    button.click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const panel = button
      .closest('[data-slot="accordion-item"]')!
      .querySelector<HTMLElement>('[data-slot="accordion-content"]')!;
    return { now: panel.getBoundingClientRect().height, full: panel.scrollHeight };
  });
  expect(height.now).toBeGreaterThan(0);
  expect(Math.abs(height.now - height.full)).toBeLessThanOrEqual(1);
  await expect(frame.getByRole("region")).toHaveCount(2);

  const bar = returns.locator('[data-slot="accordion-plus-vertical"]');
  const angle = await bar.evaluate((element) => {
    const { a, b } = new DOMMatrix(getComputedStyle(element).transform);
    return Math.round((Math.atan2(b, a) * 180) / Math.PI);
  });
  expect(Math.abs(angle)).toBe(90);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the accordion", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/accordion"]').click();
  await expect(page.getByRole("heading", { name: "Accordion", exact: true })).toBeVisible();
  const item = await (await request.get("/r/accordion.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/accordion.tsx");
  expect(item.files[0].content).toContain("export function AccordionTrigger");
  const guide = await request.get("/docs/components/accordion.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/accordion");
});
