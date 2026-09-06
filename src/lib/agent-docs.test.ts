import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import registry from "../../registry.json";
import { renderAgentIndex, renderComponentGuide } from "../../scripts/lib/agent-docs.mjs";
import { getSiteUrl } from "./site-url.mjs";

const origin = "https://components.example.com";

describe("agent documentation", () => {
  for (const item of registry.items) {
    it(`publishes usable ${item.name} documentation without MDX wrappers`, async () => {
      const mdx = await readFile(`content/docs/components/${item.name}.mdx`, "utf8");
      const guide = renderComponentGuide(item, mdx, origin);
      expect(guide).toContain(`${origin}/r/${item.name}.json --yes`);
      expect(guide).toContain("## API reference");
      expect(guide).toContain(item.meta.a1ui.limitations[0]);
      expect(guide).not.toMatch(/<(?:Installation|ComponentSource|Tabs|Tab|\w+Demo)\b/);
      expect(guide).not.toContain("localhost");
      // Preserve executable examples byte for byte, including JSX and code URLs.
      for (const block of mdx.matchAll(/```tsx\n([\s\S]*?)```/g)) {
        expect(guide).toContain(block[0]);
      }
      expect(renderAgentIndex(registry, origin)).toContain(`${origin}/docs/components/${item.name}.md`);
    });
  }

  it("rejects unknown MDX and incomplete examples instead of publishing broken instructions", async () => {
    const item = registry.items[0];
    const mdx = await readFile(`content/docs/components/${item.name}.mdx`, "utf8");
    expect(() => renderComponentGuide(item, mdx + "\n<NewInstructions />", origin)).toThrow("Unresolved MDX");
    expect(() => renderComponentGuide(item, mdx.replace("```tsx", "```text"), origin)).toThrow("Incomplete");
    expect(() => renderComponentGuide(item, mdx + "\n```tsx\n", origin)).toThrow("Incomplete");
  });

  it("normalizes deployment origins and rejects unsupported URL configuration", () => {
    expect(getSiteUrl(origin + "/")).toBe(origin);
    for (const value of [
      "ftp://example.com",
      "https://example.com/docs",
      "https://user:pass@example.com",
      "https://example.com/?query=yes",
    ]) {
      expect(() => getSiteUrl(value)).toThrow();
    }
  });
});
