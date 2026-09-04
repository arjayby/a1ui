import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { components, type ComponentSlug } from "@/lib/component-catalog";
import { SectionRail } from "@/registry/section-rail";
import { SpiralText } from "@/registry/spiral-text";

function ComponentPreview({ slug }: { slug: ComponentSlug }) {
  if (slug === "section-rail") {
    return (
      <div inert aria-hidden="true" className="pointer-events-none scale-125">
        <SectionRail
          sections={[
            { id: "preview-one", label: "The workflow" },
            { id: "preview-two", label: "The details" },
            { id: "preview-three", label: "The result" },
            { id: "preview-four", label: "The notes" },
          ]}
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="pointer-events-none w-40">
      <SpiralText text="SMALL THINGS · " density={0.8} />
    </div>
  );
}

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
        {components.map((component) => (
          <article key={component.slug} className="catalog-card">
            <div className="catalog-preview">
              <ComponentPreview slug={component.slug} />
            </div>
            <Link href={`/components/${component.slug}`} className="catalog-card-link">
              {component.title}
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
