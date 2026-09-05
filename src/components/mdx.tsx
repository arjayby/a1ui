import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

import { CinemaFilmDemo } from "@/components/cinema-film-demo";
import { SectionRailDemo, SpiralTextDemo } from "@/components/component-demos";
import { ComponentSource, Installation } from "@/components/component-docs";
import { ParticleMenuDemo } from "@/components/particle-menu-demo";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CinemaFilmDemo,
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
