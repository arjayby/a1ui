# Menu

A shared highlight that travels between focused and selected menu items.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/menu)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/menu.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/menu.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/menu.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/menu.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { Menu, MenuItem } from "@/components/animated/menu";

export function MenuExample() {
  const [value, setValue] = useState("overview");

  return (
    <Menu
      value={value}
      role="group"
      aria-label="Workspace views"
      className="bg-popover text-popover-foreground flex w-56 flex-col gap-1 rounded-xl border p-1.5 shadow-sm"
    >
      {["overview", "projects", "settings"].map((item) => (
        <MenuItem
          key={item}
          value={item}
          aria-pressed={value === item}
          onClick={() => setValue(item)}
          className="flex h-10 items-center rounded-md px-3 text-left capitalize focus-visible:outline-2"
        >
          {item}
        </MenuItem>
      ))}
    </Menu>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/menu.json). Each file's content is embedded in the registry JSON.



## API reference

| Component  | Prop        | Type                             | Description                                                                                      |
| ---------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Menu`     | `value`     | `string`                         | Required selected item value. The caller updates selection.                                      |
| `Menu`     | Other props | Motion `div` props               | Container classes, accessible labels, and event handlers. Use this container for menu scrolling. |
| `MenuItem` | `value`     | `string`                         | Required unique item value within the menu.                                                      |
| `MenuItem` | `render`    | React element or render function | Replaces the default button with a link or another interactive element through Base UI.          |
| `MenuItem` | Other props | Base UI button props             | Item classes, children, native button attributes, and event handlers.                            |
