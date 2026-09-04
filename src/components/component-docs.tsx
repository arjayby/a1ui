import { readFile } from "node:fs/promises";
import path from "node:path";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";

import type { ComponentSlug } from "@/lib/component-catalog";
import { SectionRail } from "@/registry/section-rail";
import { SpiralText } from "@/registry/spiral-text";

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

const demoSections = [
  { id: "rail-demo-introduction", label: "Introduction" },
  { id: "rail-demo-decisions", label: "Decisions" },
  { id: "rail-demo-details", label: "Details" },
];

export function SectionRailDemo() {
  return (
    <div className="demo-frame section-rail-demo">
      <SectionRail
        sections={demoSections}
        ariaLabel="Demo sections"
        className="sticky top-20 h-fit self-start"
      />
      <div className="section-rail-demo-copy">
        <section id="rail-demo-introduction">
          <h3>Introduction</h3>
          <p>
            The rail marks the section nearest the reading line. Hover or focus a marker to reveal its label.
          </p>
        </section>
        <section id="rail-demo-decisions">
          <h3>Decisions</h3>
          <p>
            Sections above the active item remain visibly complete, so the rail doubles as a quiet progress
            indicator.
          </p>
        </section>
        <section id="rail-demo-details">
          <h3>Details</h3>
          <p>
            Placement belongs to the page. This demo makes the rail sticky; your layout can make it fixed or
            static.
          </p>
        </section>
      </div>
    </div>
  );
}

export function SpiralTextDemo() {
  return (
    <>
      <div className="demo-frame spiral-demo">
        <SpiralText text="THE CONTENT ARCHITECTURE · " />
      </div>
      <p className="demo-caption">
        Press and hold to tighten the spiral. Release to send a ripple from its center.
      </p>
    </>
  );
}
