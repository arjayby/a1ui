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
  {
    category: "AI chat components",
    slug: "message-actions",
    title: "Message actions",
    description: "Copy, edit, regenerate, retry, and rate a response.",
  },
  {
    category: "AI chat components",
    slug: "plan-viewer",
    title: "Plan viewer",
    description: "Review and edit proposed steps, approve a revision, and follow progress.",
  },
  {
    category: "AI chat components",
    slug: "action-approval",
    title: "Action approval",
    description: "Review a proposed tool action and record an approval or rejection.",
  },
  {
    category: "AI chat components",
    slug: "artifact-viewer",
    title: "Artifact viewer",
    description: "Preview code, documents, and charts with local download controls.",
  },
] as const;

export const componentCategories = ["Components", "AI chat components"] as const;

export type ComponentSlug = (typeof components)[number]["slug"];

export function getComponent(slug: string) {
  return components.find((component) => component.slug === slug);
}
