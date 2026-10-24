# Menu

A shared highlight that travels between focused and selected menu items.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Sidebar navigation and view selectors with a traveling focus and selection highlight.

## Limitations

- Selection is controlled by the caller. Each item needs a unique value. Keep item overflow visible so the highlight can travel between rows.

## Integration requirements

- React 19, Tailwind CSS 4, Motion for React, and Base UI. Supply value and wrap each link or button with MenuItem. Reduced motion switches the highlight instantly.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { Menu, MenuItem } from "@/components/animated/menu";

export function MenuExample() {
  const [value, setValue] = useState("overview");

  return (
    <Menu value={value} role="group" aria-label="Workspace views" className="flex w-56 flex-col gap-1">
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

The highlight follows focus without changing the selected value. When focus leaves the menu, the highlight returns to `value`. Updating `value` moves the highlight to the new selection. Each menu has its own animation scope.

For navigation, pass `render={<a href="/projects" />}` or a router link to `MenuItem`. Set `aria-current="page"` on the selected link and pass the current route as the menu's `value`. Buttons use `aria-pressed` when they select a view. Items keep native Tab and activation behavior.

Keep the menu mounted between route changes so Motion can animate from the previous selection. Item backgrounds must be transparent, and item overflow must remain visible. The highlight uses `--muted` with a neutral fallback. Style `[data-slot="menu-highlight"]` to change its color. Use `data-highlighted` to style the text above the moving highlight.


### Source
[Complete source and dependencies](http://localhost:3000/r/menu.json). Each file's content is embedded in the registry JSON.



## API reference

The highlight travels with a spring transition of approximately 350 ms. Reduced motion removes that transition. `MenuItem` requires a `Menu` ancestor. Selection and ARIA state remain controlled by the caller.

| Component  | Prop        | Type                             | Purpose                                                                                          |
| ---------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Menu`     | `value`     | `string`                         | Required selected item value. The caller updates selection.                                      |
| `Menu`     | Other props | Motion `div` props               | Container classes, accessible labels, and event handlers. Use this container for menu scrolling. |
| `MenuItem` | `value`     | `string`                         | Required unique item value within the menu.                                                      |
| `MenuItem` | `render`    | React element or render function | Replaces the default button with a link or another interactive element through Base UI.          |
| `MenuItem` | Other props | Base UI button props             | Item classes, children, native button attributes, and event handlers.                            |



Menu and MenuItem are exported from the same file. Menu uses a scoped Motion LayoutGroup and a scroll-aware container. MenuItem renders a native button by default and supports Base UI's render prop for anchors and router links. The shared decorative span follows focused items, returns to the controlled selection on blur outside the container, and follows external selection changes even while an old item retains focus. Focus does not activate an item. Supply unique values, transparent item backgrounds, visible item overflow, and caller-owned aria-current or aria-pressed attributes. The component preserves native keyboard behavior and does not add ARIA menu roles or arrow-key navigation. Reduced motion switches the highlight instantly. The documentation sidebar uses this same component across its guide, component, and block links.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
