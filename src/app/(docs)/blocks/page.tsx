import type { Metadata } from "next";

import { AgentInstall } from "@/components/agent-install";

import { CatalogList } from "@/components/catalog-list";
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

      <CatalogList group="blocks" items={blocks} />
    </div>
  );
}
