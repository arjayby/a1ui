import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { catalogDemos, catalogReveals, type CatalogGroup } from "@/components/catalog-demos";
import { CatalogReveal } from "@/components/catalog-reveal";

// A bare page holding one docs demo with its hidden content already open. The catalog
// cards frame these pages; nobody is meant to land on one, so they stay out of search.
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

const isGroup = (group: string): group is CatalogGroup => group === "components" || group === "blocks";

export default async function PreviewPage({ params }: PageProps<"/preview/[group]/[slug]">) {
  const { group, slug } = await params;
  const reveal = isGroup(group) ? catalogReveals[group][slug] : undefined;
  const Demo = isGroup(group) ? catalogDemos[group][slug] : undefined;
  if (!reveal || !Demo) notFound();
  const { place, ...gesture } = reveal;

  return (
    <main className="catalog-stage" data-place={place}>
      <Demo />
      <CatalogReveal {...gesture} />
    </main>
  );
}

export function generateStaticParams() {
  return (Object.keys(catalogReveals) as CatalogGroup[]).flatMap((group) =>
    Object.keys(catalogReveals[group]).map((slug) => ({ group, slug })),
  );
}
