import { expect, test } from "@playwright/test";

for (const [name, exportedComponent] of [
  ["section-rail", "SectionRail"],
  ["spiral-text", "SpiralText"],
  ["particle-menu", "ParticleMenu"],
  ["text-scramble", "TextScramble"],
  ["text-banner", "TextBanner"],
  ["shape-flow", "ShapeFlow"],
  ["confirmation-button", "ConfirmationButton"],
]) {
  test(`registry serves ${name} source`, async ({ request }) => {
    const response = await request.get(`/r/${name}.json`);
    expect(response.ok()).toBeTruthy();

    const item = await response.json();
    expect(item.name).toBe(name);
    expect(item.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining(`export function ${exportedComponent}`),
        }),
      ]),
    );
  });
}
