# Tooltip

A tooltip that springs from its trigger and glides between neighboring triggers, morphing its size and text.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/tooltip)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/tooltip.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/tooltip.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/tooltip.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/tooltip.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/animated/tooltip";

export function TooltipExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger aria-label="Bold">B</TooltipTrigger>
        <TooltipContent>Bold ⌘B</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger aria-label="Italic">I</TooltipTrigger>
        <TooltipContent>Italic ⌘I</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/tooltip.json). Each file's content is embedded in the registry JSON.



## API reference

### TooltipProvider

Shares hover delays between tooltips. With `glide`, every tooltip inside uses one popup that moves to the hovered trigger and morphs its size and text instead of closing and reopening.

| Prop         | Type      | Default | Description                                                                        |
| ------------ | --------- | ------- | ---------------------------------------------------------------------------------- |
| `delay`      | `number`  | `300`   | Hover time in milliseconds before the first tooltip opens.                         |
| `closeDelay` | `number`  | `0`     | Time in milliseconds before a tooltip closes after the pointer leaves.             |
| `timeout`    | `number`  | `400`   | Window in milliseconds after a tooltip closes in which the next one opens at once. |
| `duration`   | `number`  | `0.3`   | Glide and morph time in seconds, and the default spring-out time for each tooltip. |
| `glide`      | `boolean` | `true`  | Shares one popup between the triggers inside. `false` gives each tooltip its own.  |

### Tooltip

| Prop           | Type                      | Default      | Description                                          |
| -------------- | ------------------------- | ------------ | ---------------------------------------------------- |
| `open`         | `boolean`                 | Uncontrolled | Whether the tooltip is shown, when controlled.       |
| `defaultOpen`  | `boolean`                 | `false`      | Whether the tooltip starts shown, when uncontrolled. |
| `onOpenChange` | `(open: boolean) => void` | None         | Called when hover or focus opens or closes it.       |
| `disabled`     | `boolean`                 | `false`      | Keeps the tooltip from opening.                      |

### TooltipTrigger

Renders a `<button>`. Accepts Base UI Tooltip.Trigger props such as `render`, `delay`, `closeDelay`, and `closeOnClick`, plus any button attribute. Give icon-only triggers an `aria-label`.

### TooltipContent

| Prop          | Type                                     | Default    | Description                                                   |
| ------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------- |
| `side`        | `"top" \| "bottom" \| "left" \| "right"` | `"top"`    | Preferred side of the trigger. Flips to stay in view.         |
| `sideOffset`  | `number`                                 | `8`        | Gap in pixels between the trigger and the tooltip.            |
| `align`       | `"start" \| "center" \| "end"`           | `"center"` | Alignment along the trigger's edge.                           |
| `alignOffset` | `number`                                 | `0`        | Shift in pixels along the alignment axis.                     |
| `arrow`       | `boolean`                                | `true`     | Shows an arrow pointing at the trigger.                       |
| `duration`    | `number`                                 | Provider   | Spring-out time in seconds. Zero shows the tooltip instantly. |
| `className`   | `string`                                 | None       | Additional classes on the popup.                              |
