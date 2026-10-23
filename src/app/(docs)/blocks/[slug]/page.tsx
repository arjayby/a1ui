import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMDXComponents } from "@/components/mdx";
import { AgentInstall } from "@/components/agent-install";
import { blocks, getBlock } from "@/lib/block-catalog";
import { source } from "@/lib/source";

export default async function BlockPage({ params }: PageProps<"/blocks/[slug]">) {
  const { slug } = await params;
  const block = getBlock(slug);
  const page = source.getPage(["blocks", slug]);

  if (!block || !page) notFound();

  const MDX = page.data.body;

  return (
    <article className="docs-article">
      <header>
        <h1>{block.title}</h1>
        <p>{block.description}</p>
        <AgentInstall name={block.slug} />
      </header>
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
  const { slug } = await params;
  const block = getBlock(slug);
  if (!block) notFound();

  return {
    title: block.title,
    description: block.description,
  };
}
