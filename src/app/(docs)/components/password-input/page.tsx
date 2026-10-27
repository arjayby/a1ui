import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AgentInstall } from "@/components/agent-install";
import { getMDXComponents } from "@/components/mdx";
import { Badge } from "@/components/ui/badge";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: "Password Input",
  description:
    "A password field that requires a strong password, with a strength meter, a live requirement checklist, and a show/hide toggle.",
};

export default function PasswordInputPage() {
  const page = source.getPage(["components", "password-input"]);
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
        <AgentInstall name="password-input" />
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
