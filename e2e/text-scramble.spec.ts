import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/components/text-scramble");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("randomizes the phrase and scrambles every character while keeping the final phrase accessible", async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const scramble = page.locator('.text-scramble-demo [data-slot="text-scramble"]');
  const visual = scramble.locator('[aria-hidden="true"]');
  const change = page.getByRole("button", { name: "Randomize phrase", exact: true });

  await expect(scramble).toHaveAttribute("data-state", "idle");
  await change.focus();
  await page.keyboard.press("Enter");
  await expect(scramble).toHaveAttribute("data-state", "scrambling");
  await expect(visual).toHaveText(
    /^[ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/]{4} [ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/]{2} [ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/]{6}$/,
  );
  const phrase = await scramble.locator(".sr-only").textContent();
  expect(["MAKE IT COUNT.", "MAKE IT YOURS."]).toContain(phrase);
  await expect(scramble).toMatchAriaSnapshot(`- text: ${phrase}`);
  await page.clock.runFor(1100);
  await expect(visual).toHaveText(phrase!);
  await expect(scramble).toHaveAttribute("data-state", "idle");

  await change.click();
  const nextPhrase = await scramble.locator(".sr-only").textContent();
  expect(nextPhrase).not.toBe(phrase);
  await page.clock.runFor(200);
  await change.click();
  const latestPhrase = await scramble.locator(".sr-only").textContent();
  expect(latestPhrase).not.toBe(nextPhrase);
  await expect(scramble).toMatchAriaSnapshot(`- text: ${latestPhrase}`);
  await page.clock.runFor(1100);
  await expect(visual).toHaveText(latestPhrase!);
  await expect(scramble).toHaveAttribute("data-state", "idle");
});

test("reduced motion updates immediately without intermediate characters", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const scramble = page.locator('.text-scramble-demo [data-slot="text-scramble"]');
  await page.getByRole("button", { name: "Randomize phrase", exact: true }).click();
  await expect(scramble).toHaveAttribute("data-state", "idle");
  const phrase = await scramble.locator(".sr-only").textContent();
  expect(["MAKE IT COUNT.", "MAKE IT YOURS."]).toContain(phrase);
  await expect(scramble.locator('[aria-hidden="true"]')).toHaveText(phrase!);
  await expect(scramble).toMatchAriaSnapshot(`- text: ${phrase}`);
});

test("mobile demo fits the viewport and remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Randomize phrase", exact: true }).click();
  await expect(page.locator('.text-scramble-demo [aria-hidden="true"].whitespace-pre-wrap')).toHaveText(
    /^MAKE IT (COUNT|YOURS)\.$/,
  );
  const overflows = await page.locator(".text-scramble-demo").evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.right > window.innerWidth || element.scrollWidth > element.clientWidth;
  });
  expect(overflows).toBe(false);
});
