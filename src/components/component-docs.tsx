import { readFile } from "node:fs/promises";
import path from "node:path";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

import type { ComponentSlug } from "@/lib/component-catalog";

const packageCommands = [
  { name: "npm", command: (url: string) => `npx shadcn@latest add ${url}` },
  { name: "pnpm", command: (url: string) => `pnpm dlx shadcn@latest add ${url}` },
  { name: "yarn", command: (url: string) => `yarn dlx shadcn@latest add ${url}` },
  { name: "bun", command: (url: string) => `bunx --bun shadcn@latest add ${url}` },
] as const;

export function Installation({ name }: { name: ComponentSlug }) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
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

export async function ComponentSource({ name }: { name: ComponentSlug }) {
  const source = await readFile(path.join(process.cwd(), "src", "registry", `${name}.tsx`), "utf8");

  return <DynamicCodeBlock lang="tsx" code={source} />;
}

export async function DemoSource({ name }: { name: ComponentSlug }) {
  const source = await readFile(
    path.join(process.cwd(), "src", "components", "demos", `${name}-demo.tsx`),
    "utf8",
  );
  return <DynamicCodeBlock lang="tsx" code={source} />;
}
