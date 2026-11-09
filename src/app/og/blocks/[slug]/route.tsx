import { blocks, getBlock } from "@/lib/block-catalog";
import { renderOgImage } from "@/lib/og-image";

// Linked from each block page's metadata in lib/doc-metadata.ts, like the component images.
export const dynamicParams = false;

export function generateStaticParams() {
  return blocks.map(({ slug }) => ({ slug }));
}

export async function GET(_request: Request, { params }: RouteContext<"/og/blocks/[slug]">) {
  const block = getBlock((await params).slug);
  if (!block) return new Response(null, { status: 404 });
  return renderOgImage({ eyebrow: "React block", title: block.title, description: block.description });
}
