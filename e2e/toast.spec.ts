import { type Locator } from "@playwright/test";
import { expect, test } from "./fixtures";

const translateY = (locator: Locator) =>
  locator.evaluate((element: HTMLElement) =>
    Number.parseFloat(/translateY\((-?[\d.]+)px\)/.exec(element.style.transform)?.[1] ?? "0"),
  );

test("toasts spring in, stack as a deck, fan out on hover, morph to success, and swipe away", async ({
  page,
}) => {
  await page.goto("/components/toast");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const toasts = frame.locator('[data-slot="toast"]');

  // Toasts close themselves after 5 seconds, so the triggers fire inside the page where a slow
  // test runner cannot outlast that timer. The new toast rises from the bottom edge and is caught
  // between its start and rest; the older ones settle into the deck behind it.
  const { entering, deck } = await frame.evaluate(async (stage) => {
    const press = (name: string) =>
      [...stage.querySelectorAll("button")].find((button) => button.textContent?.trim() === name)!.click();
    const offsetOf = (toast: Element | undefined) =>
      Number.parseFloat(
        /translateY\((-?[\d.]+)px\)/.exec((toast as HTMLElement)?.style.transform ?? "")?.[1] ?? "0",
      );
    press("Default");
    const entering: number[] = [];
    const began = performance.now();
    while (performance.now() - began < 300) {
      const toast = stage.querySelector('[data-slot="toast"]');
      if (toast) entering.push(offsetOf(toast));
      await new Promise(requestAnimationFrame);
    }
    press("Error");
    press("Loading");
    await new Promise((resolve) => setTimeout(resolve, 900));
    const toasts = [...stage.querySelectorAll('[data-slot="toast"]')];
    return { entering, deck: toasts.map((toast) => [toast.getAttribute("data-type"), offsetOf(toast)]) };
  });
  expect(entering.some((offset) => offset > 5 && offset < 65)).toBe(true);
  expect(deck).toEqual([
    ["loading", 0],
    ["error", -12],
    ["default", -24],
  ]);

  // Hovering fans the deck into a list and pauses the timers.
  await toasts.nth(0).hover();
  await expect(toasts.nth(0)).toHaveAttribute("data-expanded");
  await expect.poll(() => translateY(toasts.nth(1))).toBeLessThan(-60);
  const front = await toasts.nth(0).boundingBox();
  const second = await toasts.nth(1).boundingBox();
  expect(second!.y + second!.height).toBeLessThanOrEqual(front!.y);
  await expect(toasts.nth(0)).toHaveAttribute("data-type", "success", { timeout: 4000 });
  await expect(toasts.nth(0).locator('[data-slot="toast-icon"]')).toHaveAttribute("data-type", "success");

  // The swiped toast is only marked while it flies out, so record the mark as it appears.
  await frame.evaluate((stage) => {
    const seen: string[] = [];
    Object.assign(window, { swiped: seen });
    new MutationObserver((records) => {
      for (const record of records) {
        const value = (record.target as Element).getAttribute("data-swiped");
        if (value) seen.push(value);
      }
    }).observe(stage, { subtree: true, attributeFilter: ["data-swiped"] });
  });
  const box = (await toasts.nth(0).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { swiped: string[] }).swiped))
    .toContain("right");
  await expect(frame.getByText("Report uploaded")).toHaveCount(0);

  // Keyboard focus fans the deck out just like hover.
  await page.mouse.move(0, 0);
  await frame.evaluate((stage) => {
    for (const name of ["Default", "Success"]) {
      [...stage.querySelectorAll("button")].find((button) => button.textContent?.trim() === name)!.click();
    }
  });
  await frame.getByRole("button", { name: "Loading" }).focus();
  await page.keyboard.press("Tab");
  await expect(toasts.nth(0)).toBeFocused();
  await expect(toasts.nth(0)).toHaveAttribute("data-type", "success");
  await expect.poll(() => translateY(toasts.nth(1))).toBeLessThan(-60);
});

test("toasts appear in place on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/toast");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");

  const first = await frame.getByRole("button", { name: "Loading" }).evaluate(async (button) => {
    (button as HTMLButtonElement).click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const toast = document.querySelector<HTMLElement>('.demo-frame [data-slot="toast"]')!;
    return { transform: toast.style.transform, opacity: toast.style.opacity };
  });
  expect(first.transform).toBe("none");
  expect(first.opacity).toBe("1");
  await expect(frame.locator('[data-slot="toast-icon"] svg')).not.toHaveClass(/animate-spin/);

  const toast = frame.locator('[data-slot="toast"]');
  const stage = await frame.locator(".component-demo-stage").boundingBox();
  const card = await toast.boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(stage!.x);
  expect(card!.x + card!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await toast.locator('[data-slot="toast-close"]').click();
  await expect(toast).toHaveCount(0);
});

test("catalog, registry, and agent docs include the toast", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/toast"]').click();
  await expect(page.getByRole("heading", { name: "Toast", exact: true })).toBeVisible();
  const item = await (await request.get("/r/toast.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/toast.tsx");
  expect(item.files[0].content).toContain("export function Toaster");
  const guide = await request.get("/docs/components/toast.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/toast");
});
