import { expect, test } from "@playwright/test";

test("thumb squashes while pressed, then springs across", async ({ page }) => {
  await page.goto("/components/switch");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const control = page.locator(".demo-frame").getByRole("switch", { name: "Airplane mode" });
  const thumb = control.locator('[data-slot="switch-thumb"]');
  await expect(control).toHaveAttribute("aria-checked", "false");
  const box = (await control.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(async () => (await thumb.boundingBox())!.width).toBeGreaterThan(22);
  await page.mouse.up();
  await expect(control).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await thumb.boundingBox())!.width).toBe(20);
  await expect.poll(async () => (await thumb.boundingBox())!.x - box.x).toBeCloseTo(22, 0);

  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).toHaveAttribute("aria-checked", "false");
  await page.locator(".demo-frame").getByText("Airplane mode").click();
  await expect(control).toHaveAttribute("aria-checked", "true");
});

test("thumb icons swap and the disabled switch stays put on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/switch");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.getByRole("button", { name: /^Thumb icons:/ }).click();
  await page.getByRole("menuitem", { name: "sun / moon", exact: true }).click();
  const frame = page.locator(".demo-frame");
  const control = frame.getByRole("switch", { name: "Notifications" });
  await expect(control.locator('[data-slot="switch-icon"]')).toHaveCount(2);
  await expect(control.locator('[data-state="checked"]')).toHaveCSS("opacity", "1");
  await control.click();
  await expect(control).toHaveAttribute("aria-checked", "false");
  await expect(control.locator('[data-state="unchecked"]')).toHaveCSS("opacity", "1");
  const disabled = frame.getByRole("switch", { name: "Sync over cellular" });
  await disabled.click({ force: true });
  await expect(disabled).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("catalog, registry, and agent docs include the switch", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/switch"]').click();
  await expect(page.getByRole("heading", { name: "Switch", exact: true })).toBeVisible();
  const item = await (await request.get("/r/switch.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.files[0].target).toBe("components/animated/switch.tsx");
  expect(item.files[0].content).toContain("export function Switch");
  const guide = await request.get("/docs/components/switch.md");
  expect(guide.ok()).toBe(true);
  expect(await guide.text()).toContain("@/components/animated/switch");
});
