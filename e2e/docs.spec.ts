import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Resolves once the page has stopped scrolling, so smooth jumps have finished.
function settledScroll(page: Page) {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = -1;
        const check = () => {
          if (window.scrollY === last) return resolve();
          last = window.scrollY;
          setTimeout(check, 200);
        };
        check();
      }),
  );
}

test("catalog opens block documentation in the agreed order", async ({ page }) => {
  await page.goto("/blocks");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByRole("heading", { name: "Blocks", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Section Rail/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Spiral Text/ }).first()).toBeVisible();

  await page
    .getByRole("link", { name: /Section Rail/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/blocks\/section-rail$/);
  await expect(page.locator(".docs-article-body h2")).toHaveText([
    "Demo",
    "Installation",
    "Dependencies",
    "Code",
    "API reference",
  ]);
});

test("selected block navigation keeps its label visible", async ({ page }) => {
  await page.goto("/blocks/section-rail");
  const activeLink = page
    .getByRole("navigation", { name: "Blocks" })
    .getByRole("link", { name: "Section Rail" });

  const colors = await activeLink.evaluate((element) => {
    const linkStyles = getComputedStyle(element);
    const highlight = element.querySelector('[data-slot="menu-highlight"]');
    if (!highlight) throw new Error("Expected a selection highlight");
    const probe = document.body.appendChild(document.createElement("span"));
    probe.style.background = "var(--primary)";
    probe.style.color = "var(--on-primary)";
    const tokens = getComputedStyle(probe);
    const result = {
      background: getComputedStyle(highlight).backgroundColor,
      color: linkStyles.color,
      primary: tokens.backgroundColor,
      onPrimary: tokens.color,
    };
    probe.remove();
    return result;
  });

  expect(colors).toMatchObject({
    background: colors.primary,
    color: colors.onPrimary,
  });
});

test("desktop sidebar can scroll to its final block", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/blocks");

  const sidebar = page.locator('[data-sidebar="content"]');
  const blocksNav = page.getByRole("navigation", { name: "Blocks" });
  const closed = blocksNav.locator('button[aria-expanded="false"]');
  while ((await closed.count()) > 0) await closed.first().click();
  const finalLink = blocksNav.getByRole("link").last();
  await expect(finalLink).toHaveText("Arc Reel");

  await sidebar.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect
    .poll(async () => finalLink.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(600);
});

test("search finds block documentation", async ({ page }) => {
  await page.goto("/blocks");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByRole("button", { name: "Search documentation" })).toHaveCount(1);
  await page.locator("header").getByRole("button", { name: "Search documentation" }).click();

  const search = page.getByRole("dialog").getByRole("textbox");
  await search.fill("Spiral Text");
  await expect(page.getByRole("dialog").getByText("Spiral Text", { exact: true })).toBeVisible();
});

test("mobile sidebar opens, navigates, closes, and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blocks");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  await expect(page.getByRole("button", { name: "Search documentation" })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true });
  await trigger.click();
  const sidebar = page.getByRole("dialog", { name: "Documentation", exact: true });
  await expect(sidebar).toBeVisible();
  await sidebar.getByRole("button", { name: "Text Effects", exact: true }).click();
  await sidebar.getByRole("link", { name: "Spiral Text", exact: true }).click();
  await expect(page).toHaveURL(/\/blocks\/spiral-text$/);
  await expect(sidebar).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(sidebar).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("desktop sidebar and component categories support collapsing", async ({ page }) => {
  await page.goto("/components/dialog");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const sidebar = page.locator('[data-slot="sidebar-container"]');
  const components = page.getByRole("navigation", { name: "Components", exact: true });
  const overlays = components.getByRole("button", { name: "Overlays", exact: true });
  const activeComponent = components.getByRole("link", { name: "Dialog", exact: true });
  await expect(components.getByRole("link", { name: "Copy Button", exact: true })).not.toBeVisible();
  await expect(activeComponent).toBeVisible();
  await overlays.click();
  await expect(activeComponent).not.toBeVisible();
  await overlays.click();
  await expect(activeComponent).toBeVisible();
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await expect(sidebar).not.toBeInViewport();
  await page.keyboard.press("Control+b");
  await expect(sidebar).toBeInViewport();
});

