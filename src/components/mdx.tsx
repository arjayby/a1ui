import { AttachmentsDemo } from "@/components/demos/attachments-demo";
import { ConversationHistoryDemo } from "@/components/demos/conversation-history-demo";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

import { SectionRailDemo, SpiralTextDemo } from "@/components/component-demos";
import { ComponentSource, DemoSource, Installation } from "@/components/component-docs";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ConversationHistoryDemo,
    DemoSource,
    AttachmentsDemo,
    ComponentSource,
    Installation,
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
