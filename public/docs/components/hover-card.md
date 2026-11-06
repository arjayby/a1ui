# Hover Card

A link preview card that springs out from its trigger and staggers its contents in.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/hover-card)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/hover-card.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/hover-card.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/hover-card.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/hover-card.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/animated/hover-card";

export function HoverCardExample() {
  return (
    <HoverCard>
      <HoverCardTrigger href="https://github.com/arjayby">@arjayby</HoverCardTrigger>
      <HoverCardContent className="grid grid-cols-[2.5rem_1fr] items-center gap-x-3">
        <span className="bg-foreground text-background grid size-10 place-items-center rounded-full">AB</span>
        <p className="font-semibold">Arjay Bayona</p>
        <p className="col-span-2 mt-3">Building a1ui, animated React components and blocks.</p>
        <p className="text-muted-foreground col-span-2 mt-3">github.com/arjayby/a1ui</p>
      </HoverCardContent>
    </HoverCard>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/hover-card.json). Each file's content is embedded in the registry JSON.



## API reference

### Behavior

- The card opens after `openDelay` when a mouse rests on the trigger or keyboard focus reaches it, and closes after `closeDelay` once the pointer leaves both the trigger and the card.
- Escape and a press outside the card close it straight away.
- Touch input never opens the card, so a tap simply follows the link and nothing is left stuck open.
- Each direct child of `HoverCardContent` rises in after the previous one. Wrap elements that should arrive together.
- Reduced motion shows and hides the card instantly without the stagger.

### HoverCard

| Prop           | Type                      | Default      | Description                                                                  |
| -------------- | ------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `open`         | `boolean`                 | Uncontrolled | Whether the card is open when controlled by the caller.                      |
| `defaultOpen`  | `boolean`                 | `false`      | Initial state when uncontrolled.                                             |
| `onOpenChange` | `(open: boolean) => void` | None         | Called with the next state. Controlled usage requires the caller to update.  |
| `openDelay`    | `number`                  | `0`          | Milliseconds the pointer or keyboard focus rests on the trigger before open. |
| `closeDelay`   | `number`                  | `200`        | Milliseconds after the pointer leaves before the card closes.                |
| `duration`     | `number`                  | `0.35`       | Spring time in seconds for the card. Zero shows it instantly.                |

### HoverCardTrigger

| Prop         | Type                          | Default      | Description                                                   |
| ------------ | ----------------------------- | ------------ | ------------------------------------------------------------- |
| `href`       | `string`                      | None         | Where the link goes when clicked or tapped.                   |
| `render`     | `ReactElement \| function`    | `<a>`        | Replaces the link element, for example with a framework link. |
| `delay`      | `number`                      | `openDelay`  | Overrides the open delay for this trigger, in milliseconds.   |
| `closeDelay` | `number`                      | `closeDelay` | Overrides the close delay for this trigger, in milliseconds.  |
| `onClick`    | `(event: MouseEvent) => void` | None         | Click handler for the link.                                   |
| `className`  | `string`                      | None         | Additional classes on the link.                               |

### HoverCardContent

| Prop          | Type                                     | Default    | Description                                                            |
| ------------- | ---------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `side`        | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Side of the trigger the card opens on. It flips when there is no room. |
| `align`       | `"start" \| "center" \| "end"`           | `"center"` | Alignment against the trigger.                                         |
| `sideOffset`  | `number`                                 | `8`        | Gap between the trigger and the card in pixels.                        |
| `alignOffset` | `number`                                 | `0`        | Shift along the alignment axis in pixels.                              |
| `stagger`     | `number`                                 | `0.04`     | Seconds between each direct child fading in. Zero shows them together. |
| `className`   | `string`                                 | None       | Additional classes on the card, such as a grid layout.                 |
