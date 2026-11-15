import type { Metadata } from "next";

import { HydrationMarker } from "@/components/hydration-marker";
import { LandingMenu } from "@/components/landing-menu";
import { ThemeSwitch } from "@/components/site-navigation";
import { blocks } from "@/lib/block-catalog";
import { components } from "@/lib/component-catalog";
import {
  absoluteUrl,
  author,
  JsonLd,
  pageMetadata,
  repositoryUrl,
  siteDescription,
  siteName,
  siteTitle,
} from "@/lib/seo";
import { AsciiMorph } from "@/registry/blocks/ascii-morph";

import "./landing.css";

export const metadata: Metadata = pageMetadata({
  title: { absolute: siteTitle },
  description: siteDescription,
  path: "/",
});

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
    author: { "@type": "Person", ...author },
  },
];

export default function HomePage() {
  return (
    <main className="landing">
      <JsonLd data={structuredData} />
      <HydrationMarker />

      <article className="landing-card">
        <div className="landing-card-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="landing-card-art">
          <AsciiMorph defaultShape="a1" shapes={["a1", "logo"]} ariaLabel="Morph the a1ui monogram" />
        </div>
        <h1>{siteTitle}</h1>
        <p>Copy and paste them, or install them with your agent.</p>
        <footer className="landing-card-footer">
          <span>
            {components.length} components · {blocks.length} blocks
          </span>
          <ThemeSwitch />
        </footer>
      </article>

      <LandingMenu githubUrl={repositoryUrl} />
    </main>
  );
}
