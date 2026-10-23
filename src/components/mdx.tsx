import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";

import { DocsTab, DocsTabs } from "@/components/docs-tabs";
import { Card } from "@/components/ui/card";

import { ArcReelDemo } from "@/components/block-demos/arc-reel-demo";
import { AsciiTerrainDemo } from "@/components/block-demos/ascii-terrain-demo";
import { AsciiMorphDemo } from "@/components/block-demos/ascii-morph-demo";
import { AsciiLensDemo } from "@/components/block-demos/ascii-lens-demo";
import { AgentInstall, AgentRegistryConfiguration } from "@/components/agent-install";
import { ConfirmationButtonDemo } from "@/components/block-demos/confirmation-button-demo";
import { CompareCurtainDemo } from "@/components/block-demos/compare-curtain-demo";
import { SectionRailDemo, SpiralTextDemo } from "@/components/block-demos";
import { BlockSource, Installation } from "@/components/block-docs";
import { ParticleMenuDemo } from "@/components/block-demos/particle-menu-demo";
import { TextScrambleDemo } from "@/components/block-demos/text-scramble-demo";
import { TextBannerDemo } from "@/components/block-demos/text-banner-demo";
import { ShapeFlowDemo } from "@/components/block-demos/shape-flow-demo";
import { IntegrationHubDemo } from "@/components/block-demos/integration-hub-demo";
import { PeelStackDemo } from "@/components/block-demos/peel-stack-demo";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AgentInstall,
    AgentRegistryConfiguration,
    ArcReelDemo,
    AsciiTerrainDemo,
    AsciiMorphDemo,
    AsciiLensDemo,
    BlockSource,
    ConfirmationButtonDemo,
    CompareCurtainDemo,
    Installation,
    IntegrationHubDemo,
    ParticleMenuDemo,
    PeelStackDemo,
    SectionRailDemo,
    ShapeFlowDemo,
    SpiralTextDemo,
    TextScrambleDemo,
    TextBannerDemo,
    Tab: DocsTab,
    Tabs: DocsTabs,
    table: (props: ComponentProps<"table">) => (
      <Card className="docs-table" role="region" aria-label="Reference table" tabIndex={0}>
        <table {...props} />
      </Card>
    ),
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
