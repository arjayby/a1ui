import registry from "../../registry.json";

export const components = registry.items
  .filter((item) => item.type === "registry:component")
  .map(({ name, title, description }) => ({ slug: name, title, description }))
  .sort((a, b) => a.title.localeCompare(b.title));

export type CatalogComponent = (typeof components)[number];

/** Category order is intentional; components inside each category sort by title. */
const categorySlugs = [
  { title: "Buttons & Actions", slugs: ["confirm-button", "copy-button", "loading-button", "icon-toggle"] },
  {
    title: "Text Inputs",
    slugs: ["textarea", "password-input", "validated-input", "otp-input", "tag-input"],
  },
  {
    title: "Selection Controls",
    slugs: ["checkbox", "switch", "radio-group", "toggle-group", "slider", "select"],
  },
  { title: "Navigation", slugs: ["menu", "tabs", "breadcrumb", "pagination"] },
  {
    title: "Overlays",
    slugs: ["dialog", "alert-dialog", "popover", "tooltip", "hover-card", "dropdown-menu"],
  },
  { title: "Feedback & Status", slugs: ["toast", "progress", "skeleton"] },
  { title: "Data Display", slugs: ["badge", "avatar-group", "kbd", "accordion"] },
] as const;

const categorized = new Set<string>(categorySlugs.flatMap(({ slugs }) => slugs));
const uncategorized = components.filter(({ slug }) => !categorized.has(slug));

export const componentCategories: { title: string; components: CatalogComponent[] }[] = [
  ...categorySlugs.map(({ title, slugs }) => ({
    title,
    components: components.filter(({ slug }) => (slugs as readonly string[]).includes(slug)),
  })),
  ...(uncategorized.length ? [{ title: "Other", components: uncategorized }] : []),
];
