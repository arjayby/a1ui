import { expect, test } from "./fixtures";

for (const [name, exportedComponent] of [
  ["ascii-morph", "AsciiMorph"],
  ["ascii-lens", "AsciiLens"],
  ["ascii-terrain", "AsciiTerrain"],
  ["section-rail", "SectionRail"],
  ["spiral-text", "SpiralText"],
  ["particle-menu", "ParticleMenu"],
  ["text-scramble", "TextScramble"],
  ["text-banner", "TextBanner"],
  ["shape-flow", "ShapeFlow"],
]) {
  test(`registry serves ${name} source`, async ({ request }) => {
    const response = await request.get(`/r/${name}.json`);
    expect(response.ok()).toBeTruthy();

    const item = await response.json();
    expect(item.name).toBe(name);
    expect(item.type).toBe("registry:block");
    expect(item.files[0]).toMatchObject({
      type: "registry:component",
      target: `components/blocks/${name}.tsx`,
    });
    expect(item.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining(`export function ${exportedComponent}`),
        }),
      ]),
    );
  });
}
