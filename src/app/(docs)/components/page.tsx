import type { Metadata } from "next";
import { GraphiteShowcase } from "@/components/graphite-showcase";

export const metadata: Metadata = {
  title: "Components",
  description:
    "Animated Motion components and 21 reusable Vega components with Phosphor icons and a Graphite palette.",
};

export default function ComponentsPage() {
  return <GraphiteShowcase />;
}
