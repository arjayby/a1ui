# Section Rail

A compact reading rail that tracks progress through page sections.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/section-rail)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/section-rail.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/section-rail.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/section-rail.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/section-rail.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { SectionRail } from "@/components/blocks/section-rail";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "installation", label: "Installation" },
  { id: "api-reference", label: "API reference" },
];

export function ArticlePage() {
  return (
    <>
      <SectionRail
        sections={sections}
        activeMarkerLength="short"
        gap={0}
        className="fixed top-1/2 left-4 -translate-y-1/2"
      />
      <article>{/* Sections with matching IDs */}</article>
    </>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/section-rail.json). Each file's content is embedded in the registry JSON.



## Behaviour

- **Tracking.** The active marker belongs to the last section whose top has crossed the reading line, which sits `activeOffset` of the way down the nearest scroll container, or the window when there is none. At the end of the scroll range the last section is active.
- **Motion.** [Motion](https://motion.dev) drives every animation. Markers change length and opacity on a spring that settles without overshooting. A marker that is still moving heads for its new target from wherever it is, so the rail keeps up while you scroll or sweep the pointer along it.
- **Press.** The marker you press shortens on pointer-down, or on Enter, and springs back on release.
- **Labels.** A label grows out of its marker under the pointer or on keyboard focus, and returns along the same path when you move on.
- **Jumps.** Inside a scroll container, choosing a marker scrolls only that container and updates the URL hash. It uses the browser's smooth scrolling, so the wheel, touch, or keyboard can take over at any point.

## Accessibility

- The rail is a `nav` named by `ariaLabel`. Each marker is a link named after its section, and the active one has `aria-current="location"`.
- Under `prefers-reduced-motion`, markers change length at once and cross-fade, labels fade without sliding, the pressed marker dims instead of shortening, and jumps are instant. The preference is read when the rail mounts.
- Under `prefers-reduced-transparency`, the label's translucent surface becomes solid.

## API reference

| Prop                 | Type                              | Default           | Description                                                |
| -------------------- | --------------------------------- | ----------------- | ---------------------------------------------------------- |
| `sections`           | `{ id: string; label: string }[]` | Required          | Maps each marker to an element ID and readable label.      |
| `activeOffset`       | `number`                          | `0.36`            | Sets the reading line within the nearest scroll container. |
| `activeMarkerLength` | `"long" \| "short"`               | `"long"`          | Sets the resting width of the active marker.               |
| `ariaLabel`          | `string`                          | `"Page sections"` | Names the navigation landmark.                             |
| `gap`                | `CSSProperties["gap"]`            | `0`               | Sets the gap between section markers.                      |
| `className`          | `string`                          | None              | Controls placement in the consuming page.                  |
