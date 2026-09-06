# Select Menu

A dropdown selector with icons, descriptions, and keyboard navigation.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Single-choice dropdowns with icons, descriptions, and keyboard navigation.

## Limitations

- Single selection only; search and multi-select are not provided.

## Integration requirements

- Supply options, a controlled value, onValueChange, and an accessible ariaLabel.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/select-menu)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/select-menu.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/select-menu.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/select-menu.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/select-menu.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { Globe, FlaskConical } from "lucide-react";
import { SelectMenu, type SelectMenuOption } from "@/components/ui/select-menu";

const options: SelectMenuOption[] = [
  {
    value: "production",
    label: "Production",
    description: "Visible to everyone",
    icon: <Globe />,
    shortcut: "1",
  },
  {
    value: "staging",
    label: "Staging",
    description: "Review changes with your team",
    icon: <FlaskConical />,
    shortcut: "2",
  },
  { value: "archived", label: "Archived", disabled: true },
];

export function EnvironmentPicker() {
  const [value, setValue] = useState("production");

  return (
    <SelectMenu
      options={options}
      value={value}
      onValueChange={setValue}
      ariaLabel="Environment"
      className="w-72"
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/select-menu.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                             | Default              | Purpose                                                                                |
| --------------- | -------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `options`       | `SelectMenuOption[]`             | Required             | Choices in display order.                                                              |
| `value`         | `string`                         | Required             | Selected option value. Pass an empty string for the placeholder.                       |
| `onValueChange` | `(value: string) => void`        | Required             | Receives the chosen enabled option.                                                    |
| `ariaLabel`     | `string`                         | Required             | Accessible name and menu heading.                                                      |
| `placeholder`   | `string`                         | `"Select an option"` | Shown when no option matches the value.                                                |
| `disabled`      | `boolean`                        | `false`              | Prevents interaction. Empty lists and lists with no enabled options are also disabled. |
| `variant`       | `"outline" \| "ghost" \| "pill"` | `"outline"`          | Trigger appearance.                                                                    |
| `align`         | `"start" \| "center" \| "end"`   | `"start"`            | Menu alignment relative to the trigger.                                                |
| `id`, `name`    | `string`                         | None                 | Label association and native form submission.                                          |
| `className`     | `string`                         | None                 | Trigger layout, such as width or placement.                                            |
| `style`         | `CSSProperties`                  | None                 | Theme overrides applied to the trigger and menu.                                       |

Each option needs a unique, nonempty `value` and a plain-text `label`. Optional `description` and `detail` add a second line and a trailing value to the menu row. Optional `icon` content appears in both the row and selected trigger. Set `disabled` on individual options to keep them visible without allowing selection.

Set an option's `shortcut` to a unique single letter or digit, such as `"1"`. It appears as a keycap in place of `detail`. With the menu open, pressing that key selects the option, closes the menu, and returns focus to the trigger. Disabled options ignore their shortcuts. Shortcuts do not run with modifier keys or while composing text. Number keys preserve letter-based typeahead; a letter shortcut takes priority over typeahead for that key.

The component is controlled. Store the selected value in the parent and update it through `onValueChange`. When the options change and the current value is no longer available, the trigger displays its placeholder without choosing a replacement. The parent decides how to handle that change.

Space, Enter, and the arrow keys open the menu. Arrow keys navigate options; Home and End move to the first and last choices. Disabled options can receive keyboard focus so their descriptions remain discoverable, but cannot be selected. Typing an option's label moves focus through the list. Enter or Space selects the focused enabled option. Escape and clicking outside close the menu and restore focus. The menu uses Base UI Select's combobox and listbox semantics and supports touch input.

The menu renders in a portal so it can extend beyond cards with clipped content. It adjusts its position near viewport edges and scrolls long option lists. It inherits the project's theme tokens. To customize a single instance, pass `--select-menu-background`, `--select-menu-foreground`, `--select-menu-muted`, `--select-menu-border`, and `--select-menu-highlight` through `style`. Pass local theme variables through that same object so they are available inside the portal.

[Multichain Swap](http://localhost:3000/components/multichain-swap) uses this component for its networks, tokens, and slippage values. Token names and balances appear in its option rows; filtering and quote validation remain in the swap component. Installing Multichain Swap includes the same Select Menu source file. Select Menu installs with `@base-ui/react`, `clsx`, and `lucide-react`.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
