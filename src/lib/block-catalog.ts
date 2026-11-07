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

export type CatalogBlock = (typeof blocks)[number];

/** Category order is intentional; blocks inside each category sort by title. */
const categorySlugs = [
  { title: "ASCII", slugs: ["ascii-morph", "ascii-lens", "ascii-terrain"] },
  { title: "Text Effects", slugs: ["text-scramble", "text-banner", "spiral-text", "shape-flow"] },
  { title: "Navigation", slugs: ["section-rail", "particle-menu"] },
  { title: "Carousels", slugs: ["arc-reel"] },
] as const;

const categorized = new Set<string>(categorySlugs.flatMap(({ slugs }) => slugs));
const uncategorized = blocks.filter(({ slug }) => !categorized.has(slug));

export const blockCategories: { title: string; blocks: CatalogBlock[] }[] = [
  ...categorySlugs.map(({ title, slugs }) => ({
    title,
    blocks: blocks.filter(({ slug }) => (slugs as readonly string[]).includes(slug)),
  })),
  ...(uncategorized.length ? [{ title: "Other", blocks: uncategorized }] : []),
];
