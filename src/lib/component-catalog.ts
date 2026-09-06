import registry from "../../registry.json";

// The website and agent catalog share the registry's names and descriptions.
export const components = registry.items
  .map(({ name, title, description }) => ({ slug: name, title, description }))
  .sort((a, b) => a.title.localeCompare(b.title));

export type ComponentSlug = (typeof components)[number]["slug"];

export function getComponent(slug: string) {
  return components.find((component) => component.slug === slug);
}
