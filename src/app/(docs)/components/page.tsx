import type { Metadata } from "next";
import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { CatalogPreview } from "@/components/catalog-preview";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
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
      <div className="catalog-grid">
        {components.map((component) => (
          <Card key={component.slug} role="article" className="catalog-card">
            <CatalogPreview group="components" slug={component.slug} />
            <CardContent className="catalog-card-content">
              <h2 className="ui-card-title">
                <Link href={`/components/${component.slug}`} className="catalog-card-link">
                  {component.title}
                  <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0" />
                </Link>
              </h2>
              <CardDescription>{component.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
