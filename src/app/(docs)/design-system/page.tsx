import type { Metadata } from "next";

import { GraphiteShowcase } from "@/components/graphite-showcase";

export const metadata: Metadata = {
  title: "Design system",
  description: "Vega components with Phosphor icons and a Graphite palette.",
};

export default function DesignSystemPage() {
  return <GraphiteShowcase />;
}
