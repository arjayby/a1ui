import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { AgentInstall } from "@/components/agent-install";

import { ArcReelPreview } from "@/components/arc-reel-demo";
import { CryptoWalletPreview } from "@/components/crypto-wallet-demo";
import { SectionRailPreview, SpiralTextPreview } from "@/components/component-demos";
import { ParticleMenuPreview } from "@/components/particle-menu-demo";
import { MultichainSwapPreview } from "@/components/multichain-swap-demo";
import { TextScramblePreview } from "@/components/text-scramble-demo";
import { SelectMenuPreview } from "@/components/select-menu-demo";
import { ShapeFlowPreview } from "@/components/shape-flow-demo";
import { components } from "@/lib/component-catalog";

const previews: Record<string, ComponentType> = {
  "crypto-wallet": CryptoWalletPreview,
  "section-rail": SectionRailPreview,
  "spiral-text": SpiralTextPreview,
  "particle-menu": ParticleMenuPreview,
  "arc-reel": ArcReelPreview,
  "multichain-swap": MultichainSwapPreview,
  "text-scramble": TextScramblePreview,
  "select-menu": SelectMenuPreview,
  "shape-flow": ShapeFlowPreview,
};

export default function HomePage() {
  return (
    <div className="page-frame">
      <header>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">
          Original React components you can drop into a project, change, and make your own.
        </p>
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
              <Link href={`/components/${component.slug}`} className="catalog-card-link">
                {component.title}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
