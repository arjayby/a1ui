import registry from "../../registry.json";

const newlyShippedSlugs = new Set<string>();

// The website and agent catalog share the registry's names and descriptions.
export const blocks = registry.items
  .filter((item) => item.type === "registry:block")
  .map(({ name, title, description }) => ({
    slug: name,
    title,
    description,
    isNew: newlyShippedSlugs.has(name),
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

export const newBlockCount = blocks.filter((block) => block.isNew).length;

export type BlockSlug = (typeof blocks)[number]["slug"];

export function getBlock(slug: string) {
  return blocks.find((block) => block.slug === slug);
}
