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
  {
    slug: "particle-menu",
    title: "Particle Menu",
    description: "Grainy symbols that scatter around your pointer and spring back into place.",
  },
  {
    slug: "arc-reel",
    title: "Arc Reel",
    description: "An infinitely looping reel with curved provider cards and synchronized scroll controls.",
  },
] as const;

export type ComponentSlug = (typeof components)[number]["slug"];

export function getComponent(slug: string) {
  return components.find((component) => component.slug === slug);
}
