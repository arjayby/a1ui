import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsToc } from "@/components/docs-toc";
import { getMDXComponents } from "@/components/mdx";
import { AgentInstall } from "@/components/agent-install";
import { Badge } from "@/components/ui/badge";
import { blocks, getBlock } from "@/lib/block-catalog";
import { blockMetadata } from "@/lib/doc-metadata";
import { blocksGroup, docStructuredData, JsonLd } from "@/lib/seo";
import { source } from "@/lib/source";

export default async function BlockPage({ params }: PageProps<"/blocks/[slug]">) {
  const { slug } = await params;
  const block = getBlock(slug);
  const page = source.getPage(["blocks", slug]);

  if (!block || !page) notFound();

  const MDX = page.data.body;

  return (
    <article className="docs-article">
      <JsonLd
        data={docStructuredData({
          group: blocksGroup,
          title: block.title,
          description: block.description,
          path: `/blocks/${block.slug}`,
        })}
      />
      <header>
        <div className="docs-page-meta">
          <Badge variant="outline">React</Badge>
        </div>
        <h1>{block.title}</h1>
        <p>{block.description}</p>
        <AgentInstall name={block.slug} />
      </header>
      <DocsToc items={page.data.toc} />
      <div className="docs-article-body prose">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}

export function generateStaticParams() {
  return blocks.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/blocks/[slug]">): Promise<Metadata> {
  const metadata = blockMetadata((await params).slug);
  if (!metadata) notFound();
  return metadata;
}
