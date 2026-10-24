import type { Metadata } from "next";
import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { MenuPreview } from "@/components/component-demos/menu-demo";
import { ConfirmButtonPreview } from "@/components/component-demos/confirm-button-demo";
import { CopyButton } from "@/registry/components/copy-button";
import { LoadingButtonPreview } from "@/components/component-demos/loading-button-demo";
import { components } from "@/lib/component-catalog";

export const metadata: Metadata = {
  title: "Components",
  description: "Animated components built with Motion, with live previews and editable source.",
};

const previews: Record<string, ReactNode> = {
  "menu": <MenuPreview />,
  "confirm-button": <ConfirmButtonPreview />,
  "copy-button": <CopyButton value="hello@a1ui.dev" />,
  "loading-button": <LoadingButtonPreview />,
};

export default function ComponentsPage() {
  return (
    <div className="page-frame">
      <header>
        <p className="graphite-eyebrow">a1ui / Component library</p>
        <h1 className="page-heading">Components</h1>
        <p className="page-description">
          Animated components built with Motion, with live previews and editable source.
        </p>
      </header>
      <div className="catalog-grid">
        {components.map((component) => (
          <Card key={component.slug} role="article" className="catalog-card">
            <div inert aria-hidden="true" className="catalog-preview flex items-center justify-center">
              {previews[component.slug]}
            </div>
            <CardContent className="catalog-card-content">
              <h2 className="ui-card-title">
                <Link href={`/components/${component.slug}`} className="catalog-card-link">
                  {component.title}
                  <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0" />
                </Link>
              </h2>
              <CardDescription>{component.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
