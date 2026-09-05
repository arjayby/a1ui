export const components = [
  {
    category: "Components",
    slug: "section-rail",
    title: "Section Rail",
    description: "A compact reading rail that tracks progress through page sections.",
  },
  {
    category: "Components",
    slug: "spiral-text",
    title: "Spiral Text",
    description: "Text set on a responsive spiral that tightens under pressure and ripples on release.",
  },
  {
    category: "AI chat components",
    slug: "conversation-history",
    title: "Conversation history",
    description: "Saved conversations with search, selection, rename, and delete.",
  },
  {
    category: "AI chat components",
    slug: "attachments",
    title: "Attachments",
    description: "File selection, local previews, and controlled upload states.",
  },
] as const;

export const componentCategories = ["Components", "AI chat components"] as const;

export type ComponentSlug = (typeof components)[number]["slug"];

export function getComponent(slug: string) {
  return components.find((component) => component.slug === slug);
}
