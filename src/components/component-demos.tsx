import { SectionRail } from "@/registry/section-rail";
import { SpiralText } from "@/registry/spiral-text";

export { SpiralTextDemo } from "./spiral-text-demo";

const demoSections = [
  { id: "rail-demo-overview", label: "Overview", description: "A quick read of the page." },
  { id: "rail-demo-goals", label: "Goals", description: "What the work needs to solve." },
  { id: "rail-demo-scope", label: "Scope", description: "The boundaries of the work." },
  { id: "rail-demo-approach", label: "Approach", description: "The chosen direction." },
  { id: "rail-demo-structure", label: "Structure", description: "How the pieces fit together." },
  {
    id: "rail-demo-components",
    label: "Components",
    description: "The parts used in the interface.",
  },
  { id: "rail-demo-states", label: "States", description: "Pending, active, and complete." },
  { id: "rail-demo-motion", label: "Motion", description: "How the rail responds." },
  { id: "rail-demo-accessibility", label: "Accessibility", description: "Labels and keyboard focus." },
  {
    id: "rail-demo-performance",
    label: "Performance",
    description: "Keeping updates lightweight.",
  },
  {
    id: "rail-demo-delivery",
    label: "Delivery",
    description: "What ships with the component.",
  },
  { id: "rail-demo-summary", label: "Summary", description: "The final result." },
];

export function SectionRailPreview() {
  return (
    <div className="demo-frame section-rail-demo section-rail-preview">
      <SectionRail sections={demoSections} gap={0} className="w-5" />
    </div>
  );
}

export function SectionRailDemo() {
  return (
    <div
      className="demo-frame section-rail-demo"
      role="region"
      aria-label="Scrollable Section Rail demo"
      tabIndex={0}
    >
      <SectionRail
        sections={demoSections}
        ariaLabel="Demo sections"
        gap={0}
        className="sticky top-1/2 h-fit -translate-y-1/2 self-start"
      />
      <div className="section-rail-demo-copy">
        {demoSections.map(({ id, label, description }) => (
          <section key={id} id={id}>
            <h3>{label}</h3>
            <p>{description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export function SpiralTextPreview() {
  return (
    <div className="demo-frame spiral-demo">
      <SpiralText text="THE CONTENT ARCHITECTURE · " />
    </div>
  );
}
