import type { Metadata } from "next";

import { HydrationMarker } from "@/components/hydration-marker";
import { ThemeButton } from "@/components/site-navigation";
import { blocks } from "@/lib/block-catalog";
import { components } from "@/lib/component-catalog";
import { absoluteUrl, JsonLd, repositoryUrl, siteDescription, siteName } from "@/lib/seo";
import { AsciiMorph } from "@/registry/blocks/ascii-morph";
import { ParticleMenu, type ParticleMenuItem } from "@/registry/blocks/particle-menu";

import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "a1ui — Animated React components and blocks" },
  description: "Animated React components and blocks. Copy and paste them, or install them with your agent.",
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

const menu: ParticleMenuItem[] = [
  { id: "components", label: "Components", shape: "ring", href: "/components" },
  { id: "blocks", label: "Blocks", shape: "lattice", href: "/blocks" },
  { id: "agents", label: "For agents", shape: "halo", href: "/agents" },
  { id: "github", label: "GitHub", shape: "spiral", href: repositoryUrl },
];

export default function HomePage() {
  return (
    <main className="landing">
      <JsonLd data={structuredData} />
      <HydrationMarker />

      <article className="landing-card">
        <div className="landing-card-art">
          <AsciiMorph defaultShape="a1" ariaLabel="Morph the a1ui monogram" />
        </div>
        <h1>a1ui — Animated React components and blocks</h1>
        <p>Copy and paste them, or install them with your agent.</p>
        <footer className="landing-card-footer">
          <span>
            {components.length} components · {blocks.length} blocks
          </span>
          <ThemeButton />
        </footer>
      </article>

      <ParticleMenu items={menu} ariaLabel="Main navigation" className="landing-menu" />
    </main>
  );
}
