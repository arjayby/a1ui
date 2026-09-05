import { expect, test } from "@playwright/test";

test("catalog links to an interactive swap demo and keyboard-accessible review", async ({ page }) => {
  await page.goto("/");
  await page.locator(".catalog-card-link").filter({ hasText: "Multichain Swap" }).click();
  await expect(page).toHaveTitle("Multichain Swap | a1ui");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const form = page.getByRole("form", { name: "Multichain swap" });
  await form.getByRole("button", { name: "Connect wallet" }).click();
  await form.getByRole("combobox", { name: "Destination network" }).click();
  await page.getByRole("option", { name: "Solana", exact: true }).click();
  await form.getByRole("combobox", { name: "Destination token" }).click();
  await page.getByRole("option", { name: "SOL", exact: true }).click();
  await form.getByRole("combobox", { name: "Slippage" }).click();
  await page.getByRole("option", { name: "1%", exact: true }).click();
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
  await expect(form.getByRole("combobox", { name: "Source network" })).toHaveText("Base");
  await expect(form.getByRole("combobox", { name: "Destination network" })).toHaveText("Ethereum");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("registry includes swap source and its reusable selector", async ({ request }) => {
  const response = await request.get("/r/multichain-swap.json");
  expect(response.ok()).toBeTruthy();
  const item = await response.json();
  expect(item.dependencies).toContain("lucide-react");
  expect(item.dependencies).toContain("@base-ui/react@^1.8.0");
  expect(item.files[0].content).toContain("export function MultichainSwap");
  expect(item.files[0].content).toContain('from "./select-menu"');
  expect(item.files[1].content).toContain("export function SelectMenu");
});

test("swap menus preserve token filtering and show full option details", async ({ page }) => {
  await page.goto("/components/multichain-swap");
  const form = page.getByRole("form", { name: "Multichain swap" });
  await form.getByRole("button", { name: "Connect wallet" }).click();
  await form.getByRole("combobox", { name: "Destination network" }).click();
  await page.getByRole("option", { name: "Ethereum", exact: true }).click();
  await form.getByRole("combobox", { name: "Destination token" }).click();
  await expect(page.getByRole("option", { name: "ETH", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByRole("option", { name: "USDC", exact: true })).toContainText("2400");
  await page.keyboard.press("Escape");
  await expect(form.getByRole("combobox", { name: "Destination token" })).toBeFocused();
  await expect(form.getByRole("button", { name: "Review swap" })).toBeEnabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
