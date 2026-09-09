import registry from "../../registry.json";

// The latest shipped components, confirmed by their creation commits.
const newlyShippedSlugs = new Set(["ascii-terrain", "text-banner", "confirmation-button"]);

// The website and agent catalog share the registry's names and descriptions.
export const components = registry.items
  .map(({ name, title, description }) => ({
    slug: name,
    title,
    description,
    isNew: newlyShippedSlugs.has(name),
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

export const newComponentCount = components.filter((component) => component.isNew).length;

export type ComponentSlug = (typeof components)[number]["slug"];

export function getComponent(slug: string) {
  return components.find((component) => component.slug === slug);
}
