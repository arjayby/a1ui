import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/integration-hub");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("all six pulses travel inward and pause and resume in place", async ({ page }) => {
  const hub = page.getByRole("group", { name: "Tools connected to Relay" });
  const pulses = hub.locator(".a1ui-hub-pulse:not(.a1ui-hub-pulse-glow)");
  await expect(pulses).toHaveCount(6);

  const directions = await pulses.evaluateAll((elements) =>
    elements.map((element) => {
      const path = element as SVGPathElement;
      const animation = path.getAnimations()[0];
      // Sample the same portion of every staggered cycle.
      const delay = Number(animation.effect!.getTiming().delay);
      const duration = Number(animation.effect!.getTiming().duration);
      animation.currentTime = duration + delay + 700;
      const startOffset = parseFloat(getComputedStyle(path).strokeDashoffset);
      animation.currentTime = duration + delay + 1800;
      const endOffset = parseFloat(getComputedStyle(path).strokeDashoffset);
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(path.getTotalLength());
      return {
        advancing: endOffset < startOffset,
        towardCenter: Math.abs(end.x - 500) < Math.abs(start.x - 500),
      };
    }),
  );
  for (const direction of directions) {
    expect(direction).toEqual({ advancing: true, towardCenter: true });
  }

  const pause = page.getByRole("button", { name: "Pause pulses" });
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(pulses.first()).toHaveCSS("animation-play-state", "paused");
  const drift = await pulses.first().evaluate(async (element) => {
    await element.getAnimations()[0].ready;
    const before = getComputedStyle(element).strokeDashoffset;
    await new Promise((resolve) => setTimeout(resolve, 120));
    return before === getComputedStyle(element).strokeDashoffset;
  });
  expect(drift).toBe(true);
  await page.getByRole("button", { name: "Resume pulses" }).click();
  await expect(pulses.first()).toHaveCSS("animation-play-state", "running");
});

test("keyboard selection highlights a connection and can be cleared", async ({ page }) => {
  const hub = page.getByRole("group", { name: "Tools connected to Relay" });
  const linear = hub.getByRole("button", { name: "Linear", exact: true });
  await linear.focus();
  await page.keyboard.press("Enter");
  await expect(linear).toHaveAttribute("aria-pressed", "true");
  await expect(hub.locator('.a1ui-hub-connection[data-active="true"]')).toHaveCount(1);
  await expect(hub.locator(".a1ui-hub-product-status")).toHaveText("From Linear");

  await page.keyboard.press("Enter");
  await expect(linear).toHaveAttribute("aria-pressed", "false");
  await expect(hub.locator('.a1ui-hub-connection[data-active="true"]')).toHaveCount(6);
  await hub.getByRole("button", { name: "Slack", exact: true }).click();
  await expect(hub.getByRole("button", { name: "Slack", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await hub.getByRole("button", { name: "Slack", exact: true }).click();
  await expect(hub.locator('.a1ui-hub-connection[data-active="true"]')).toHaveCount(6);
});

test("keeps wires attached and labels readable at mobile and desktop widths", async ({ page }) => {
  const hub = page.getByRole("group", { name: "Tools connected to Relay" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await hub.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const cards = [...element.querySelectorAll<HTMLElement>(".a1ui-hub-card")];
      const wires = [...element.querySelectorAll<SVGPathElement>(".a1ui-hub-wire")];
      return cards.map((card, index) => {
        const rect = card.getBoundingClientRect();
        const path = wires[index];
        const point = path.getPointAtLength(0).matrixTransform(path.getScreenCTM()!);
        const right = card.closest("li")!.dataset.side === "right";
        const label = card.querySelector<HTMLElement>(".a1ui-hub-name")!;
        return {
          fits: rect.left >= bounds.left && rect.right <= bounds.right && bounds.right <= innerWidth,
          labelFits: label.scrollWidth <= label.clientWidth + 1,
          gap: Math.hypot(point.x - (right ? rect.left : rect.right), point.y - (rect.top + rect.height / 2)),
        };
      });
    });
    for (const card of layout) {
      expect(card.fits).toBe(true);
      expect(card.labelFits).toBe(true);
      expect(card.gap).toBeLessThan(1);
    }
  }
});

test("reduced motion retains the diagram and tool selection without moving pulses", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const hub = page.getByRole("group", { name: "Tools connected to Relay" });
  await expect(hub.locator(".a1ui-hub-pulse").first()).toHaveCSS("animation-name", "none");
  await expect(hub.locator(".a1ui-hub-pulse").first()).toHaveCSS("opacity", "0");
  await expect(hub.locator(".a1ui-hub-wire")).toHaveCount(6);
  await expect(page.getByText("Motion reduced", { exact: true })).toBeVisible();
  await hub.getByRole("button", { name: "Figma", exact: true }).click();
  await expect(hub.getByRole("button", { name: "Figma", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(hub.locator(".a1ui-hub-pulse").first()).toHaveCSS("animation-play-state", "running");
});
