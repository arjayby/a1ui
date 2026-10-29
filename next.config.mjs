import { readFileSync } from "node:fs";

import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const registry = JSON.parse(readFileSync(new URL("./registry.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Markdown guides and registry JSON exist for agents and the shadcn CLI.
  // Keep them out of search results so the HTML docs pages rank instead.
  headers() {
    return ["/docs/:path*", "/r/:path*", "/llms.txt"].map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    }));
  },
  redirects() {
    return registry.items
      .filter((item) => item.type === "registry:block")
      .flatMap(({ name }) => [
        { source: `/components/${name}`, destination: `/blocks/${name}`, permanent: true },
        { source: `/docs/components/${name}.md`, destination: `/docs/blocks/${name}.md`, permanent: true },
      ]);
  },
};

export default withMDX(nextConfig);
