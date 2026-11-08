import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CaretRightIcon,
  CursorClickIcon,
  SparkleIcon,
  StackIcon,
} from "@phosphor-icons/react/ssr";

import { AgentInstall } from "@/components/agent-install";
import { ArcReelPreview } from "@/components/block-demos/arc-reel-demo";
import { AsciiMorphPreview } from "@/components/block-demos/ascii-morph-demo";
import { ParticleMenuPreview } from "@/components/block-demos/particle-menu-demo";
import { ShapeFlowPreview } from "@/components/block-demos/shape-flow-demo";
import { TextScramblePreview } from "@/components/block-demos/text-scramble-demo";
import { LoadingButtonPreview } from "@/components/component-demos/loading-button-demo";
import { SliderPreview } from "@/components/component-demos/slider-demo";
import { SwitchPreview } from "@/components/component-demos/switch-demo";
import { HydrationMarker } from "@/components/hydration-marker";
import { LandingTerrain } from "@/components/landing-terrain";
import { GitHubLink, ThemeButton } from "@/components/site-navigation";
import { blocks } from "@/lib/block-catalog";
import { componentCategories, components } from "@/lib/component-catalog";
import { absoluteUrl, JsonLd, repositoryUrl, siteDescription, siteName } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url.mjs";
import { CopyButton } from "@/registry/components/copy-button";
import { IconToggle } from "@/registry/components/icon-toggle";

import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "a1ui — Animated React components and blocks" },
  description:
    "Animated React components and blocks. Copy and paste them, or install them with your agent. From restrained micro-interactions to flashy animation.",
  alternates: { canonical: "/" },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: siteName,
    description: siteDescription,
    url: absoluteUrl("/"),
    codeRepository: repositoryUrl,
    programmingLanguage: ["TypeScript", "React"],
    license: "https://opensource.org/licenses/MIT",
    author: { "@type": "Person", name: "Arjay Bayona", url: "https://github.com/arjayby" },
  },
];

const playground: { slug: string; title: string; hint: string; Preview: ComponentType }[] = [
  {
    slug: "copy-button",
    title: "Copy Button",
    hint: "Click to copy",
    Preview: () => <CopyButton value="Animated React components and blocks." label="Copy text" />,
  },
  { slug: "loading-button", title: "Loading Button", hint: "Give it a click", Preview: LoadingButtonPreview },
  {
    slug: "icon-toggle",
    title: "Icon Toggle",
    hint: "A change of mood",
    Preview: () => <IconToggle label="Toggle preview icon" />,
  },
  { slug: "slider", title: "Slider", hint: "Find your rhythm", Preview: SliderPreview },
  { slug: "switch", title: "Switch", hint: "Flip it", Preview: SwitchPreview },
];

const featuredBlocks = [
  { slug: "arc-reel", Preview: ArcReelPreview, detail: "A new perspective on the carousel.", wide: true },
  { slug: "shape-flow", Preview: ShapeFlowPreview, detail: "Text that makes room for a duck." },
  { slug: "ascii-morph", Preview: AsciiMorphPreview, detail: "Characters that gather into new shapes." },
  { slug: "text-scramble", Preview: TextScramblePreview, detail: "Letters that settle into place." },
  { slug: "particle-menu", Preview: ParticleMenuPreview, detail: "A menu that bursts into view." },
];

