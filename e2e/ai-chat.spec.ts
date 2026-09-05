import { expect, test } from "@playwright/test";

test("history persists renames, selection and deletion across reloads", async ({ page }) => {
  await page.goto("/components/conversation-history");
  const demo = page.getByRole("region", { name: "Conversation history" });
  await demo.getByRole("button", { name: "Rename Research a new idea" }).click();
  await demo.getByLabel("Conversation title").fill("A saved idea");
  await demo.getByRole("button", { name: "Save title" }).click();
  await page.reload();
  await expect(demo.getByRole("button", { name: "A saved idea", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await demo.getByRole("button", { name: "Delete A saved idea" }).click();
  await demo.getByRole("button", { name: "Confirm delete" }).click();
  await page.reload();
  await expect(demo.getByRole("button", { name: "A saved idea", exact: true })).toHaveCount(0);
});

test("history fits a narrow viewport and supports keyboard editing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/conversation-history");
  const demo = page.getByRole("region", { name: "Conversation history" });
  await demo.getByRole("button", { name: "Rename Plan the launch" }).click();
  await expect(demo.getByLabel("Conversation title")).toBeFocused();
  await demo.getByLabel("Conversation title").press("Escape");
  await expect(demo.getByLabel("Conversation title")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
