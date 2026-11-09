import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMDXComponents } from "@/components/mdx";
import { pageMetadata } from "@/lib/seo";
import { source } from "@/lib/source";

export const metadata: Metadata = pageMetadata({
  title: "Install with an agent",
  description:
    "Let your coding agent choose, install, and integrate a1ui components and blocks through the shadcn registry, llms.txt, and Markdown guides.",
  path: "/agents",
});

export default function AgentsPage() {
  const page = source.getPage(["agents"]);
  if (!page) notFound();
  const MDX = page.data.body;

  return (
    <article className="docs-article">
      <header>
        <h1>{page.data.title}</h1>
        <p>{page.data.description}</p>
      </header>
      <div className="docs-article-body prose">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}
