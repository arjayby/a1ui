import { SectionRail } from "@/registry/blocks/section-rail";
import { SpiralText } from "@/registry/blocks/spiral-text";

export { SpiralTextDemo } from "./spiral-text-demo";

const demoSections = [
  {
    id: "rail-demo-overview",
    label: "Overview",
    description:
      "A long document needs a way to show readers where they are. This project uses a compact rail beside the content, with one marker for each section. The active marker follows your reading position as you scroll.",
    context:
      "Explore the document at your own pace, or choose a marker to jump ahead. Hover over a marker to see its section name. The rail stays in place while this panel scrolls, so you can return to an earlier section without losing your bearings.",
  },
  {
    id: "rail-demo-goals",
    label: "Goals",
    description:
      "Help readers understand the document's structure without adding a second column of headings. The navigation should stay quiet during reading and reveal more detail when someone moves a pointer over it or focuses a marker with the keyboard.",
    context:
      "Success means readers can tell which sections they have passed, identify the section in view, and move directly to another topic. Every marker needs a useful label, even when that label is not visible beside the content.",
  },
  {
    id: "rail-demo-scope",
    label: "Scope",
    description:
      "The rail is for moving within a single document. Each marker points to a heading or section with a matching ID. It works alongside the content rather than replacing the site's main navigation or the browser's Back button.",
    context:
      "This example keeps the document inside its own scroll panel. Choosing a marker scrolls this panel while the surrounding documentation stays in place. The page URL still records the selected section, and each marker remains an ordinary link that can be copied.",
  },
  {
    id: "rail-demo-approach",
    label: "Approach",
    description:
      "Start with the document outline. Give each section a short, distinct label and a stable ID, then arrange the markers in reading order. The same content order should make sense with the rail hidden or with styles turned off.",
    context:
      "Keep the rail close enough to the text to feel connected, with room for labels to appear on hover. Its position should stay steady while the content moves. This lets readers scan the document without chasing a moving navigation target.",
  },
  {
    id: "rail-demo-structure",
    label: "Structure",
    description:
      "The layout has two parts: a sticky navigation rail and a column of sections. The rail reads the position of each section inside the nearest scroll container. It updates the current marker when the next section crosses the reading line.",
    context:
      "Section heights can vary with their content. A short introduction and a longer explanation still belong in the same outline. Let the text determine the spacing so a navigation demo feels like a document people would actually read.",
  },
  {
    id: "rail-demo-components",
    label: "Components",
    description:
      "Each marker is a link with an accessible name. A small line shows its state, and a nearby label appears when it is hovered or focused. The surrounding panel supplies the border, spacing, and scroll area for this example.",
    context:
      "Typography and colors come from the site's design system. Section headings use the heading font, while the paragraphs use the body font and muted text color. The rail inherits the foreground color so it stays readable in both themes.",
  },
  {
    id: "rail-demo-states",
    label: "States",
    description:
      "Markers distinguish sections that are ahead, currently being read, or already passed. The current section has the strongest contrast. Earlier sections remain visible at a softer opacity, while upcoming sections stay subdued until you reach them.",
    context:
      "Hover and keyboard focus briefly expand the markers around the selected topic. This makes it easier to locate a section in a dense outline. Moving away returns the rail to its resting appearance without changing your reading position.",
  },
  {
    id: "rail-demo-motion",
    label: "Motion",
    description:
      "Choose a marker to move smoothly to its section. Only the document panel scrolls; the surrounding page stays where you left it. Try jumping to Overview or Summary to see how a longer movement feels compared with moving to a nearby topic.",
    context:
      "The active marker follows the content during the transition. If your device requests reduced motion, the panel jumps directly to the destination instead. You can also scroll manually at any time and let the rail track your position.",
  },
  {
    id: "rail-demo-accessibility",
    label: "Accessibility",
    description:
      "Every marker has a readable section name for assistive technology, and the active link exposes its current location. Keyboard users can Tab through the markers, see a focus label, and press Enter to open the corresponding section.",
    context:
      "The scroll panel can also receive keyboard focus. Readers can use their usual scrolling keys to move through the text without selecting a marker. Clear headings and a logical content order keep the document usable independently of the visual rail.",
  },
  {
    id: "rail-demo-performance",
    label: "Performance",
    description:
      "Scrolling should feel responsive even in a long document. Position updates are scheduled with the browser's animation frames, so repeated scroll events can share one calculation. The rail only needs to track the section positions and the current reading line.",
    context:
      "Resizing the window triggers another position check because paragraphs may wrap and sections may move. The same outline can therefore work on a wide desktop layout and a narrow mobile panel without maintaining a separate set of section offsets.",
  },
  {
    id: "rail-demo-delivery",
    label: "Delivery",
    description:
      "An integration needs the rail, a list of section IDs and labels, and the matching content. Place the rail beside the document, decide where it should remain sticky, and ensure that the intended scroll container has a constrained height.",
    context:
      "Before shipping, try every marker with a mouse and keyboard. Check that the active state follows manual scrolling, the final section becomes active at the bottom, and the panel remains readable in both themes and with reduced motion enabled.",
  },
  {
    id: "rail-demo-summary",
    label: "Summary",
    description:
      "The rail gives a long document a compact outline that stays available while you read. It shows progress, reveals section names on demand, and offers direct navigation without taking attention away from the text or moving the surrounding page.",
    context:
      "You have reached the end of this sample document. Choose an earlier marker to revisit a topic, or scroll back through the panel to watch the active state move in reverse. The navigation follows the same section order in either direction.",
  },
];

export function SectionRailPreview() {
  return (
    <div className="not-prose demo-frame section-rail-demo section-rail-preview">
      <SectionRail sections={demoSections} gap={0} className="w-5" />
    </div>
  );
}

export function SectionRailDemo() {
  return (
    <div
      className="not-prose demo-frame section-rail-demo"
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
        {demoSections.map(({ id, label, description, context }) => (
          <section key={id} id={id}>
            <h3>{label}</h3>
            <p>{description}</p>
            <p>{context}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export function SpiralTextPreview() {
  return (
    <div className="not-prose demo-frame spiral-demo">
      <SpiralText text="THE CONTENT ARCHITECTURE · " rotating={false} />
    </div>
  );
}
