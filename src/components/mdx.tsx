import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

import { ArcReelDemo } from "@/components/arc-reel-demo";
import { AgentInstall, AgentRegistryConfiguration } from "@/components/agent-install";
import { CryptoWalletDemo } from "@/components/crypto-wallet-demo";
import { SectionRailDemo, SpiralTextDemo } from "@/components/component-demos";
import { ComponentSource, Installation } from "@/components/component-docs";
import { ParticleMenuDemo } from "@/components/particle-menu-demo";
import { MultichainSwapDemo } from "@/components/multichain-swap-demo";
import { TextScrambleDemo } from "@/components/text-scramble-demo";
import { SelectMenuDemo } from "@/components/select-menu-demo";
import { ShapeFlowDemo } from "@/components/shape-flow-demo";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    AgentInstall,
    AgentRegistryConfiguration,
    ArcReelDemo,
    ComponentSource,
    CryptoWalletDemo,
    Installation,
    MultichainSwapDemo,
    ParticleMenuDemo,
    SectionRailDemo,
    SelectMenuDemo,
    ShapeFlowDemo,
    SpiralTextDemo,
    TextScrambleDemo,
    Tab,
    Tabs,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
