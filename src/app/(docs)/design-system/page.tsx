import type { Metadata } from "next";

import { GraphiteShowcase } from "@/components/graphite-showcase";

export const metadata: Metadata = {
  title: "Design system",
  description: "Vega components with Phosphor icons and a Graphite palette.",
  // An internal reference page that is not linked from the site.
  robots: { index: false },
};

export default function DesignSystemPage() {
  return <GraphiteShowcase />;
}