export default function HomePage() {
  const installCommand = `pnpm dlx shadcn@latest add ${getSiteUrl()}/r/copy-button.json`;

  return (
    <div className="landing">
      <JsonLd data={structuredData} />
      <HydrationMarker />
      <a className="landing-skip" href="#main">
        Skip to content
      </a>
      <header className="landing-header">
        <div className="landing-header-inner landing-width">
          <Link href="/" className="landing-brand" aria-label="a1ui home">
            <span className="brand-mark" aria-hidden="true" />
            a1ui
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/components">Components</Link>
            <Link href="/blocks">Blocks</Link>
            <Link href="/agents" className="landing-guide-link">
              Get started
            </Link>
          </nav>
          <div className="landing-header-actions">
            <GitHubLink />
            <ThemeButton />
          </div>
        </div>
      </header>

      <main id="main">
        <section className="landing-hero landing-width" aria-labelledby="hero-heading">
          <Link href="/agents" className="landing-pill">
            <span className="landing-pill-tag">New</span>
            Works with your coding agent
            <ArrowRightIcon aria-hidden="true" />
          </Link>
          <h1 id="hero-heading">
            Animated{" "}
            <span className="landing-nowrap">
              <span className="landing-glyph landing-glyph-press" aria-hidden="true">
                <CursorClickIcon weight="fill" />
              </span>{" "}
              React
            </span>
            <br />
            <span className="landing-hero-muted">
              components and{" "}
              <span className="landing-nowrap">
                <span className="landing-glyph landing-glyph-spin" aria-hidden="true">
                  <SparkleIcon weight="fill" />
                </span>{" "}
                blocks.
              </span>
            </span>
          </h1>
          <p className="landing-hero-description">
            Copy and paste them, or install them with your agent. From restrained micro-interactions to flashy
            animation.
          </p>
          <div className="landing-hero-actions">
            <Link href="/components" className="ui-button landing-cta">
              Explore components
            </Link>
            <Link href="/blocks" className="ui-button landing-cta" data-variant="secondary">
              Browse blocks
            </Link>
          </div>
          <p className="landing-hero-note">Built with Motion. Distributed through the shadcn registry.</p>
        </section>

        <section className="landing-stage" aria-labelledby="playground-heading">
          <LandingTerrain />
          <div className="landing-window landing-width">
            <div className="landing-window-bar">
              <h2 id="playground-heading">Playground</h2>
              <span>Every tile is live. Try them.</span>
            </div>
            <div className="landing-window-grid">
              {playground.map(({ slug, title, hint, Preview }) => (
                <article key={slug} className="landing-specimen">
                  <div className="landing-specimen-stage">
                    <Preview />
                  </div>
                  <div className="landing-specimen-footer">
                    <Link href={`/components/${slug}`}>
                      {title} <ArrowUpRightIcon aria-hidden="true" />
                    </Link>
                    <span>{hint}</span>
                  </div>
                </article>
              ))}
              <Link href="/components" className="landing-specimen landing-specimen-more">
                <span className="landing-specimen-count">+{components.length - playground.length}</span>
                <span>
                  More components <ArrowRightIcon aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-statement landing-width" aria-labelledby="statement-heading">
          <h2 id="statement-heading" className="landing-statement-text">
            Small moments, made with care.{" "}
            <span>
              Every component is tuned with spring physics, respects reduced motion, and ships as source you
              own. Paste it in, or hand it to your agent.
            </span>
          </h2>
          <dl className="landing-facts">
            <div>
              <dt>Components</dt>
              <dd>{components.length}</dd>
            </div>
            <div>
              <dt>Blocks</dt>
              <dd>{blocks.length}</dd>
            </div>
            <div>
              <dt>Licence</dt>
              <dd>MIT</dd>
            </div>
            <div>
              <dt>Installs with</dt>
              <dd>shadcn</dd>
            </div>
          </dl>
        </section>

        <section className="landing-index landing-width" aria-labelledby="index-heading">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Components</p>
            <h2 id="index-heading">
              The small moments, <span>sorted.</span>
            </h2>
          </div>
          <div className="landing-index-grid">
            {componentCategories.map(({ title, components: items }, index) => (
              <div key={title} className="landing-index-cell">
                <div className="landing-index-meta">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span>{items.length}</span>
                </div>
                <h3>{title}</h3>
                <ul>
                  {items.map((item) => (
                    <li key={item.slug}>
                      <Link href={`/components/${item.slug}`}>{item.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Link href="/components" className="landing-index-cell landing-index-all">
              <span className="landing-index-meta">
                <span>All</span>
              </span>
              <span className="landing-index-all-label">
                Browse all {components.length} components
                <ArrowRightIcon aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>

        <section className="landing-blocks landing-width" aria-labelledby="blocks-heading">
          <div className="landing-section-heading landing-section-heading-split">
            <div>
              <p className="landing-eyebrow">Blocks</p>
              <h2 id="blocks-heading">
                Go bigger. <span>Ready to drop in.</span>
              </h2>
            </div>
            <Link href="/blocks" className="landing-chevron-link">
              All {blocks.length} blocks <CaretRightIcon aria-hidden="true" weight="bold" />
            </Link>
          </div>
          <div className="landing-block-grid">
            {featuredBlocks.map(({ slug, Preview, detail, wide }) => {
              const block = blocks.find((item) => item.slug === slug);
              return (
                <article key={slug} className="landing-block-card" data-wide={wide || undefined}>
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
        </section>

        <section className="landing-start landing-width" aria-labelledby="start-heading">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Get started</p>
            <h2 id="start-heading">
              Copy and paste. <span>Or ask your agent.</span>
            </h2>
          </div>
          <ol className="landing-steps">
            <li>
              <span className="landing-step-number">01</span>
              <h3>Pick one</h3>
              <p>Open any component or block and play with the live demo.</p>
              <Link href="/components" className="landing-chevron-link">
                Browse the catalog <CaretRightIcon aria-hidden="true" weight="bold" />
              </Link>
            </li>
            <li>
              <span className="landing-step-number">02</span>
              <h3>Install it</h3>
              <p>One command adds the source to your project. No package to keep up to date.</p>
              <div className="landing-command">
                <code>{installCommand}</code>
                <CopyButton value={installCommand} label="Copy" />
              </div>
            </li>
            <li>
              <span className="landing-step-number">03</span>
              <h3>Or hand it off</h3>
              <p>Copy a prompt for your coding agent. It reads the docs, installs, and checks the result.</p>
              <AgentInstall />
            </li>
          </ol>
        </section>

        <section className="landing-closing landing-width" aria-labelledby="closing-heading">
          <span className="landing-glyph landing-closing-glyph" aria-hidden="true">
            <StackIcon weight="fill" />
          </span>
          <h2 id="closing-heading">Start with one component.</h2>
          <p>Then make it yours. It is your code now.</p>
          <Link href="/agents" className="ui-button landing-cta">
            Get started
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner landing-width">
          <div className="landing-footer-about">
            <Link href="/" className="landing-brand">
              <span className="brand-mark" aria-hidden="true" />
              a1ui
            </Link>
            <p>
              Animated React components and blocks. Inspired by designs found online, rebuilt as code you can
              own.
            </p>
          </div>
          <nav aria-label="Footer" className="landing-footer-links">
            <div>
              <h2>Library</h2>
              <Link href="/components">Components</Link>
              <Link href="/blocks">Blocks</Link>
            </div>
            <div>
              <h2>Resources</h2>
              <Link href="/agents">Get started</Link>
              <a href="/llms.txt">llms.txt</a>
              <a href="https://github.com/arjayby/a1ui" target="_blank" rel="noopener noreferrer">
                GitHub <ArrowUpRightIcon aria-hidden="true" />
              </a>
            </div>
          </nav>
        </div>
        <p className="landing-wordmark" aria-hidden="true">
          a1ui
        </p>
      </footer>
    </div>
  );
}
