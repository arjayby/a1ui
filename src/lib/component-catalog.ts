export const components = [
  {
    slug: "section-rail",
    title: "Section Rail",
    description: "A compact reading rail that tracks progress through page sections.",
  },
  {
    slug: "spiral-text",
    title: "Spiral Text",
    description: "Text set on a responsive spiral that tightens under pressure and ripples on release.",
  },
] as const;

export type ComponentSlug = (typeof components)[number]["slug"];

export function getComponent(slug: string) {
  return components.find((component) => component.slug === slug);
}
