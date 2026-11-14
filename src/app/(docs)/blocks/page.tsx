import type { Metadata } from "next";
import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { AgentInstall } from "@/components/agent-install";

import { CatalogPreview } from "@/components/catalog-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { blocks } from "@/lib/block-catalog";
import { blocksGroup, collectionStructuredData, JsonLd, pageMetadata } from "@/lib/seo";

const description = "Ready-made React compositions inspired by designs found online.";

export const metadata: Metadata = pageMetadata({
  title: "Animated React blocks",
  description: `${blocks.length} ready-made animated React blocks, from ASCII art to text effects and navigation, inspired by designs found online and installed as editable source.`,
  path: "/blocks",
});

export default function BlocksPage() {
  return (
    <div className="page-frame">
      <JsonLd data={collectionStructuredData({ group: blocksGroup, description, items: blocks })} />
      <header>
        <p className="stipple-eyebrow">a1ui / Block library</p>
        <h1 className="page-heading">Blocks</h1>
        <p className="page-description">{description}</p>
        <AgentInstall />
      </header>

      <div className="catalog-grid">
        {blocks.map((block) => {
          return (
            <Card key={block.slug} role="article" className="catalog-card">
              <CatalogPreview group="blocks" slug={block.slug} />
              <CardContent className="catalog-card-content">
                <h2 className="ui-card-title">
                  <Link
                    href={`/blocks/${block.slug}`}
                    aria-description={block.isNew ? "New block shipped" : undefined}
                    className="catalog-card-link"
                  >
                    {block.title}
                    {block.isNew ? (
                      <Badge variant="dot" className="absolute top-3 right-3" aria-hidden="true" />
                    ) : null}
                    <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0" />
                  </Link>
                </h2>
                <CardDescription>{block.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
