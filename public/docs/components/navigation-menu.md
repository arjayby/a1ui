# Navigation Menu

A site navigation whose one dropdown panel resizes and glides between sections, which slide in from the side you move toward.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/navigation-menu)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/navigation-menu.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/navigation-menu.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/navigation-menu.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/navigation-menu.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/animated/navigation-menu";

export function SiteHeader() {
  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-1 sm:w-96 sm:grid-cols-2">
              <li>
                <NavigationMenuLink href="/functions">Edge Functions</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="/postgres">Postgres</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="resources">
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid sm:w-52">
              <li>
                <NavigationMenuLink href="/docs">Documentation</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="/changelog">Changelog</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="pricing">
          <NavigationMenuLink href="/pricing">Pricing</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
```

The panel is shared. Moving from one trigger to another keeps it open while it resizes and glides to the new trigger, and the old section slides out as the new one slides in from the side you moved toward. Give each section a fixed width from `sm` up so the panel knows what size to settle on. Below `sm`, sections fill the screen width minus a 1rem gutter and the list wraps onto a second line when it runs out of room. Lay out section content in one column at that size, or use a drawer for long menus on phones. Arrow keys move between triggers, Enter or Space opens a section, and Escape closes it.


### Source
[Complete source and dependencies](http://localhost:3000/r/navigation-menu.json). Each file's content is embedded in the registry JSON.



## API reference

### NavigationMenu

| Prop            | Type                              | Default      | Description                                                           |
| --------------- | --------------------------------- | ------------ | --------------------------------------------------------------------- |
| `value`         | `string \| null`                  | Uncontrolled | The open item when controlled by the caller. `null` closes the panel. |
| `defaultValue`  | `string \| null`                  | `null`       | The item that starts open when uncontrolled.                          |
| `onValueChange` | `(value: string \| null) => void` | None         | Called with the item that opens, or `null` when the panel closes.     |
| `duration`      | `number`                          | `0.35`       | Seconds for the panel to resize and move and for sections to slide.   |
| `delay`         | `number`                          | `50`         | Milliseconds to wait before opening on hover.                         |
| `closeDelay`    | `number`                          | `50`         | Milliseconds to wait before closing once the pointer leaves.          |
| `align`         | `"start" \| "center" \| "end"`    | `"center"`   | Alignment of the panel against the active trigger.                    |
| `sideOffset`    | `number`                          | `8`          | Gap between the triggers and the panel in pixels.                     |
| `aria-label`    | `string`                          | None         | Names the navigation landmark.                                        |
| `className`     | `string`                          | None         | Additional root classes.                                              |

### NavigationMenuItem

| Prop        | Type     | Default   | Description                                                   |
| ----------- | -------- | --------- | ------------------------------------------------------------- |
| `value`     | `string` | Generated | Identifies the item. Set it to control the menu from outside. |
| `className` | `string` | None      | Additional item classes.                                      |

### NavigationMenuTrigger

| Prop        | Type      | Default | Description                                    |
| ----------- | --------- | ------- | ---------------------------------------------- |
| `disabled`  | `boolean` | `false` | Prevents the trigger from opening its section. |
| `className` | `string`  | None    | Additional trigger classes.                    |

### NavigationMenuLink

| Prop           | Type      | Default | Description                                                                        |
| -------------- | --------- | ------- | ---------------------------------------------------------------------------------- |
| `href`         | `string`  | None    | Link destination. A link directly in an item is styled like a trigger.             |
| `active`       | `boolean` | `false` | Marks the link as the current page.                                                |
| `closeOnClick` | `boolean` | `false` | Closes the panel when the link is clicked.                                         |
| `className`    | `string`  | None    | Additional link classes. Links inside a section render as padded, full-width rows. |

### NavigationMenuList and NavigationMenuContent

| Prop        | Type     | Default | Description         |
| ----------- | -------- | ------- | ------------------- |
| `className` | `string` | None    | Additional classes. |
