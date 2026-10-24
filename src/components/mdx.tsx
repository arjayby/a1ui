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
import { BlockSource, ComponentSource, Installation } from "@/components/block-docs";
import { MenuDemo } from "@/components/component-demos/menu-demo";
import { DropdownMenuDemo } from "@/components/component-demos/dropdown-menu-demo";
import { ConfirmButtonDemo } from "@/components/component-demos/confirm-button-demo";
import { CopyButtonDemo } from "@/components/component-demos/copy-button-demo";
import { LoadingButtonDemo } from "@/components/component-demos/loading-button-demo";
import { IconToggleDemo } from "@/components/component-demos/icon-toggle-demo";
import { ParticleMenuDemo } from "@/components/block-demos/particle-menu-demo";
import { TextScrambleDemo } from "@/components/block-demos/text-scramble-demo";
import { TextBannerDemo } from "@/components/block-demos/text-banner-demo";
import { ShapeFlowDemo } from "@/components/block-demos/shape-flow-demo";
import { IntegrationHubDemo } from "@/components/block-demos/integration-hub-demo";
import { PeelStackDemo } from "@/components/block-demos/peel-stack-demo";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AgentOnly: () => null,
    AgentInstall,
    AgentRegistryConfiguration,
    ArcReelDemo,
    AsciiTerrainDemo,
    AsciiMorphDemo,
    AsciiLensDemo,
    BlockSource,
    ComponentSource,
    MenuDemo,
    DropdownMenuDemo,
    ConfirmButtonDemo,
    CopyButtonDemo,
    LoadingButtonDemo,
    IconToggleDemo,
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
