import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { SectionRailPreview, SpiralTextPreview } from "@/components/component-demos";
import { components, componentCategories } from "@/lib/component-catalog";

export default function HomePage() {
  return (
    <div className="page-frame">
      <header>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">
          Original React components you can drop into a project, change, and make your own.
        </p>
      </header>

      {componentCategories.map((category) => (
        <section key={category} aria-label={category}>
          {category !== "Components" && <h2 className="mt-12 font-bold">{category}</h2>}
          <div className="catalog-grid">
            {components
              .filter((component) => component.category === category)
              .map((component) => (
                <article key={component.slug} className="catalog-card">
                  <div inert aria-hidden="true" className="catalog-preview">
                    {component.slug === "section-rail" ? (
                      <SectionRailPreview />
                    ) : component.slug === "spiral-text" ? (
                      <SpiralTextPreview />
                    ) : (
                      <div className="flex h-full flex-col justify-center gap-3 p-6">
                        <p className="font-bold">{component.title}</p>
                        <p className="text-muted-foreground">{component.description}</p>
                      </div>
                    )}
                  </div>
                  <Link href={`/components/${component.slug}`} className="catalog-card-link">
                    {component.title}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </article>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
