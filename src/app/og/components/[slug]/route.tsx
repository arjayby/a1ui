import { components } from "@/lib/component-catalog";
import { getComponentDoc } from "@/lib/doc-metadata";
import { renderOgImage } from "@/lib/og-image";

// Share images for component pages, linked from each page's metadata in lib/doc-metadata.ts.
// A page-level openGraph.images would override an opengraph-image file, so images live here.
export const dynamicParams = false;

export function generateStaticParams() {
  return components.map(({ slug }) => ({ slug }));
}

export async function GET(_request: Request, { params }: RouteContext<"/og/components/[slug]">) {
  const { title, description } = getComponentDoc((await params).slug);
  return renderOgImage({ eyebrow: "React component", title, description });
}
