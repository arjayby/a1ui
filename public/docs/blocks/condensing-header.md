# Condensing Header

A large title that condenses into a translucent bar, linked 1:1 to the scroll position.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/condensing-header)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/condensing-header.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/condensing-header.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/condensing-header.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/condensing-header.json --yes
```

## Dependencies

None.

## Code


### Usage

```tsx
import { CondensingHeader } from "@/components/blocks/condensing-header";

export function NotesPage() {
  return (
    <main>
      <CondensingHeader
        title="Notes"
        subtitle="16 notes, updated today"
        leading={<button type="button">Folders</button>}
        trailing={<button type="button">Edit</button>}
        accessory={<input type="search" aria-label="Search notes" placeholder="Search" />}
      />
      <ul>{/* Content scrolls under the bar */}</ul>
    </main>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/condensing-header.json). Each file's content is embedded in the registry JSON.



## Placement

Render the header as the first child of the content that scrolls: the page, or an element with
`overflow-y: auto`. It finds that scroller itself. Any ancestor in between that clips its overflow
stops both the sticking and the effect.

Set `scroll-padding-top` on the scroller to the bar height, so focused content is not hidden under the bar.

## Motion and accessibility

The title is carried into the bar by sticky positioning, so it tracks the scroll exactly. Its scale,
its sideways move, and the material are CSS scroll-driven animations where the browser supports them.
Elsewhere the same keyframes are scrubbed from `requestAnimationFrame`. Only transform and opacity change.

- The title is one real heading. The copies that produce the effect are hidden from assistive technology.
- The subtitle and accessory row become inert once they have collapsed.
- The bar's edge appears only once content is under it.
- Where the browser reports rubber-banding at the top (Safari), the large title stretches slightly with the pull.
- With `prefers-reduced-motion`, the large title scrolls away with the content and the two states swap with a short cross-fade.
- With `prefers-reduced-transparency` or `prefers-contrast: more`, the bar is solid. Higher contrast also gives it a full-strength border.

## API reference

| Prop                 | Type                           | Default    | Description                                                         |
| -------------------- | ------------------------------ | ---------- | ------------------------------------------------------------------- |
| `title`              | `string`                       | Required   | The title, rendered as one heading.                                 |
| `headingLevel`       | `1 \| 2 \| 3 \| 4 \| 5 \| 6`   | `1`        | Sets the heading element.                                           |
| `subtitle`           | `ReactNode`                    | None       | A line under the large title that collapses away.                   |
| `accessory`          | `ReactNode`                    | None       | A row under the title, such as search, that collapses away.         |
| `leading`            | `ReactNode`                    | None       | Actions at the start of the bar.                                    |
| `trailing`           | `ReactNode`                    | None       | Actions at the end of the bar.                                      |
| `titleAlign`         | `"center" \| "start"`          | `"center"` | Where the compact title rests in the bar.                           |
| `onCondensedChange`  | `(condensed: boolean) => void` | None       | Called when the title is a third of the way into the bar, and back. |
| `className`, `style` | `string`, `CSSProperties`      | None       | Applied to the root `header`, for example to change `z-index`.      |

## Custom properties

| Property                               | Default                    | Description                                         |
| -------------------------------------- | -------------------------- | --------------------------------------------------- |
| `--condensing-header-background`       | `var(--background)`        | The surface the bar's material is mixed from.       |
| `--condensing-header-bar-height`       | `2.75rem`                  | Height of the bar, excluding the safe area.         |
| `--condensing-header-padding`          | `1rem`                     | Side padding. Never less than the safe-area insets. |
| `--condensing-header-safe-top`         | `env(safe-area-inset-top)` | Top inset. Set to `0px` inside a panel.             |
| `--condensing-header-gap`              | `0.5rem`                   | Space under the expanded header.                    |
| `--condensing-header-title-size`       | `2.125rem`                 | Size of the large title.                            |
| `--condensing-header-title-weight`     | `700`                      | Weight of the large title.                          |
| `--condensing-header-title-tracking`   | `-0.022em`                 | Tracking of the large title.                        |
| `--condensing-header-compact-size`     | `1.0625rem`                | Size of the compact title.                          |
| `--condensing-header-compact-weight`   | `600`                      | Weight of the compact title.                        |
| `--condensing-header-compact-tracking` | `-0.01em`                  | Tracking of the compact title.                      |
