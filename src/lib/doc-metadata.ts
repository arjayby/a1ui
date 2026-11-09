import type { Metadata } from "next";

import { getBlock } from "@/lib/block-catalog";
import { pageMetadata } from "@/lib/seo";
import { source } from "@/lib/source";

// A component page's title and description come from its MDX front matter, the same text the
// page shows under its heading, so the search snippet always matches the page.
export function getComponentDoc(slug: string) {
  const page = source.getPage(["components", slug]);
  if (!page) throw new Error(`Missing component docs: content/docs/components/${slug}.mdx`);
  return { title: page.data.title, description: page.data.description ?? "" };
}

export function componentMetadata(slug: string): Metadata {
  const { title, description } = getComponentDoc(slug);
  return pageMetadata({
    title: `${title} — Animated React component`,
    description,
    path: `/components/${slug}`,
    image: { url: `/og/components/${slug}`, alt: `${title}, an animated React component from a1ui` },
  });
}

export function blockMetadata(slug: string): Metadata | undefined {
  const block = getBlock(slug);
  if (!block) return undefined;
  return pageMetadata({
    title: `${block.title} — Animated React block`,
    description: block.description,
    path: `/blocks/${block.slug}`,
    image: { url: `/og/blocks/${block.slug}`, alt: `${block.title}, an animated React block from a1ui` },
  });
}
