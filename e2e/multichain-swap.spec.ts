import { expect, test } from "@playwright/test";

test("catalog links to an interactive swap demo and keyboard-accessible review", async ({ page }) => {
  await page.goto("/");
  await page.locator(".catalog-card-link").filter({ hasText: "Multichain Swap" }).click();
  await expect(page).toHaveTitle("Multichain Swap | a1ui");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const form = page.getByRole("form", { name: "Multichain swap" });
  await form.getByRole("button", { name: "Connect wallet" }).click();
  await form.getByLabel("Destination network").selectOption("solana");
  await form.getByLabel("Destination token").selectOption("solana:sol");
  await form.getByLabel("Slippage").selectOption("100");
  await form.getByLabel("You pay").fill("0.5");
  await form.getByRole("button", { name: "Review swap" }).click();
  const dialog = page.getByRole("dialog", { name: "Review demo swap" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Solana");
  await expect(dialog).toContainText("0.5 ETH");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(form.getByRole("button", { name: "Review swap" })).toBeFocused();
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Simulate swap" }).click();
  await expect(page.getByRole("dialog", { name: "Demo complete" })).toContainText("No transaction was sent.");
});

test("swap remains usable on narrow screens and rejects overspending", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/multichain-swap");
  const form = page.getByRole("form", { name: "Multichain swap" });
  await form.getByRole("button", { name: "Connect wallet" }).click();
  await form.getByLabel("You pay").fill("2");
  await expect(form.getByRole("status", { name: "Swap status" })).toContainText("Insufficient ETH balance.");
  await expect(form.getByRole("button", { name: "Review swap" })).toBeDisabled();
  await form.getByRole("button", { name: "MAX" }).click();
  await expect(form.getByLabel("You pay")).toHaveValue("1.284");
  await expect(form.getByRole("button", { name: "Review swap" })).toBeEnabled();
  await form.getByRole("button", { name: "Reverse swap direction" }).click();
  await expect(form.getByLabel("Source network")).toHaveValue("8453");
  await expect(form.getByLabel("Destination network")).toHaveValue("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("registry includes self-contained swap source and icons", async ({ request }) => {
  const response = await request.get("/r/multichain-swap.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.dependencies).toContain("lucide-react");
  expect(item.files[0].content).toContain("export function MultichainSwap");
  expect(item.files[0].content).not.toContain("@/components");
});
