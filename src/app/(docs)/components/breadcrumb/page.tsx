import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentInstall } from "@/components/agent-install";
import { DocsToc } from "@/components/docs-toc";
import { getMDXComponents } from "@/components/mdx";
import { Badge } from "@/components/ui/badge";
import { componentsGroup, docStructuredData, JsonLd } from "@/lib/seo";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: "Breadcrumb",
  description:
    "A breadcrumb trail whose middle collapses into an expandable ellipsis, with segments that slide in and out as you navigate.",
  alternates: { canonical: "/components/breadcrumb" },
};

export default function BreadcrumbPage() {
  const page = source.getPage(["components", "breadcrumb"]);
  if (!page) notFound();
  const MDX = page.data.body;

  return (
    <article className="docs-article">
      <JsonLd
        data={docStructuredData({
          group: componentsGroup,
          title: page.data.title,
          description: page.data.description ?? "",
          path: "/components/breadcrumb",
        })}
      />
      <header>
        <div className="docs-page-meta">
          <Badge variant="outline">React</Badge>
          <Badge variant="outline">Motion</Badge>
        </div>
        <h1>{page.data.title}</h1>
        <p>{page.data.description}</p>
        <AgentInstall name="breadcrumb" />
      </header>
      <DocsToc items={page.data.toc} />
      <div className="docs-article-body prose">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}
