import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentInstall } from "@/components/agent-install";
import { getMDXComponents } from "@/components/mdx";
import { Badge } from "@/components/ui/badge";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: "Icon Toggle",
  description: "A two-state icon button that morphs its SVG paths on every click.",
};

export default function IconTogglePage() {
  const page = source.getPage(["components", "icon-toggle"]);
  if (!page) notFound();
  const MDX = page.data.body;

  return (
    <article className="docs-article">
      <header>
        <div className="docs-page-meta">
          <Badge variant="outline">React</Badge>
          <Badge variant="outline">Motion</Badge>
        </div>
        <h1>{page.data.title}</h1>
        <p>{page.data.description}</p>
        <AgentInstall name="icon-toggle" />
      </header>
      <nav aria-label="On this page" className="docs-section-nav">
        {page.data.toc
          .filter((item) => item.depth === 2)
          .map((item) => (
            <a key={item.url} href={item.url}>
              {item.title}
            </a>
          ))}
      </nav>
      <div className="docs-article-body prose">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}
