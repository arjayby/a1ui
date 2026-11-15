import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/card-vortex");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("heading", { name: "Card Vortex", exact: true })).toBeVisible();
});

test("hovering the trigger brings the cards into a ring inside the frame", async ({ page }) => {
  const stage = page.locator(".card-vortex-demo-stage");
  const trigger = stage.getByRole("button", { name: "Blocks" });
  const cards = stage.getByRole("navigation", { name: "More blocks" }).getByRole("link");

  await expect(cards).toHaveCount(0);
  await trigger.hover();
  await expect(cards).toHaveCount(8);

  // Every card settles the same distance from the trigger and inside the demo frame.
  await expect
    .poll(async () => {
      const frame = (await stage.boundingBox())!;
      const origin = (await trigger.boundingBox())!;
      const distances = await Promise.all(
        (await cards.all()).map(async (card) => {
          const box = (await card.boundingBox())!;
          const inside =
            box.x >= frame.x &&
            box.y >= frame.y &&
            box.x + box.width <= frame.x + frame.width &&
            box.y + box.height <= frame.y + frame.height;
          if (!inside) return -1;
          return Math.hypot(
            box.x + box.width / 2 - origin.x - origin.width / 2,
            box.y + box.height / 2 - origin.y - origin.height / 2,
          );
        }),
      );
      return Math.min(...distances) > 60 && Math.max(...distances) - Math.min(...distances) < 3;
    })
    .toBe(true);

  // The pointer can travel from the trigger to a card without the ring closing.
  await cards.first().hover();
  await page.waitForTimeout(400);
  await expect(cards).toHaveCount(8);

  await page.mouse.move(2, 2);
  await expect(cards).toHaveCount(0);
});

test("a card is a link that opens its page", async ({ page }) => {
  const stage = page.locator(".card-vortex-demo-stage");
  await stage.getByRole("button", { name: "Blocks" }).hover();
  await stage.getByRole("link", { name: "Arc Reel" }).click();
  await expect(page).toHaveURL(/\/blocks\/arc-reel$/);
});

test("the keyboard opens the ring, reaches the cards and Escape closes it", async ({ page }) => {
  const stage = page.locator(".card-vortex-demo-stage");
  const trigger = stage.getByRole("button", { name: "Blocks" });
  const cards = stage.getByRole("navigation", { name: "More blocks" }).getByRole("link");

  await trigger.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  await expect(cards).toHaveCount(8);

  await page.keyboard.press("Tab");
  await expect(cards.first()).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(cards).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
