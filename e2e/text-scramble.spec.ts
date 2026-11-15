import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/blocks/text-scramble");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
});

test("randomizes the phrase and scrambles every character while keeping the final phrase accessible", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
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

test("reduced motion shows the new text at once and fades it in without intermediate characters", async ({
  page,
}) => {
  // Motion reads the preference once per page, so set it before the page loads.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const scramble = page.locator('.text-scramble-demo [data-slot="text-scramble"]');
  const visual = scramble.locator('[aria-hidden="true"]');
  const fades = visual.evaluate((element) => {
    const seen: string[] = [];
    const sample = () => {
      seen.push(`${element.textContent}:${getComputedStyle(element).opacity}`);
      if (element.getAnimations().length > 0 || seen.length < 3) requestAnimationFrame(sample);
    };
    return new Promise<string[]>((resolve) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      buttons.find((button) => button.textContent?.includes("Randomize phrase"))!.click();
      // React commits the click in a microtask, so the first sample waits for it.
      queueMicrotask(sample);
      setTimeout(() => resolve(seen), 400);
    });
  });

  const seen = await fades;
  const phrase = await scramble.locator(".sr-only").textContent();
  expect(["MAKE IT COUNT.", "MAKE IT YOURS."]).toContain(phrase);
  // Every frame already shows the final phrase; only its opacity changes.
  expect(seen.every((frame) => frame.startsWith(`${phrase}:`))).toBe(true);
  expect(seen.some((frame) => Number(frame.split(":")[1]) < 1)).toBe(true);
  await expect(scramble).toHaveAttribute("data-state", "idle");
  await expect(visual).toHaveText(phrase!);
  await expect(visual).toHaveCSS("opacity", "1");
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
