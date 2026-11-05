# Command

A command palette whose highlight glides between results, with filtered items that reflow, a height-animated list, and a ⌘K dialog.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/command)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/command.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/command.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/command.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/command.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/animated/command";

export function CommandExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Press ⌘K
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} shortcut>
        <Command onSelect={(value) => console.log(value)}>
          <CommandInput placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem value="Calendar" keywords={["schedule"]}>
                Calendar
              </CommandItem>
              <CommandItem value="Calculator">Calculator</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Settings">
              <CommandItem value="Profile">
                Profile
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/command.json). Each file's content is embedded in the registry JSON.



## API reference

### Command

| Prop             | Type                                                              | Default      | Description                                                                                  |
| ---------------- | ----------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `search`         | `string`                                                          | Uncontrolled | Search text when controlled by the caller.                                                   |
| `defaultSearch`  | `string`                                                          | `""`         | Initial search text when uncontrolled.                                                       |
| `onSearchChange` | `(search: string) => void`                                        | None         | Called as the user types. Controlled usage requires the caller to update `search`.           |
| `filter`         | `(value: string, search: string, keywords?: string[]) => boolean` | Word match   | Decides whether an item matches. By default every word must appear in the value or keywords. |
| `onSelect`       | `(value: string) => void`                                         | None         | Called with the value of any item the user runs, after the item's own `onSelect`.            |
| `loop`           | `boolean`                                                         | `true`       | Wraps the arrow keys from the last item back to the first.                                   |
| `duration`       | `number`                                                          | `0.3`        | Highlight, reflow, and list height time in seconds. Zero moves everything instantly.         |
| `className`      | `string`                                                          | None         | Additional root classes.                                                                     |

### CommandInput

| Prop          | Type     | Default                       | Description                           |
| ------------- | -------- | ----------------------------- | ------------------------------------- |
| `placeholder` | `string` | `"Type a command or search…"` | Placeholder text.                     |
| `aria-label`  | `string` | `"Search commands"`           | Accessible name for the search field. |
| `className`   | `string` | None                          | Additional input classes.             |

### CommandItem

| Prop        | Type                      | Default  | Description                                                       |
| ----------- | ------------------------- | -------- | ----------------------------------------------------------------- |
| `value`     | `string`                  | Required | Unique text the search matches against. Also identifies the item. |
| `keywords`  | `string[]`                | None     | Extra words that match the item without being shown.              |
| `onSelect`  | `(value: string) => void` | None     | Runs when the item is clicked or chosen with Enter.               |
| `disabled`  | `boolean`                 | `false`  | Shows the item but skips it during keyboard navigation.           |
| `className` | `string`                  | None     | Additional item classes.                                          |

### CommandList, CommandGroup, CommandEmpty, and CommandShortcut

| Prop        | Type        | Default               | Description                                                               |
| ----------- | ----------- | --------------------- | ------------------------------------------------------------------------- |
| `heading`   | `ReactNode` | None                  | CommandGroup only. Visible heading that also names the group.             |
| `children`  | `ReactNode` | `"No results found."` | CommandEmpty shows its children when no item matches the search.          |
| `className` | `string`    | None                  | Additional classes. CommandShortcut renders a `kbd` aligned to the right. |

### CommandDialog

| Prop           | Type                      | Default             | Description                                                           |
| -------------- | ------------------------- | ------------------- | --------------------------------------------------------------------- |
| `open`         | `boolean`                 | Uncontrolled        | Whether the dialog is open when controlled by the caller.             |
| `defaultOpen`  | `boolean`                 | `false`             | Initial open state when uncontrolled.                                 |
| `onOpenChange` | `(open: boolean) => void` | None                | Called when the dialog opens or closes, including after an item runs. |
| `shortcut`     | `boolean \| string`       | `false`             | Toggles the dialog with ⌘ or Ctrl plus this key. `true` uses K.       |
| `title`        | `string`                  | `"Command palette"` | Accessible title, visually hidden.                                    |
| `description`  | `string`                  | None                | Accessible description, visually hidden.                              |
| `duration`     | `number`                  | `0.35`              | Entrance spring time in seconds. Zero opens and closes instantly.     |
| `className`    | `string`                  | None                | Additional popup classes.                                             |
