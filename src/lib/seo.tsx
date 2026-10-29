import { getSiteUrl } from "@/lib/site-url.mjs";

export const siteName = "a1ui";
export const siteDescription =
  "Animated React components and blocks. Copy and paste them, or install them with your agent.";
export const siteUrl = getSiteUrl();
export const repositoryUrl = "https://github.com/arjayby/a1ui";

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

type DocGroup = { name: "Components" | "Blocks"; path: "/components" | "/blocks" };

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
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: siteName, item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: group.name, item: absoluteUrl(group.path) },
        { "@type": "ListItem", position: 3, name: title, item: absoluteUrl(path) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: title,
      description,
      url: absoluteUrl(path),
      codeRepository: repositoryUrl,
      programmingLanguage: ["TypeScript", "React"],
      license: "https://opensource.org/licenses/MIT",
      isPartOf: { "@type": "WebSite", name: siteName, url: absoluteUrl("/") },
    },
  ];
}

export const componentsGroup: DocGroup = { name: "Components", path: "/components" };
export const blocksGroup: DocGroup = { name: "Blocks", path: "/blocks" };

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so description text can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
