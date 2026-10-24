# Dropdown Menu

A shadcn dropdown with open and close transitions and a traveling highlight.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Action menus with animated open and close transitions and a shared pointer and keyboard highlight.

## Limitations

- Uses the shadcn Base UI variant. Animated highlights cover regular action items and submenu triggers; checkbox items and radio items use the underlying shadcn components.

## Integration requirements

- React 19, Tailwind CSS 4, Motion for React, Base UI, and the shadcn Dropdown Menu. Reduced motion removes popup and highlight transitions.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/dropdown-menu)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/dropdown-menu.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/dropdown-menu.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/dropdown-menu.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/dropdown-menu.json --yes
```

## Code


### Usage

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/animated/dropdown-menu";

export function DropdownMenuExample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>Workspace</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" aria-label="Workspace actions">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => alert("New project")}>New project</DropdownMenuItem>
          <DropdownMenuItem render={<a href="/projects" />}>Projects</DropdownMenuItem>
          <DropdownMenuItem disabled>Invite members</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Switch workspace</DropdownMenuSubTrigger>
            <DropdownMenuSubContent aria-label="Switch workspace" className="w-52">
              <DropdownMenuItem onClick={() => alert("Personal workspace")}>
                Personal workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Design team")}>Design team</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Engineering")}>Engineering</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => alert("Settings")}>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/dropdown-menu.json). Each file's content is embedded in the registry JSON.



## API reference

The popup fades and scales over 150 ms when it opens and closes. The highlight uses the same 350 ms spring as Menu.
Reduced motion removes both transitions. Each content instance has its own highlight scope.

| Component                | Props                                                         | Purpose                                                                                        |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DropdownMenu`           | Base UI menu root props                                       | Supports controlled `open` and `onOpenChange`, or uncontrolled `defaultOpen`.                  |
| `DropdownMenuTrigger`    | Base UI trigger props                                         | Opens the menu. `render` composes the trigger with a button.                                   |
| `DropdownMenuContent`    | shadcn Base UI content props, with string `className`         | Controls popup styling and placement through `side`, `align`, `sideOffset`, and `alignOffset`. |
| `DropdownMenuItem`       | shadcn Base UI item props, with string `className`            | Runs `onClick` on activation. Supports `disabled`, `closeOnClick`, and `render` for links.     |
| `DropdownMenuGroup`      | Base UI group props                                           | Groups related actions.                                                                        |
| `DropdownMenuLabel`      | Base UI group label props                                     | Labels a group.                                                                                |
| `DropdownMenuSeparator`  | Base UI separator props                                       | Separates groups.                                                                              |
| `DropdownMenuSub`        | Base UI submenu root props                                    | Groups a nested menu's trigger and content.                                                    |
| `DropdownMenuSubTrigger` | shadcn Base UI submenu trigger props, with string `className` | Opens the nested menu on hover, click, or ArrowRight. Uses the same traveling highlight.       |
| `DropdownMenuSubContent` | Same as `DropdownMenuContent`                                 | Animates nested content, with a separate highlight scope. Defaults to the right side.          |



This component wraps the shadcn Base UI dropdown from `@/components/ui/dropdown-menu`. The registry installs that dependency and Motion. Use a project configured for shadcn's Base UI variant. The animated exports live at `@/components/animated/dropdown-menu`.

The highlight follows pointer hover and keyboard focus without activating an action. Arrow keys, Home, End, and typeahead use Base UI's menu navigation. Disabled items cannot activate. Enter or a pointer click activates an item and closes the menu by default. Escape and outside clicks dismiss the menu. Base UI handles focus restoration.

Content uses CSS transitions with Base UI's starting and ending attributes so the popup remains mounted during its closing animation. Item highlights share a Motion layout ID scoped to their content. Keep item backgrounds transparent and item overflow visible so the highlight can travel between rows. The highlight uses `--muted` with a neutral fallback. Style `[data-slot="dropdown-menu-highlight"]` to change its appearance.

Each popup isolates its highlight behind all item content. Keep items and wrappers inside the popup free of transforms, isolation, or z-index values that create separate stacking contexts.

Compose a nested menu with `DropdownMenuSub`, `DropdownMenuSubTrigger`, and `DropdownMenuSubContent`. Each content has its own highlight scope. In left-to-right layouts, ArrowRight opens the submenu and ArrowLeft returns to its trigger. Base UI reverses these keys in right-to-left layouts. Selecting a nested action closes both menus and restores focus to the root trigger.

The animated wrappers cover regular action items and submenu triggers. Checkbox items and radio items use the underlying shadcn components. Root, trigger, group, label, separator, and submenu root are re-exported without changes. Custom `render` elements must spread the supplied props, forward their ref, and render their children.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
