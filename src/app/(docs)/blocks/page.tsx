import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { AgentInstall } from "@/components/agent-install";

import { ArcReelPreview } from "@/components/block-demos/arc-reel-demo";
import { AsciiTerrainPreview } from "@/components/block-demos/ascii-terrain-demo";
import { AsciiMorphPreview } from "@/components/block-demos/ascii-morph-demo";
import { AsciiLensPreview } from "@/components/block-demos/ascii-lens-demo";
import { ConfirmationButtonPreview } from "@/components/block-demos/confirmation-button-demo";
import { CompareCurtainPreview } from "@/components/block-demos/compare-curtain-demo";
import { SectionRailPreview, SpiralTextPreview } from "@/components/block-demos";
import { ParticleMenuPreview } from "@/components/block-demos/particle-menu-demo";
import { TextScramblePreview } from "@/components/block-demos/text-scramble-demo";
import { TextBannerPreview } from "@/components/block-demos/text-banner-demo";
import { ShapeFlowPreview } from "@/components/block-demos/shape-flow-demo";
import { IntegrationHubPreview } from "@/components/block-demos/integration-hub-demo";
import { PeelStackPreview } from "@/components/block-demos/peel-stack-demo";
import { Badge } from "@/components/ui/badge";
import { blocks } from "@/lib/block-catalog";

export const metadata: Metadata = {
  title: "Blocks",
  description: "Ready-made React compositions inspired by designs found online.",
};

const previews: Record<string, ComponentType> = {
  "compare-curtain": CompareCurtainPreview,
  "peel-stack": PeelStackPreview,
  "ascii-morph": AsciiMorphPreview,
  "ascii-lens": AsciiLensPreview,
  "integration-hub": IntegrationHubPreview,
  "ascii-terrain": AsciiTerrainPreview,
  "confirmation-button": ConfirmationButtonPreview,
  "section-rail": SectionRailPreview,
  "spiral-text": SpiralTextPreview,
  "particle-menu": ParticleMenuPreview,
  "arc-reel": ArcReelPreview,
  "text-scramble": TextScramblePreview,
  "text-banner": TextBannerPreview,
  "shape-flow": ShapeFlowPreview,
};

export default function BlocksPage() {
  return (
    <div className="page-frame">
      <header>
        <h1 className="page-heading">Blocks</h1>
        <p className="page-description">Ready-made React compositions inspired by designs found online.</p>
        <AgentInstall />
      </header>

      <div className="catalog-grid">
        {blocks.map((block) => {
          const Preview = previews[block.slug];
          return (
            <article key={block.slug} className="catalog-card">
              <div inert aria-hidden="true" className="catalog-preview">
                <Preview />
              </div>
              <Link
                href={`/blocks/${block.slug}`}
                aria-description={block.isNew ? "New block shipped" : undefined}
                className="catalog-card-link gap-2"
              >
                {block.title}
                {block.isNew ? (
                  <Badge variant="dot" className="absolute top-3 right-3" aria-hidden="true" />
                ) : null}
                <ArrowUpRight aria-hidden="true" className="shrink-0" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
