import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMDXComponents } from "@/components/mdx";
import { source } from "@/lib/source";

export const metadata: Metadata = {
  title: "Install with an agent",
  description: "Let your coding agent choose, install, and integrate an a1ui component.",
};

export default function AgentsPage() {
  const page = source.getPage(["agents"]);
  if (!page) notFound();
  const MDX = page.data.body;

  return (
    <article className="component-doc">
      <header>
        <h1>{page.data.title}</h1>
        <p>{page.data.description}</p>
      </header>
      <div className="component-doc-body prose">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}
