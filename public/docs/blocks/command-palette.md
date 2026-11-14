# Command Palette

A ⌘K command palette that scales in over a scrim, with fuzzy search, a gliding highlight, and nested pages.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/command-palette)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/command-palette.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/command-palette.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/command-palette.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/command-palette.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`
- `input` (shadcn)

## Code


### Usage

```tsx
"use client";

import { useRouter } from "next/navigation";

import { CommandPalette, type CommandPaletteItem } from "@/components/blocks/command-palette";

export function SiteCommands() {
  const router = useRouter();

  const items: CommandPaletteItem[] = [
    {
      id: "docs",
      group: "Go to",
      label: "Documentation",
      keywords: ["guide", "help"],
      shortcut: ["G", "D"],
      onSelect: () => router.push("/docs"),
    },
    {
      id: "new-project",
      group: "Actions",
      label: "New project",
      description: "Start from a blank canvas",
      shortcut: ["⌘", "N"],
      onSelect: () => router.push("/projects/new"),
    },
    {
      id: "theme",
      group: "Actions",
      label: "Change theme",
      children: [
        { id: "light", label: "Light", onSelect: () => setTheme("light") },
        { id: "dark", label: "Dark", onSelect: () => setTheme("dark") },
      ],
    },
  ];

  return <CommandPalette items={items} onSelect={(item) => console.log("ran", item.id)} />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/command-palette.json). Each file's content is embedded in the registry JSON.



## API reference

- The surface settles in from slightly larger as it fades in, and drifts a little larger as it fades out, matching the docs search dialog.
- Typing filters labels and keywords with a fuzzy match that favors word starts and unbroken runs. Matched characters are wrapped in `mark`. Rows keep their identity and glide to their new places; typing again mid-flight retargets them from where they are.
- One highlight follows both the keyboard and the pointer. Rows that move or scroll under a resting pointer do not take it.
- An item with `children` opens a nested page. Backspace on an empty query, or the back button beside the input, returns to the page it came from.
- Focus stays in the input. Arrow keys, Home, and End move the highlight, Enter runs it, Escape closes, and focus returns to the control that opened the palette.
- With reduced motion the surface and rows only fade. With reduced transparency or increased contrast the surface is solid.

`matchCommand(query, text)` is exported too. It returns the score and matched character positions the palette uses, or `null` when the text does not match.

### CommandPalette

| Prop           | Type                                 | Default               | Description                                                        |
| -------------- | ------------------------------------ | --------------------- | ------------------------------------------------------------------ |
| `items`        | `CommandPaletteItem[]`               | Required              | Commands in display order.                                         |
| `onSelect`     | `(item: CommandPaletteItem) => void` | None                  | Called when an item runs, after the item's own `onSelect`.         |
| `open`         | `boolean`                            | None                  | Controls the open state.                                           |
| `defaultOpen`  | `boolean`                            | `false`               | Opens the palette on mount when uncontrolled.                      |
| `onOpenChange` | `(open: boolean) => void`            | None                  | Called when the palette asks to open or close.                     |
| `shortcut`     | `string \| false`                    | `"k"`                 | Key that toggles the palette with ⌘ or Ctrl. `false` turns it off. |
| `trigger`      | `boolean`                            | `true`                | Renders the built-in trigger button.                               |
| `placeholder`  | `string`                             | `"Search commands…"`  | Placeholder and accessible name of the input.                      |
| `emptyMessage` | `ReactNode`                          | Quotes the query      | Shown when nothing matches.                                        |
| `label`        | `string`                             | `"Command palette"`   | Accessible name of the dialog and its list.                        |
| `className`    | `string`                             | None                  | Classes for the trigger button.                                    |
| `children`     | `ReactNode`                          | Search label and hint | Replaces the trigger's content.                                    |

### CommandPaletteItem

| Field         | Type                   | Description                                                     |
| ------------- | ---------------------- | --------------------------------------------------------------- |
| `id`          | `string`               | Stable identifier, unique among the item's siblings.            |
| `label`       | `string`               | Text shown and searched.                                        |
| `description` | `string`               | Second line under the label.                                    |
| `keywords`    | `string[]`             | Extra search terms that are not shown.                          |
| `icon`        | `ReactNode`            | Leading icon.                                                   |
| `shortcut`    | `string[]`             | Keys shown as a hint. The palette does not bind them.           |
| `group`       | `string`               | Heading the item is listed under. Items without one come first. |
| `disabled`    | `boolean`              | Shows the item but skips it for the highlight and for running.  |
| `children`    | `CommandPaletteItem[]` | Opens a nested page of items instead of running.                |
| `onSelect`    | `() => void`           | Called when this item runs.                                     |
