import { readFile } from "node:fs/promises";
import path from "node:path";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

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
    <Tabs
      items={packageCommands.map(({ name: packageName }) => packageName)}
      defaultIndex={1}
      groupId="package-manager"
      persist
    >
      {packageCommands.map(({ name: packageName, command }) => (
        <Tab key={packageName} value={packageName}>
          <DynamicCodeBlock lang="bash" code={command(registryUrl)} />
        </Tab>
      ))}
    </Tabs>
  );
}

export async function BlockSource({ name }: { name: BlockSlug }) {
  const source = await readFile(path.join(process.cwd(), "src", "registry", "blocks", `${name}.tsx`), "utf8");

  return <DynamicCodeBlock lang="tsx" code={source} />;
}
