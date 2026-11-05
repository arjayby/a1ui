import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("/components/textarea");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => document.fonts.ready);
  return page.locator(".demo-frame").getByRole("textbox", { name: "Feedback" });
}

// Docs pages can still shift late on a loaded machine; wait until the target stops moving.
async function settle(target: Locator) {
  let last = "";
  await expect
    .poll(async () => {
      const box = await target.boundingBox();
      const now = JSON.stringify(box);
      const still = now === last;
      last = now;
      return still;
    })
    .toBe(true);
}

// Sets the text the way typing does, then samples the frame and textarea heights every frame.
async function sampleResize(field: Locator, text: string) {
  return field.evaluate(async (element: HTMLTextAreaElement, text) => {
    const frame = element.closest<HTMLElement>('[data-slot="textarea-frame"]')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setValue.call(element, text);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    const frames = [];
    const start = performance.now();
    while (performance.now() - start < 700) {
      await new Promise(requestAnimationFrame);
      frames.push({
        frame: frame.getBoundingClientRect().height,
        field: element.getBoundingClientRect().height,
        scrollTop: element.scrollTop,
      });
    }
    return frames;
  }, text);
}

test("height springs to fit the text, the counter shakes at the limit, and the error slides in", async ({
  page,
}) => {
  const field = await open(page);
  await settle(field);
  const before = (await field.boundingBox())!.height;

  const growing = await sampleResize(field, "one\ntwo\nthree\nfour\nfive");
  const grown = growing.at(-1)!;
  expect(grown.field).toBeGreaterThan(before + 60);
  // The textarea takes its new height at once, so the caret never scrolls; the frame springs after it.
  expect(growing.every(({ field, scrollTop }) => field === grown.field && scrollTop === 0)).toBe(true);
  expect(growing.some(({ frame }) => frame > before + 10 && frame < grown.frame - 10)).toBe(true);

  const shrinking = await sampleResize(field, "one");
  const shrunk = shrinking.at(-1)!;
  expect(shrunk.frame).toBeCloseTo(before + 2, 0);
  expect(shrinking.some(({ frame }) => frame < grown.frame - 10 && frame > shrunk.frame + 10)).toBe(true);

  // Past maxRows the field stops growing and scrolls.
  await sampleResize(field, Array.from({ length: 12 }, (_, line) => `line ${line + 1}`).join("\n"));
  await expect(field).toHaveAttribute("data-scrolls", "");
  await expect(field).toHaveCSS("overflow-y", "auto");

  const count = page.locator('[data-slot="textarea-count"]');
  await sampleResize(field, "x".repeat(130));
  await expect(count).toHaveAttribute("data-state", "near");
  const shake = await field.evaluate(async (element: HTMLTextAreaElement) => {
    const counter = document.querySelector<HTMLElement>('[data-slot="textarea-count"]')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setValue.call(element, "x".repeat(140));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    const offsets = [];
    const start = performance.now();
    while (performance.now() - start < 500) {
      await new Promise(requestAnimationFrame);
      offsets.push(new DOMMatrix(getComputedStyle(counter).transform).e);
    }
    return offsets;
  });
  expect(shake.some((x) => Math.abs(x) > 1)).toBe(true);
  expect(Math.abs(shake.at(-1)!)).toBeLessThan(0.5);
  await expect(count).toHaveAttribute("data-state", "limit");
  await expect(count).toContainText("140 of 140 characters");

  await sampleResize(field, "");
  const send = page.locator(".demo-frame").getByRole("button", { name: "Send" });
  await settle(send);
  const reveal = await send.evaluate(async (button: HTMLButtonElement) => {
    button.click();
    const heights = [];
    const start = performance.now();
    while (performance.now() - start < 500) {
      await new Promise(requestAnimationFrame);
      const error = document.querySelector('[data-slot="textarea-error-frame"]');
      if (error) heights.push(error.getBoundingClientRect().height);
    }
    return heights;
  });
  const shown = reveal.at(-1)!;
  expect(shown).toBeGreaterThan(20);
  expect(reveal.some((height) => height > 1 && height < shown - 2)).toBe(true);
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription(/Write a message before sending\./);
});

test("reduced motion resizes instantly and the field works at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const field = await open(page);
  await settle(field);
  const frame = page.locator('.demo-frame [data-slot="textarea-frame"]');

  await field.focus();
  await page.keyboard.type("Hello", { delay: 40 });
  await expect(frame).toHaveCSS("box-shadow", /rgb/);
  for (let line = 0; line < 3; line++) {
    await page.keyboard.press("Enter", { delay: 40 });
    await page.keyboard.type("more", { delay: 40 });
  }
  await expect(field).toHaveValue("Hello\nmore\nmore\nmore");

  const frames = await sampleResize(field, "a\nb\nc\nd\ne");
  expect(frames[0].frame).toBe(frames.at(-1)!.frame);
  expect(frames[0].frame).toBeCloseTo(frames[0].field + 2, 0);
  const instantShrink = await sampleResize(field, "");
  expect(instantShrink[0].frame).toBe(instantShrink.at(-1)!.frame);

  await page.locator(".demo-frame").getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-slot="textarea-error"]')).toHaveText("Write a message before sending.");
  await expect(page.locator('[data-slot="textarea-error-frame"]')).toHaveCSS("opacity", "1");
  await field.focus();
  await page.keyboard.type("Fixed", { delay: 40 });
  await expect(page.locator('[data-slot="textarea-error"]')).toHaveCount(0);
  await page.locator(".demo-frame").getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".demo-frame").getByRole("status")).toHaveText("Thanks, sent.");
  await expect(field).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the textarea", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/textarea"]').click();
  await expect(page.getByRole("heading", { name: "Textarea", exact: true })).toBeVisible();
  const item = await (await request.get("/r/textarea.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(["motion"]);
  expect(item.files[0].target).toBe("components/animated/textarea.tsx");
  expect(item.files[0].content).toContain("export function Textarea");
  const guide = await request.get("/docs/components/textarea.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/textarea");
});
