import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentInstall } from "@/components/agent-install";
import { DocsToc } from "@/components/docs-toc";
import { getMDXComponents } from "@/components/mdx";
import { Badge } from "@/components/ui/badge";
import { componentsGroup, docStructuredData, JsonLd } from "@/lib/seo";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: "Badge",
  description:
    "A badge whose count rolls like an odometer, resizes smoothly, pops in from zero, and can pulse a live status dot.",
  alternates: { canonical: "/components/badge" },
};

export default function BadgePage() {
  const page = source.getPage(["components", "badge"]);
  if (!page) notFound();
  const MDX = page.data.body;

  return (
    <article className="docs-article">
      <JsonLd
        data={docStructuredData({
          group: componentsGroup,
          title: page.data.title,
          description: page.data.description ?? "",
          path: "/components/badge",
        })}
      />
      <header>
        <div className="docs-page-meta">
          <Badge variant="outline">React</Badge>
          <Badge variant="outline">Motion</Badge>
        </div>
        <h1>{page.data.title}</h1>
        <p>{page.data.description}</p>
        <AgentInstall name="badge" />
      </header>
      <DocsToc items={page.data.toc} />
      <div className="docs-article-body prose">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}
