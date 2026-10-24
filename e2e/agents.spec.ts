import { expect, test } from "@playwright/test";
import registry from "../registry.json" with { type: "json" };

test("agent-only context stays in guides and out of website search", async ({ request }) => {
  const guide = await request.get("/docs/blocks/ascii-morph.md");
  expect(await guide.text()).toContain("### Controlled shape");
  const search = await request.get("/api/search?query=Controlled%20shape");
  expect(search.ok()).toBeTruthy();
  expect(await search.text()).not.toContain("#controlled-shape");
});

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

test("copy prompts support both discovery and a chosen block", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const copyButton = page.getByRole("button", { name: "Copy prompt for agent" });
  const idleWidth = await copyButton.evaluate((element) => element.getBoundingClientRect().width);
  await copyButton.click();
  await expect(copyButton).toHaveAttribute("data-slot", "copy-button");
  await expect(copyButton).toHaveAttribute("data-state", "copied");
  await expect(copyButton).toHaveText("Copy prompt for agent");
  await expect
    .poll(() =>
      page
        .getByRole("button", { name: "Copy prompt for agent", exact: true })
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBe(idleWidth);
  const discovery = await page.evaluate(() => navigator.clipboard.readText());
  expect(discovery).toContain("/llms.txt");
  expect(discovery).toContain("[describe what you want]");
  await page.goto("/blocks/section-rail");
  await page.getByRole("button", { name: "Copy prompt for agent" }).click();
  await expect(page.getByRole("button", { name: "Copy prompt for agent" })).toHaveAttribute(
    "data-state",
    "copied",
  );
  const selected = await page.evaluate(() => navigator.clipboard.readText());
  expect(selected).toContain("Install and integrate the a1ui section-rail block");
  expect(selected).toContain("/docs/blocks/section-rail.md");
  expect(selected).not.toContain("[describe what you want]");
});

test("a blocked clipboard provides a selectable prompt on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("Denied")) },
    });
  });
  await page.goto("/blocks/section-rail");
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
