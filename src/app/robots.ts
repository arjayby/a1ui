import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    // /preview holds the single demos that the catalog cards frame; they are not pages to land on.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/preview/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
