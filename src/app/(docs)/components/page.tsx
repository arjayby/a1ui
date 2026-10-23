import type { Metadata } from "next";
import { GraphiteShowcase } from "@/components/graphite-showcase";

export const metadata: Metadata = {
  title: "Components",
  description:
    "21 reusable Vega components with Phosphor icons, a Graphite palette, and Kousa analytics examples.",
};

export default function ComponentsPage() {
  return <GraphiteShowcase />;
}
