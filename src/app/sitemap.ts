import type { MetadataRoute } from "next";

import { blocks } from "@/lib/block-catalog";
import { components } from "@/lib/component-catalog";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/components",
    "/blocks",
    "/agents",
    ...components.map(({ slug }) => `/components/${slug}`),
    ...blocks.map(({ slug }) => `/blocks/${slug}`),
  ].map((path) => ({ url: absoluteUrl(path) }));
}
