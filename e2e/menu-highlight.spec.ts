import { expect, test } from "@playwright/test";

const scenarios = [
  {
    name: "Menu",
    url: "/components/menu",
    container: '[aria-label="Workspace views"]',
    role: "button",
    from: "Overview",
    to: "Settings",
  },
  {
    name: "sidebar rows",
    url: "/components/menu",
    container: '[data-sidebar="content"]',
    role: "link",
    from: "Confirm Button",
    to: "Menu",
  },
  {
    name: "sidebar groups",
    url: "/components/menu",
    container: '[data-sidebar="content"]',
    role: "link",
    from: "Confirm Button",
    to: "ASCII Morph",
  },
  {
    name: "Dropdown Menu",
    url: "/components/dropdown-menu",
    container: '[role="menu"][aria-label="Workspace actions"]',
    role: "menuitem",
    from: "New project",
    to: "Settings",
  },
] satisfies {
  name: string;
  url: string;
  container: string;
  role: "button" | "link" | "menuitem";
  from: string;
  to: string;
}[];

for (const scenario of scenarios) {
  test(`${scenario.name} keeps the moving highlight behind neighboring text`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(scenario.url);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.evaluate(() => document.fonts.ready);
    if (scenario.role === "menuitem")
      await page.getByRole("button", { name: "Workspace", exact: true }).click();
    const container = page.locator(scenario.container);
    const source = container.getByRole(scenario.role, { name: scenario.from, exact: true });
    const target = container.getByRole(scenario.role, { name: scenario.to, exact: true });
    await source.focus();
    await expect
      .poll(async () => {
        const item = await source.boundingBox();
        const highlight = await source.locator('[data-slot$="-highlight"]').boundingBox();
        return item && highlight ? Math.abs(item.y - highlight.y) : Infinity;
      })
      .toBeLessThan(0.5);

    const result = await target.evaluate(async (target, fromText) => {
      const container = target.closest('[data-menu], [role="menu"]');
      const source = [...(container?.querySelectorAll('[data-menu-item], [role="menuitem"]') ?? [])].find(
        (item) => item.textContent?.trim().startsWith(fromText),
      );
      const text = source?.querySelector('span:not([aria-hidden="true"])');
      if (!container || !text || !(target instanceof HTMLElement)) throw new Error("Missing menu content");
      let occludedFrames = 0;
      let sampledFrames = 0;
      target.focus({ preventScroll: true });
      const started = performance.now();
      while (performance.now() - started < 450) {
        await new Promise(requestAnimationFrame);
        const highlights = container.querySelectorAll('[data-slot$="-highlight"]');
        // Include the decorative background in hit testing to inspect its actual paint order.
        for (const highlight of highlights)
          if (highlight instanceof HTMLElement) highlight.style.pointerEvents = "auto";
        const rect = text.getBoundingClientRect();
        const stack = document.elementsFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        const backgroundIndex = stack.findIndex((element) =>
          element.getAttribute("data-slot")?.endsWith("-highlight"),
        );
        const textIndex = stack.indexOf(text);
        if (backgroundIndex >= 0 && textIndex >= 0 && backgroundIndex < textIndex) occludedFrames++;
        if (textIndex >= 0) sampledFrames++;
        for (const highlight of highlights)
          if (highlight instanceof HTMLElement) highlight.style.removeProperty("pointer-events");
      }
      return { occludedFrames, sampledFrames };
    }, scenario.from);
    expect(result.sampledFrames).toBeGreaterThan(0);
    expect(result.occludedFrames).toBe(0);
  });
}
