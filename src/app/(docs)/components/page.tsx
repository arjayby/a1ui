import type { Metadata } from "next";

import { CatalogList } from "@/components/catalog-list";
import { components } from "@/lib/component-catalog";
import { collectionStructuredData, componentsGroup, JsonLd, pageMetadata } from "@/lib/seo";

const description = "Animated components built with Motion, with live previews and editable source.";

export const metadata: Metadata = pageMetadata({
  title: "Animated React components",
  description: `${components.length} animated React components built with Motion and Tailwind CSS, with live previews and editable source you install with the shadcn CLI.`,
  path: "/components",
});

export default function ComponentsPage() {
  return (
    <div className="page-frame">
      <JsonLd data={collectionStructuredData({ group: componentsGroup, description, items: components })} />
      <header>
        <p className="stipple-eyebrow">a1ui / Component library</p>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">{description}</p>
      </header>
      <CatalogList group="components" items={components} />
    </div>
  );
}
