import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

import { ArcReelDemo } from "@/components/arc-reel-demo";
import { SectionRailDemo, SpiralTextDemo } from "@/components/component-demos";
import { ComponentSource, Installation } from "@/components/component-docs";
import { ParticleMenuDemo } from "@/components/particle-menu-demo";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ArcReelDemo,
    ComponentSource,
    Installation,
    ParticleMenuDemo,
    SectionRailDemo,
    SpiralTextDemo,
    Tab,
    Tabs,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
