import { readFile } from "node:fs/promises";
import path from "node:path";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

import { DocsTab, InstallationTabs } from "@/components/docs-tabs";

import type { BlockSlug } from "@/lib/block-catalog";
import { getSiteUrl } from "@/lib/site-url.mjs";

const packageCommands = [
  { name: "npm", command: (url: string) => `npx shadcn@latest add ${url}` },
  { name: "pnpm", command: (url: string) => `pnpm dlx shadcn@latest add ${url}` },
  { name: "yarn", command: (url: string) => `yarn dlx shadcn@latest add ${url}` },
  { name: "bun", command: (url: string) => `bunx --bun shadcn@latest add ${url}` },
] as const;

export function Installation({ name }: { name: BlockSlug }) {
  const siteUrl = getSiteUrl();
  const registryUrl = `${siteUrl}/r/${name}.json`;

  return (
    <InstallationTabs>
      {packageCommands.map(({ name: packageName, command }) => (
        <DocsTab key={packageName} value={packageName}>
          <DynamicCodeBlock lang="bash" code={command(registryUrl)} />
        </DocsTab>
      ))}
    </InstallationTabs>
  );
}

export async function BlockSource({ name }: { name: BlockSlug }) {
  const source = await readFile(path.join(process.cwd(), "src", "registry", "blocks", `${name}.tsx`), "utf8");

  return <DynamicCodeBlock lang="tsx" code={source} />;
}

export async function ComponentSource({
  name,
}: {
  name: "copy-button" | "loading-button" | "confirm-button";
}) {
  const source = await readFile(
    path.join(process.cwd(), "src", "registry", "components", `${name}.tsx`),
    "utf8",
  );

  return <DynamicCodeBlock lang="tsx" code={source} />;
}
