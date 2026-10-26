import { expect, test } from "@playwright/test";

test("adds tags, removes them with Backspace twice, and respects the limit", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/tag-input");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const frame = page.locator(".demo-frame");
  const input = frame.getByRole("textbox", { name: "Topics" });
  const tags = frame.locator('[data-slot="tag-input-tag"]');
  const count = frame.locator('[data-slot="tag-input-count"]');
  await expect(tags).toHaveText(["Design", "Motion", "React"]);

  await input.click();
  await page.keyboard.type("Zod,");
  await expect(tags).toHaveCount(4);
  await page.keyboard.type("Tailwind");
  await page.keyboard.press("Enter");
  await expect(count).toHaveText("5/5");
  await expect(input).toHaveAttribute("readonly");

  await page.keyboard.press("Backspace");
  await expect(tags.last()).toHaveAttribute("data-highlighted", "true");
  await expect(tags).toHaveCount(5);
  await page.keyboard.press("Backspace");
  await expect(tags).toHaveText(["Design", "Motion", "React", "Zod"]);
  await expect(tags.last()).not.toHaveAttribute("data-highlighted");

  await frame.getByRole("button", { name: "Remove Design" }).click();
  await expect(tags).toHaveText(["Motion", "React", "Zod"]);
  await expect(input).toBeFocused();

  await page.getByRole("button", { name: "Max tags: 5" }).click();
  await page.getByRole("menuitem", { name: "3", exact: true }).click();
  await expect(count).toHaveText("3/3");
  expect(errors).toEqual([]);
});

test("ships a catalog entry, source, and agent guide", async ({ page, request }) => {
  await page.goto("/components");
  await page.locator('.catalog-card-link[href="/components/tag-input"]').click();
  await expect(page.getByRole("heading", { name: "Tag Input", exact: true })).toBeVisible();
  const item = await (await request.get("/r/tag-input.json")).json();
  expect(item.type).toBe("registry:component");
  expect(item.registryDependencies).toEqual(["label"]);
  expect(item.files[0].target).toBe("components/animated/tag-input.tsx");
  expect(item.files[0].content).toContain("export function TagInput");
  const guide = await request.get("/docs/components/tag-input.md");
  expect(await guide.text()).toContain("@/components/animated/tag-input");
});
