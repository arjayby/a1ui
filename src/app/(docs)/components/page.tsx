import type { Metadata } from "next";
import { GraphiteShowcase } from "@/components/graphite-showcase";

export const metadata: Metadata = {
  title: "Components",
  description: "Graphite tokens, typography, and 21 reusable components with Kousa analytics examples.",
};

export default function ComponentsPage() {
  return <GraphiteShowcase />;
}