for (const method of ["button", "shortcut"]) {
  test(`mobile search via ${method} leaves the selected page visible`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/blocks");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const sidebar = page.getByRole("dialog", { name: "Documentation", exact: true });
    if (method === "button") {
      await page.locator("header").getByRole("button", { name: "Search documentation" }).click();
    } else {
      await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
      await page.keyboard.press("Control+k");
    }
    await expect(sidebar).not.toBeVisible();
    const search = page.getByRole("dialog").getByRole("textbox");
    await expect(search).toBeFocused();
    await search.fill("Spiral Text");
    await page.getByRole("dialog").getByText("Spiral Text", { exact: true }).click();
    await expect(page).toHaveURL(/\/blocks\/spiral-text$/);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
}

test.describe("smooth scrolling", () => {
  // This test checks that a smooth jump never marks the sections it passes through.
  test.use({ smoothScroll: true });

  test("on-page menu jumps straight to the clicked section and then follows scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/components/menu");
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc.getByRole("link", { name: "Demo" })).toHaveAttribute("aria-current", "location");

    // Record every item the menu marks current, so a jump that passes through other sections fails.
    await page.evaluate(() => {
      const nav = document.querySelector(".docs-toc nav")!;
      const seen: string[] = [];
      Object.assign(window, { tocSeen: seen });
      new MutationObserver(() => {
        const current = nav.querySelector("[aria-current]")?.textContent;
        if (current && seen.at(-1) !== current) seen.push(current);
      }).observe(nav, { subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    });
    for (const [name, id] of [
      ["API reference", "api-reference"],
      ["Installation", "installation"],
      ["Code", "code"],
      ["Demo", "demo"],
    ]) {
      await toc.getByRole("link", { name, exact: true }).click();
      await settledScroll(page);
      await expect(page.locator(`#${id}`)).toBeInViewport();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      expect(
        await page.evaluate(() => (window as unknown as { tocSeen: string[] }).tocSeen.splice(0)),
        `jumping to ${name}`,
      ).toEqual([name]);
    }

    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 800);
    await expect(toc.getByRole("link", { name: "Dependencies" })).toHaveAttribute("aria-current", "location");
  });
});

test("on-page menu highlight follows the page after the window regains focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/components/menu");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const toc = page.getByRole("navigation", { name: "On this page" });
  const highlighted = toc.locator("a:has(> [data-slot='menu-highlight'])");
  const apiReference = toc.getByRole("link", { name: "API reference" });

  await apiReference.click();
  await expect(apiReference).toHaveAttribute("aria-current", "location");
  await expect(apiReference).not.toBeFocused();
  await settledScroll(page);

  await page.mouse.move(400, 400);
  // Wheel exactly back to the top. Chromium animates wheel scrolls itself, and a delta past the
  // top keeps that animation running while clamped at 0, where it would drag the next jump back.
  await page.mouse.wheel(0, -(await page.evaluate(() => scrollY)));
  await expect(toc.getByRole("link", { name: "Demo" })).toHaveAttribute("aria-current", "location");
  await settledScroll(page);
  // Switching apps and back blurs, then refocuses, whatever element had focus.
  await page.evaluate(() => {
    const focused = document.activeElement as HTMLElement | null;
    focused?.blur();
    focused?.focus();
  });
  await expect(highlighted).toHaveText("Demo");

  // Keyboard activation keeps focus in the menu so the reader can continue from there.
  await apiReference.focus();
  await page.keyboard.press("Enter");
  await expect(apiReference).toBeFocused();
  await expect(apiReference).toHaveAttribute("aria-current", "location");
});
