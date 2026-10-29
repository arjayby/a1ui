import { notFound } from "next/navigation";

import { blocks, getBlock } from "@/lib/block-catalog";
import { ogImageSize, renderOgImage } from "@/lib/og-image";

export const alt = "An animated React block from a1ui";
export const size = ogImageSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return blocks.map(({ slug }) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const block = getBlock((await params).slug);
  if (!block) notFound();

  return renderOgImage({ eyebrow: "React block", title: block.title, description: block.description });
}
