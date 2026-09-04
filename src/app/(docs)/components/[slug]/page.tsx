import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMDXComponents } from "@/components/mdx";
import { components, getComponent } from "@/lib/component-catalog";
import { source } from "@/lib/source";

export default async function ComponentPage({ params }: PageProps<"/components/[slug]">) {
  const { slug } = await params;
  const component = getComponent(slug);
  const page = source.getPage(["components", slug]);

  if (!component || !page) notFound();

  const MDX = page.data.body;

  return (
    <article className="component-doc">
      <header>
        <h1>{component.title}</h1>
        <p>{component.description}</p>
      </header>
      <div className="component-doc-body">
        <MDX components={getMDXComponents()} />
      </div>
    </article>
  );
}

export function generateStaticParams() {
  return components.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/components/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const component = getComponent(slug);
  if (!component) notFound();

  return {
    title: component.title,
    description: component.description,
  };
}
