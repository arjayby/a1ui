import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { SectionRailPreview, SpiralTextPreview } from "@/components/component-demos";
import { ParticleMenuPreview } from "@/components/particle-menu-demo";
import { components } from "@/lib/component-catalog";

const previews = {
  "section-rail": SectionRailPreview,
  "spiral-text": SpiralTextPreview,
  "particle-menu": ParticleMenuPreview,
};

export default function HomePage() {
  return (
    <div className="page-frame">
      <header>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">
          Original React components you can drop into a project, change, and make your own.
        </p>
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
