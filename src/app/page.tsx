import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, CodeIcon, StackIcon } from "@phosphor-icons/react/ssr";

import { AgentInstall } from "@/components/agent-install";
import { ArcReelPreview } from "@/components/block-demos/arc-reel-demo";
import { AsciiTerrainPreview } from "@/components/block-demos/ascii-terrain-demo";
import { PeelStackPreview } from "@/components/block-demos/peel-stack-demo";
import { LoadingButtonPreview } from "@/components/component-demos/loading-button-demo";
import { SliderPreview } from "@/components/component-demos/slider-demo";
import { HydrationMarker } from "@/components/hydration-marker";
import { GitHubLink, ThemeButton } from "@/components/site-navigation";
import { blocks } from "@/lib/block-catalog";
import { components } from "@/lib/component-catalog";
import { SpiralText } from "@/registry/blocks/spiral-text";
import { CopyButton } from "@/registry/components/copy-button";
import { IconToggle } from "@/registry/components/icon-toggle";

import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "a1ui — Small details. Better interfaces." },
  description:
    "Explore animated React components and ready-made blocks. Try the interactions, find your starting point, and make the source your own.",
};

const featuredBlocks = [
  { slug: "arc-reel", Preview: ArcReelPreview, detail: "A new perspective on the carousel." },
  { slug: "peel-stack", Preview: PeelStackPreview, detail: "A little curiosity in every layer." },
  { slug: "ascii-terrain", Preview: AsciiTerrainPreview, detail: "A landscape made from characters." },
];

export default function HomePage() {
  return (
    <div className="landing">
      <HydrationMarker />
      <a className="landing-skip" href="#main">
        Skip to content
      </a>
      <header className="landing-header landing-width">
        <Link href="/" className="landing-brand" aria-label="a1ui home">
          <span className="brand-mark" aria-hidden="true" />
          a1ui
          <span className="landing-brand-divider" aria-hidden="true">
            /
          </span>
          <span className="landing-brand-caption">An interface collection</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/components">Components</Link>
          <Link href="/blocks">Blocks</Link>
          <Link href="/agents" className="landing-guide-link">
            Get started <ArrowUpRightIcon aria-hidden="true" />
          </Link>
        </nav>
        <div className="landing-header-actions">
          <GitHubLink />
          <ThemeButton />
        </div>
      </header>

      <main id="main" className="landing-width">
        <section className="landing-hero" aria-labelledby="hero-heading">
          <p className="landing-eyebrow">
            {components.length} components · {blocks.length} blocks
          </p>
          <h1 id="hero-heading">
            Small details.
            <br />
            <span>Better interfaces.</span>
          </h1>
          <p className="landing-hero-description">
            Thoughtful React components and expressive blocks. Find something you love. Make it your own.
          </p>
          <div className="landing-hero-actions">
            <Link href="/components" className="ui-button">
              Explore components <ArrowRightIcon aria-hidden="true" />
            </Link>
            <Link href="/blocks" className="ui-button" data-variant="outline">
              Browse blocks <StackIcon aria-hidden="true" />
            </Link>
          </div>
          <p className="landing-hero-note">React · Motion · Editable source</p>
        </section>

        <section aria-labelledby="components-heading" className="landing-components">
          <div className="landing-section-heading">
            <h2 id="components-heading">Little things, brought to life</h2>
            <span className="landing-section-note">
              Go on, try them <ArrowUpRightIcon aria-hidden="true" />
            </span>
          </div>
          <div className="landing-playground">
            <article className="landing-specimen landing-spiral">
              <div className="landing-specimen-stage">
                <SpiralText
                  text="SMALL DETAILS. BETTER INTERFACES. · "
                  rotating={false}
                  className="landing-spiral-art"
                />
              </div>
              <div className="landing-specimen-footer">
                <Link href="/blocks/spiral-text">
                  Spiral Text <ArrowUpRightIcon aria-hidden="true" />
                </Link>
                <span>Press & hold</span>
              </div>
            </article>
            <article className="landing-specimen">
              <div className="landing-specimen-stage">
                <CopyButton value="Small details. Better interfaces." label="Copy text" />
              </div>
              <div className="landing-specimen-footer">
                <Link href="/components/copy-button">
                  Copy Button <ArrowUpRightIcon aria-hidden="true" />
                </Link>
                <span>Click to copy</span>
              </div>
            </article>
            <article className="landing-specimen">
              <div className="landing-specimen-stage">
                <LoadingButtonPreview />
              </div>
              <div className="landing-specimen-footer">
                <Link href="/components/loading-button">
                  Loading Button <ArrowUpRightIcon aria-hidden="true" />
                </Link>
                <span>Give it a click</span>
              </div>
            </article>
            <article className="landing-specimen">
              <div className="landing-specimen-stage">
                <SliderPreview />
              </div>
              <div className="landing-specimen-footer">
                <Link href="/components/slider">
                  Slider <ArrowUpRightIcon aria-hidden="true" />
                </Link>
                <span>Find your rhythm</span>
              </div>
            </article>
            <article className="landing-specimen">
              <div className="landing-specimen-stage">
                <IconToggle label="Toggle preview icon" />
              </div>
              <div className="landing-specimen-footer">
                <Link href="/components/icon-toggle">
                  Icon Toggle <ArrowUpRightIcon aria-hidden="true" />
                </Link>
                <span>A change of mood</span>
              </div>
            </article>
          </div>
          <div className="landing-section-footer">
            <p>Small interactions. A more considered experience.</p>
            <Link href="/components">
              All {components.length} components <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="blocks-heading" className="landing-blocks">
          <div className="landing-blocks-heading">
            <div>
              <p className="landing-eyebrow">Ready-made blocks</p>
              <h2 id="blocks-heading">
                Copy the code.
                <br />
                <span>Make it fit your project.</span>
              </h2>
            </div>
            <p>
              Ready-made compositions for the parts
              <br className="hidden sm:block" /> you want people to remember.
            </p>
          </div>
          <div className="landing-block-grid">
            {featuredBlocks.map(({ slug, Preview, detail }) => {
              const block = blocks.find((item) => item.slug === slug);
              return (
                <article key={slug} className="landing-block-card">
                  <div className="catalog-preview landing-block-preview" inert aria-hidden="true">
                    <Preview />
                  </div>
                  <Link href={`/blocks/${slug}`} className="landing-block-link">
                    <h3>{block?.title}</h3>
                    <ArrowUpRightIcon aria-hidden="true" />
                    <span className="landing-block-detail">{detail}</span>
                  </Link>
                </article>
              );
            })}
          </div>
          <div className="landing-section-footer">
            <p>A few favorites from the collection.</p>
            <Link href="/blocks">
              All {blocks.length} blocks <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="landing-start" aria-labelledby="start-heading">
          <div>
            <p className="landing-eyebrow">
              <CodeIcon aria-hidden="true" /> From preview to your project
            </p>
            <h2 id="start-heading">See it. Try it. Ship it.</h2>
            <p>
              Explore the demos, take the source, and adapt it to your project.
              <br className="hidden sm:block" /> Or let your coding agent handle the installation.
            </p>
            <AgentInstall />
          </div>
          <Link href="/agents" className="ui-button" data-variant="outline">
            Get started <ArrowRightIcon aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="landing-footer landing-width">
        <Link href="/" className="font-heading text-lg">
          <span className="brand-mark" aria-hidden="true" />
          a1ui
        </Link>
        <p>A collection worth making your own.</p>
        <a href="https://github.com/arjayby/a1ui" target="_blank" rel="noopener noreferrer">
          View source <ArrowUpRightIcon aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}
