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

test("attachments simulate failure, retry and removal on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/attachments");
  await page
    .getByLabel("Attach files")
    .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("Meeting notes") });
  await page.getByRole("button", { name: "Simulate failure" }).click();
  await expect(
    page.getByRole("region", { name: "Attachments", exact: true }).getByRole("alert"),
  ).toContainText("Simulated connection failure");
  await page.getByRole("button", { name: "Retry notes.txt" }).click();
  await expect(
    page.getByRole("region", { name: "Attachments", exact: true }).getByRole("status"),
  ).toContainText("done");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Remove notes.txt" }).click();
  await expect(page.getByText("No files selected", { exact: true })).toBeVisible();
});

test("message actions copy full text, edit and retry a failed response", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/components/message-actions");
  const actions = page.getByRole("group", { name: "Message actions", exact: true });
  await actions.getByRole("button", { name: "Copy response" }).click();
  await expect(actions.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Test the main task with three people",
  );
  await actions.getByRole("button", { name: "Edit", exact: true }).click();
  await actions.getByLabel("Edit message").fill("A revised response");
  await actions.getByRole("button", { name: "Save edit" }).click();
  await expect(page.getByText("A revised response", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Simulate response error" }).click();
  await actions.getByRole("button", { name: "Retry response" }).click();
  await expect(actions.getByRole("status")).toHaveText("Retry complete.");
});
