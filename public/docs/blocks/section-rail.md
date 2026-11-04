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

None.

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



## API reference

| Prop                 | Type                              | Default           | Purpose                                                    |
| -------------------- | --------------------------------- | ----------------- | ---------------------------------------------------------- |
| `sections`           | `{ id: string; label: string }[]` | Required          | Maps each marker to an element ID and readable label.      |
| `activeOffset`       | `number`                          | `0.36`            | Sets the reading line within the nearest scroll container. |
| `activeMarkerLength` | `"long" \| "short"`               | `"long"`          | Sets the resting width of the active marker.               |
| `ariaLabel`          | `string`                          | `"Page sections"` | Names the navigation landmark.                             |
| `gap`                | `CSSProperties["gap"]`            | `0`               | Sets the gap between section markers.                      |
| `className`          | `string`                          | None              | Controls placement in the consuming page.                  |
