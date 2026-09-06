# Section Rail

A compact reading rail that tracks progress through page sections.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Table of contents and reading progress for long pages with sections.

## Limitations

- Tracks existing DOM sections; it does not create the page content.

## Integration requirements

- Match every item ID to a section element on the page.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/section-rail)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/section-rail.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/section-rail.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/section-rail.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/section-rail.json --yes
```

## Code


### Usage

```tsx
import { SectionRail } from "@/components/ui/section-rail";

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

The active link receives `aria-current="location"`. Use `activeMarkerLength="short"` to keep it at the base width or `"long"` to extend it. Both options retain the full-opacity active color. Every link also exposes `data-state="pending"`, `active`, or `complete` for styling. Hovering or focusing a link expands the nearby markers into a tapered group.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
