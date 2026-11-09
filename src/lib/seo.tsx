import type { Metadata } from "next";

import { getSiteUrl } from "@/lib/site-url.mjs";

export const siteName = "a1ui";
export const siteTitle = "a1ui — Animated React components and blocks";
export const siteDescription =
  "Animated React components and blocks. Copy and paste them, or install them with your agent.";
export const siteUrl = getSiteUrl();
export const repositoryUrl = "https://github.com/arjayby/a1ui";
export const author = { name: "Arjay Bayona", url: "https://github.com/arjayby" };

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

// Setting openGraph on a page replaces the layout's openGraph object instead of merging with it,
// so every page builds the whole object here, including the site-wide share image from
// app/opengraph-image.tsx. Open Graph and Twitter titles and descriptions are filled in by
// Next.js from the page's own title and description.
export const sharedOpenGraph = { type: "website", siteName, locale: "en_US" } as const;
const defaultImage = { url: "/opengraph-image", alt: siteTitle };

export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: Metadata["title"];
  description: string;
  path: string;
  image?: { url: string; alt: string };
}): Metadata {
  const { url, alt } = image ?? defaultImage;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...sharedOpenGraph,
      url: path,
      images: [{ url, alt, width: 1200, height: 630, type: "image/png" }],
    },
  };
}

type DocGroup = { name: "Components" | "Blocks"; path: "/components" | "/blocks" };

export const componentsGroup: DocGroup = { name: "Components", path: "/components" };
export const blocksGroup: DocGroup = { name: "Blocks", path: "/blocks" };

function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: siteName, path: "/" }, ...trail].map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

const website = { "@type": "WebSite", name: siteName, url: absoluteUrl("/") };

// Describes a component or block page as a breadcrumb trail and a piece of source code.
export function docStructuredData({
  group,
  title,
  description,
  path,
}: {
  group: DocGroup;
  title: string;
  description: string;
  path: string;
}) {
  return [
    breadcrumbs([group, { name: title, path }]),
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: title,
      description,
      url: absoluteUrl(path),
      codeRepository: repositoryUrl,
      programmingLanguage: ["TypeScript", "React"],
      runtimePlatform: "React 19",
      license: "https://opensource.org/licenses/MIT",
      author: { "@type": "Person", ...author },
      isPartOf: website,
    },
  ];
}

// Describes a catalog page as a breadcrumb trail and the list of pages it links to.
export function collectionStructuredData({
  group,
  description,
  items,
}: {
  group: DocGroup;
  description: string;
  items: { slug: string; title: string }[];
}) {
  return [
    breadcrumbs([group]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: group.name,
      description,
      url: absoluteUrl(group.path),
      isPartOf: website,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map(({ slug, title }, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: title,
          url: absoluteUrl(`${group.path}/${slug}`),
        })),
      },
    },
  ];
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so description text can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
