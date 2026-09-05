import { expect, test } from "@playwright/test";

test("catalog opens wallet with keyboard tabs, privacy, and demo actions", async ({ page }) => {
  await page.goto("/");
  await page.locator(".catalog-card-link").filter({ hasText: "Crypto Wallet" }).click();
  await expect(page).toHaveTitle("Crypto Wallet | a1ui");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const wallet = page.getByRole("region", { name: "Crypto wallet" });
  await expect(wallet).toContainText("$12,840.50");
  await wallet.getByRole("button", { name: "Hide balances" }).click();
  await expect(wallet).not.toContainText("$12,840.50");
  await wallet.getByRole("tab", { name: "Tokens", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(wallet.getByRole("tab", { name: "Activity", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(wallet).toContainText("Received ETH");
  await expect(wallet).not.toContainText("+0.25 ETH");
  await wallet.getByRole("button", { name: "Show balances" }).click();
  await expect(wallet).toContainText("+0.25 ETH");
  await wallet.getByRole("button", { name: "Send", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Send crypto" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Simulate send" }).click();
  await expect(page.getByRole("dialog", { name: "Demo complete" })).toContainText("No transaction was sent.");
  await page.keyboard.press("Escape");
  await expect(wallet.getByRole("button", { name: "Send", exact: true })).toBeFocused();
  await wallet.getByRole("button", { name: "Disconnect wallet" }).click();
  await expect(wallet.getByRole("button", { name: "Connect wallet" })).toBeVisible();
  await wallet.getByRole("button", { name: "Connect wallet" }).click();
  await expect(wallet).toContainText("$12,840.50");
  await wallet.getByRole("button", { name: "Swap", exact: true }).click();
  await page.getByRole("link", { name: "Open swap demo" }).click();
  await expect(page).toHaveURL(/\/components\/multichain-swap$/);
});

test("wallet fits mobile and receive exposes the full sample address", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/components/crypto-wallet");
  const wallet = page.getByRole("region", { name: "Crypto wallet" });
  await expect(wallet).toBeVisible();
  await page.screenshot({ path: "test-results/crypto-wallet-mobile.png", fullPage: true });
  await wallet.getByRole("button", { name: "Receive", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Receive crypto" })).toContainText(
    "0x000000000000000000000000000000000000dEaD",
  );
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: "test-results/crypto-wallet-desktop.png" });
});

test("registry ships a standalone wallet with all its dependencies", async ({ request }) => {
  const response = await request.get("/r/crypto-wallet.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.name).toBe("crypto-wallet");
  expect(item.dependencies).toEqual(["@base-ui/react@^1.8.0", "clsx", "lucide-react"]);
  expect(item.files).toHaveLength(1);
  expect(item.files[0].content).toContain("export function CryptoWallet");
  expect(item.files[0].content).not.toMatch(/from ["']@\//);
});
