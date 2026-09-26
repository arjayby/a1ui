# Command Deck

A keyboard-first action picker with search, shortcut hints, and an inline result.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- In-page command menus and searchable action lists.

## Limitations

- The deck is inline. Shortcut hints do not register application shortcuts.

## Integration requirements

- Supply actions with unique IDs and connect action callbacks. Enable Command/Ctrl+K on at most one deck per page.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/command-deck)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/command-deck.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/command-deck.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/command-deck.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/command-deck.json --yes
```

## Code


### Usage

```tsx
"use client";

import { CommandDeck, type CommandDeckAction } from "@/components/ui/command-deck";

const actions: CommandDeckAction[] = [
  { id: "components", label: "Open components", shortcut: "G C" },
  { id: "categories", label: "Browse categories", shortcut: "G B" },
];

export function PageCommands() {
  return <CommandDeck actions={actions} onAction={(action) => console.log(action.id)} enableGlobalShortcut />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/command-deck.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop                   | Type                                  | Default                 | Purpose                                                          |
| ---------------------- | ------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `actions`              | `readonly CommandDeckAction[]`        | Required                | Searchable actions with unique IDs.                              |
| `onAction`             | `(action: CommandDeckAction) => void` | None                    | Runs after selecting an enabled action.                          |
| `ariaLabel`            | `string`                              | `"Find an action"`      | Search input's accessible name.                                  |
| `placeholder`          | `string`                              | `"Find an action..."`   | Search hint.                                                     |
| `emptyMessage`         | `string`                              | `"No matching actions"` | Message when search has no matches.                              |
| `enableGlobalShortcut` | `boolean`                             | `false`                 | Focuses the input with Command/Ctrl+K. Use on one deck per page. |
| `className`            | `string`                              | None                    | Outer layout classes.                                            |
| `style`                | `CSSProperties`                       | None                    | Inline styles and component theme tokens.                        |

Each action requires `id` and `label`. It can include `description`, `icon`, `keywords`, `shortcut`, `disabled`, and `onSelect`. Search checks the label, description, and keywords without changing action order. `shortcut` is a displayed hint; wire the actual shortcut in your app if needed. Selecting an action calls its `onSelect`, then the deck's `onAction`.

The search input is a combobox connected to an action list. Arrow Up and Arrow Down move through enabled matches, wrapping at the ends. Enter selects the active match. Escape clears a nonempty search; pressing it again releases focus. Pointer movement updates the active row, and a click selects it. The footer announces the selected action to assistive technology.

Colors use the page's `--background`, `--foreground`, `--muted-foreground`, and `--border` tokens. Override `--command-deck-background`, `--command-deck-foreground`, `--command-deck-muted`, and `--command-deck-border` through `style` when needed.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
