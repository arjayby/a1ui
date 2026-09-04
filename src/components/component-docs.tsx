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
  { id: "rail-demo-overview", label: "Overview", description: "A quick read of the page." },
  { id: "rail-demo-goals", label: "Goals", description: "What the work needs to solve." },
  { id: "rail-demo-scope", label: "Scope", description: "The boundaries of the work." },
  { id: "rail-demo-approach", label: "Approach", description: "The chosen direction." },
  { id: "rail-demo-structure", label: "Structure", description: "How the pieces fit together." },
  {
    id: "rail-demo-components",
    label: "Components",
    description: "The parts used in the interface.",
  },
  { id: "rail-demo-states", label: "States", description: "Pending, active, and complete." },
  { id: "rail-demo-motion", label: "Motion", description: "How the rail responds." },
  { id: "rail-demo-accessibility", label: "Accessibility", description: "Labels and keyboard focus." },
  {
    id: "rail-demo-performance",
    label: "Performance",
    description: "Keeping updates lightweight.",
  },
  {
    id: "rail-demo-delivery",
    label: "Delivery",
    description: "What ships with the component.",
  },
  { id: "rail-demo-summary", label: "Summary", description: "The final result." },
];

export function SectionRailDemo() {
  return (
    <div
      className="demo-frame section-rail-demo"
      role="region"
      aria-label="Scrollable Section Rail demo"
      tabIndex={0}
    >
      <SectionRail
        sections={demoSections}
        ariaLabel="Demo sections"
        gap={0}
        className="sticky top-1/2 h-fit -translate-y-1/2 self-start"
      />
      <div className="section-rail-demo-copy">
        {demoSections.map(({ id, label, description }) => (
          <section key={id} id={id}>
            <h3>{label}</h3>
            <p>{description}</p>
          </section>
        ))}
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
        Press and hold to draw the coils closer. Release to send a wave past its resting shape.
      </p>
    </>
  );
}
