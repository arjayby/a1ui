import type { Metadata } from "next";
import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { CopyButton } from "@/registry/components/copy-button";

export const metadata: Metadata = {
  title: "Components",
  description: "Animated components built with Motion, with live previews and editable source.",
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
        <Card role="article" className="catalog-card">
          <div inert aria-hidden="true" className="catalog-preview flex items-center justify-center">
            <CopyButton value="hello@a1ui.dev" />
          </div>
          <CardContent className="catalog-card-content">
            <h2 className="ui-card-title">
              <Link href="/components/copy-button" className="catalog-card-link">
                Copy Button
                <ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            </h2>
            <CardDescription>
              A copy icon and label that animate into a checkmark and success message.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
