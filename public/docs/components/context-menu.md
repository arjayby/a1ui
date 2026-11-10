# Context Menu

A right-click menu that grows out of the pointer, with checkbox and radio items, submenus, and a traveling highlight.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/context-menu)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/context-menu.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/context-menu.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/context-menu.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/context-menu.json --yes
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
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/animated/context-menu";

export function ContextMenuExample() {
  const [pinned, setPinned] = useState(true);
  const [sort, setSort] = useState("name");

  return (
    <ContextMenu>
      <ContextMenuTrigger
        tabIndex={0}
        className="flex h-36 w-64 items-center justify-center rounded-lg border border-dashed text-sm select-none"
      >
        Right-click here
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52" aria-label="File actions">
        <ContextMenuItem inset onClick={() => alert("Open")}>
          Open
          <ContextMenuShortcut>⌘O</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem inset disabled>
          Move to archive
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Share</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40" aria-label="Share">
            <ContextMenuItem onClick={() => alert("Copy link")}>Copy link</ContextMenuItem>
            <ContextMenuItem onClick={() => alert("Email")}>Email</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>
          Pin to sidebar
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel inset>Sort by</ContextMenuLabel>
          <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
            <ContextMenuRadioItem value="name">Name</ContextMenuRadioItem>
            <ContextMenuRadioItem value="modified">Date modified</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/context-menu.json). Each file's content is embedded in the registry JSON.



## API reference

The menu opens where you asked for it and scales out of that exact point, then shrinks back into it when it closes. Near a viewport edge it flips or shifts to stay on screen, and the point it grows from stays under the pointer. Opening and closing run on one critically damped spring, so closing a menu that is still opening, or reopening one that is still closing, continues from where it is. Right-clicking another spot while the menu is open moves it there.

It opens three ways:

- **Pointer.** Right-click anywhere in the trigger.
- **Keyboard.** Shift+F10 or the context-menu key opens it below the focused element, with the first row focused. Give the trigger `tabIndex={0}` when nothing inside it can take focus.
- **Touch.** Press and hold for half a second. The trigger carries `data-pressing` while the finger is down, so it can respond before the menu arrives.

Arrow keys, Home, End, type-ahead, and Escape come from Base UI, and focus returns to where it was when the menu closes. One highlight travels between the hovered or focused rows. A check draws itself when you tick a checkbox item, and one dot slides between the items of a radio group. Checkbox and radio items keep the menu open, so you can change several at once.

The surface is a translucent `popover` material that blurs the page behind it. It turns solid when the user prefers reduced transparency or more contrast, and more contrast also outlines the highlighted row. With reduced motion the menu fades without scaling, and the highlight and the radio dot jump instead of sliding.

### ContextMenu

| Prop           | Type                           | Default      | Description                                                                         |
| -------------- | ------------------------------ | ------------ | ----------------------------------------------------------------------------------- |
| `open`         | `boolean`                      | Uncontrolled | Whether the menu is open when controlled. The menu still opens at the last pointer. |
| `defaultOpen`  | `boolean`                      | `false`      | Whether the menu starts open when uncontrolled.                                     |
| `onOpenChange` | `(open, eventDetails) => void` | None         | Called when the menu opens or closes. `eventDetails.reason` says why.               |
| `duration`     | `number`                       | `0.25`       | Opening time in seconds. Closing takes 60% of it. Zero opens and closes instantly.  |
| `disabled`     | `boolean`                      | `false`      | Leaves right-click, the keyboard shortcuts, and long press to the browser.          |
| `loopFocus`    | `boolean`                      | `true`       | Whether arrow keys wrap from the last row to the first.                             |

Other Base UI context menu root props pass through.

### ContextMenuTrigger

Renders a `<div>` around the area that opens the menu and accepts its props, including `render` to use another element.

| Attribute         | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `data-popup-open` | Present while the menu is open.                                  |
| `data-pressing`   | Present while a finger is held down, before the menu has opened. |

### ContextMenuContent and ContextMenuSubContent

| Prop               | Type                                     | Default                  | Description                                                                                                 |
| ------------------ | ---------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `side`             | `"top" \| "bottom" \| "left" \| "right"` | At the pointer           | Side to open on. A keyboard open defaults to `"bottom"`. Submenus open at the inline end.                   |
| `align`            | `"start" \| "center" \| "end"`           | `"start"`                | Alignment along that side.                                                                                  |
| `sideOffset`       | `number`                                 | Base UI's pointer offset | Distance from the anchor in pixels. `4` for a keyboard open and for submenus.                               |
| `alignOffset`      | `number`                                 | Base UI's pointer offset | Offset along the alignment axis in pixels. `-5` for submenus, so their first row lines up with the trigger. |
| `collisionPadding` | `number`                                 | `8`                      | Space kept between the menu and the viewport edge.                                                          |
| `aria-label`       | `string`                                 | None                     | Accessible name of the menu.                                                                                |
| `className`        | `string`                                 | None                     | Additional popup classes, such as a width.                                                                  |

### Items

| Component                 | Props                                                              | Description                                                                                           |
| ------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `ContextMenuItem`         | `onClick`, `disabled`, `closeOnClick`, `label`, `inset`, `variant` | Runs `onClick` and closes the menu. `variant="destructive"` uses the `destructive` color.             |
| `ContextMenuCheckboxItem` | `checked`, `defaultChecked`, `onCheckedChange`, `disabled`         | Toggles a setting and draws its check.                                                                |
| `ContextMenuRadioGroup`   | `value`, `defaultValue`, `onValueChange`, `disabled`               | Holds one choice among its radio items.                                                               |
| `ContextMenuRadioItem`    | `value`, `disabled`                                                | Selects its `value` in the group.                                                                     |
| `ContextMenuSub`          | `open`, `defaultOpen`, `onOpenChange`, `duration`                  | Groups a submenu's trigger and content.                                                               |
| `ContextMenuSubTrigger`   | `disabled`, `label`, `inset`                                       | Opens the submenu on hover, click, or ArrowRight, and stays highlighted while it is open.             |
| `ContextMenuGroup`        | Base UI group props                                                | Groups related rows.                                                                                  |
| `ContextMenuLabel`        | `inset`                                                            | Names the group it sits in. It must be inside a `ContextMenuGroup` or a `ContextMenuRadioGroup`.      |
| `ContextMenuSeparator`    | `className`                                                        | A hairline between sections.                                                                          |
| `ContextMenuShortcut`     | `className`                                                        | A keyboard hint at the end of a row. It is hidden from assistive technology and binds nothing itself. |

`inset` indents a row to line up with checkbox and radio items. `label` sets the text used for type-ahead when a row holds more than plain text. Every row takes `className`, and `render` to use another element such as a link.
