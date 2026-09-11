import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { AgentInstall } from "@/components/agent-install";

import { ArcReelPreview } from "@/components/arc-reel-demo";
import { AsciiTerrainPreview } from "@/components/ascii-terrain-demo";
import { CryptoWalletPreview } from "@/components/crypto-wallet-demo";
import { ConfirmationButtonPreview } from "@/components/confirmation-button-demo";
import { SectionRailPreview, SpiralTextPreview } from "@/components/component-demos";
import { ParticleMenuPreview } from "@/components/particle-menu-demo";
import { MultichainSwapPreview } from "@/components/multichain-swap-demo";
import { TextScramblePreview } from "@/components/text-scramble-demo";
import { TextBannerPreview } from "@/components/text-banner-demo";
import { SelectMenuPreview } from "@/components/select-menu-demo";
import { ShapeFlowPreview } from "@/components/shape-flow-demo";
import { Badge } from "@/components/ui/badge";
import { components } from "@/lib/component-catalog";

const previews: Record<string, ComponentType> = {
  "ascii-terrain": AsciiTerrainPreview,
  "confirmation-button": ConfirmationButtonPreview,
  "crypto-wallet": CryptoWalletPreview,
  "section-rail": SectionRailPreview,
  "spiral-text": SpiralTextPreview,
  "particle-menu": ParticleMenuPreview,
  "arc-reel": ArcReelPreview,
  "multichain-swap": MultichainSwapPreview,
  "text-scramble": TextScramblePreview,
  "text-banner": TextBannerPreview,
  "select-menu": SelectMenuPreview,
  "shape-flow": ShapeFlowPreview,
};

export default function HomePage() {
  return (
    <div className="page-frame">
      <header>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">A collection of React components inspired by designs found online.</p>
        <AgentInstall />
      </header>

      <div className="catalog-grid">
        {components.map((component) => {
          const Preview = previews[component.slug];
          return (
            <article key={component.slug} className="catalog-card">
              <div inert aria-hidden="true" className="catalog-preview">
                <Preview />
              </div>
              <Link
                href={`/components/${component.slug}`}
                aria-description={component.isNew ? "New component shipped" : undefined}
                className="catalog-card-link gap-2"
              >
                {component.title}
                {component.isNew ? (
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
