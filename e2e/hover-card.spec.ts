import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

type Sample = { scale: number; opacity: number; first: number; last: number } | null;

// Samples the card every frame: its scale and opacity, and the opacity of its first and last child.
function sampleCard(page: Page, ms: number) {
  return page.evaluate(async (ms) => {
    const samples: Sample[] = [];
    const began = performance.now();
    while (performance.now() - began < ms) {
      const card = document.querySelector<HTMLElement>('[data-slot="hover-card-content"]');
      if (card) {
        const style = getComputedStyle(card);
        const children = [...card.children];
        samples.push({
          scale: new DOMMatrix(style.transform === "none" ? undefined : style.transform).a,
          opacity: Number(style.opacity),
          first: Number(getComputedStyle(children[0]).opacity),
          last: Number(getComputedStyle(children.at(-1)!).opacity),
        });
      } else {
        samples.push(null);
      }
      await new Promise(requestAnimationFrame);
    }
    return samples;
  }, ms);
}

// Under load the docs page can still shift after hydration; hovering before it settles
// leaves the cursor behind and the card correctly closes. Wait for the trigger to hold still.
async function hoverWhenSettled(trigger: Locator) {
  await trigger.scrollIntoViewIfNeeded();
  let previous = "";
  await expect
    .poll(
      async () => {
        const box = await trigger.boundingBox();
        const current = JSON.stringify(box && [Math.round(box.x), Math.round(box.y)]);
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { intervals: [150] },
    )
    .toBe(true);
  await trigger.hover();
}

test("card springs out on hover, staggers its contents, and leaves quickly", async ({ page }) => {
  // Leave room below the demo so the card keeps its requested side instead of flipping.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/components/hover-card");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const trigger = page.locator(".demo-frame").getByRole("link", { name: "@arjayby" });

  await hoverWhenSettled(trigger);
  const opening = (await sampleCard(page, 1200)).filter((sample) => sample !== null);
  expect(opening.length).toBeGreaterThan(0);
  expect(opening.some((sample) => sample.scale > 0.9 && sample.scale < 0.99)).toBe(true);
  expect(opening.some((sample) => sample.first > sample.last + 0.2)).toBe(true);
  const card = page.locator('[data-slot="hover-card-content"]');
  await expect(card).toContainText("Arjay Bayona");
  await expect(card).toContainText("arjayby/a1ui");
  await expect(trigger).toHaveAttribute("data-popup-open");
  const [cardBox, triggerBox] = await Promise.all([card.boundingBox(), trigger.boundingBox()]);
  expect(cardBox!.y).toBeGreaterThan(triggerBox!.y + triggerBox!.height);

  // Moving onto the card keeps it open.
  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2, { steps: 4 });
  await page.waitForTimeout(400);
  await expect(card).toBeVisible();

  await page.mouse.move(5, 5);
  const leaving = await sampleCard(page, 700);
  const gone = leaving.findIndex((sample) => sample === null);
  expect(gone).toBeGreaterThan(0);
  expect(leaving.slice(0, gone).some((sample) => sample!.opacity > 0.05 && sample!.opacity < 0.95)).toBe(
    true,
  );
  await expect(card).toHaveCount(0);

  // Keyboard focus opens it too, and Escape dismisses it.
  await page.keyboard.press("Tab");
  await trigger.focus();
  await expect(card).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("reduced motion shows the card instantly and keeps it on screen at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/hover-card");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Side:/ }).click();
  await page.getByRole("menuitem", { name: "right", exact: true }).click();
  const trigger = page.locator(".demo-frame").getByRole("link", { name: "@arjayby" });
  await hoverWhenSettled(trigger);
  const samples = (await sampleCard(page, 900)).filter((sample) => sample !== null);
  expect(samples.length).toBeGreaterThan(0);
  expect(samples.every((sample) => sample.opacity === 1 && sample.first === 1 && sample.last === 1)).toBe(
    true,
  );
  const box = await page.locator('[data-slot="hover-card-content"]').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("tapping the link never leaves the card stuck open", async ({ page }) => {
    await page.goto("/components/hover-card");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const trigger = page.locator(".demo-frame").getByRole("link", { name: "@arjayby" });
    await trigger.tap();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-slot="hover-card-content"]')).toHaveCount(0);
    await page.locator("h1").tap();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-slot="hover-card-content"]')).toHaveCount(0);
  });
});

test("catalog, registry, and agent docs include the hover card", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/hover-card"]').click();
  await expect(page.getByRole("heading", { name: "Hover Card", exact: true })).toBeVisible();
  const item = await (await request.get("/r/hover-card.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.dependencies).toEqual(expect.arrayContaining(["motion", "@base-ui/react"]));
  expect(item.files[0].target).toBe("components/animated/hover-card.tsx");
  expect(item.files[0].content).toContain("export function HoverCardContent");
  const guide = await request.get("/docs/components/hover-card.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/hover-card");
});
