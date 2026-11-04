# Dropdown Menu

A shadcn dropdown with open and close transitions and a traveling highlight.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

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

## Dependencies

- `motion`
- `@base-ui/react`
- `dropdown-menu` (shadcn)
- `button` (shadcn)

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
