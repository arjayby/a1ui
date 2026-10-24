import registry from "../../registry.json";

export const components = registry.items
  .filter((item) => item.type === "registry:component")
  .map(({ name, title, description }) => ({ slug: name, title, description }))
  .sort((a, b) => a.title.localeCompare(b.title));
