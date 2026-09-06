import { expect, test } from "@playwright/test";
import registry from "../registry.json" with { type: "json" };

test("the agent entry point leads to every installable item and Markdown guide", async ({ request }) => {
  const entry = await request.get("/llms.txt");
  expect(entry.ok()).toBeTruthy();
  const index = await entry.text();
  const response = await request.get("/r/registry.json");
  expect(response.ok()).toBeTruthy();
  const catalog = await response.json();
  expect(catalog.items.map((item: { name: string }) => item.name).sort()).toEqual(
    registry.items.map((item) => item.name).sort(),
  );
  for (const item of catalog.items) {
    expect(index).toContain(item.meta.a1ui.docsUrl);
    const guide = await request.get(new URL(item.meta.a1ui.docsUrl).pathname);
    expect(guide.ok()).toBeTruthy();
    expect(await guide.text()).toContain(`${item.meta.a1ui.registryUrl} --yes`);
    const install = await request.get(new URL(item.meta.a1ui.registryUrl).pathname);
    expect(install.ok()).toBeTruthy();
    expect(
      (await install.json()).files.every((file: { content: string }) => file.content.length > 0),
    ).toBeTruthy();
  }
});

test("copy prompts support both discovery and a chosen component", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: "Copy prompt for agent" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Prompt copied" })).toBeAttached();
  const discovery = await page.evaluate(() => navigator.clipboard.readText());
  expect(discovery).toContain("/llms.txt");
  expect(discovery).toContain("[describe what you want]");
  await page.goto("/components/select-menu");
  await page.getByRole("button", { name: "Copy prompt for agent" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Prompt copied" })).toBeAttached();
  const selected = await page.evaluate(() => navigator.clipboard.readText());
  expect(selected).toContain("Install and integrate the a1ui select-menu component");
  expect(selected).toContain("/docs/components/select-menu.md");
  expect(selected).not.toContain("[describe what you want]");
});

test("a blocked clipboard provides a selectable prompt on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Denied")) },
    });
  });
  await page.goto("/components/section-rail");
  await page.getByRole("button", { name: "Copy prompt for agent" }).click();
  const prompt = page.getByLabel("Copy this prompt into your agent");
  await expect(prompt).toBeVisible();
  await expect(prompt).toHaveValue(/section-rail/);
  await prompt.focus();
  expect(
    await prompt.evaluate((element: HTMLTextAreaElement) => element.selectionEnd - element.selectionStart),
  ).toBe((await prompt.inputValue()).length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
