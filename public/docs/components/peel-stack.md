# Peel Stack

A layered paper stack that rotates through collections with buttons, arrow keys, or a swipe.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Layered collections, portfolio studies, and attachment cards with manual navigation.

## Limitations

- Shows up to three visible layers. Cards have a fixed height; increase it for long content. Demo artwork is not installed.

## Integration requirements

- Supply items with unique IDs. Uses React 19, Tailwind CSS 4, and theme tokens. Inactive cards are inert; reduced motion disables transitions.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/peel-stack)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
```

Requires React 19 or later and Tailwind CSS 4.

## Code


### Usage

```tsx
import { PeelStack } from "@/components/ui/peel-stack";

const collections = [
  {
    id: "form",
    title: "Form studies",
    description: "12 experiments / 2026",
    label: "A1 / Studies",
  },
  {
    id: "material",
    title: "Material notes",
    description: "08 textures / 2026",
    label: "A1 / Archive",
  },
  {
    id: "sound",
    title: "Field recordings",
    description: "24 moments / 2026",
    label: "A1 / Sound",
  },
];

export function Collections() {
  return <PeelStack items={collections} ariaLabel="Design collections" />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/peel-stack.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop              | Type                   | Default           | Purpose                                                 |
| ----------------- | ---------------------- | ----------------- | ------------------------------------------------------- |
| `items`           | `PeelStackItem[]`      | Required          | Cards in display order. An empty array renders nothing. |
| `activeId`        | `string`               | None              | Controlled selection. Pair with `onActiveChange`.       |
| `defaultActiveId` | `string`               | First item        | Initial selection when uncontrolled.                    |
| `onActiveChange`  | `(id: string) => void` | None              | Called when navigation requests a different card.       |
| `ariaLabel`       | `string`               | `"Peel Stack"`    | Accessible name for the carousel.                       |
| `previousLabel`   | `string`               | `"Previous card"` | Accessible name for the previous button.                |
| `nextLabel`       | `string`               | `"Next card"`     | Accessible name for the next button.                    |
| `className`       | `string`               | None              | Outer layout classes.                                   |
| `style`           | `CSSProperties`        | None              | Inline styles and component theme tokens.               |

Each item needs a stable, unique `id` and a `title`. Optional `label` text appears at the top of the card and defaults to `"Collection"`. `description` appears below the title. `artwork` accepts decorative React content behind the text; its contents are hidden from assistive technology and cannot receive focus. Use `content` for links or other interactive content below the description. The demo's line drawings are separate from the installable component.

The stack shows up to three layers and loops in both directions. A single card disables both navigation buttons. Selection follows the item's ID when the list is reordered. If the selected ID no longer exists, the first card is shown. An uncontrolled stack keeps that fallback selection even if the removed card is later restored. Prop changes do not fire `onActiveChange`.

Focus the stack to use Left and Right, or Home and End to select the first and last cards. Arrow keys inside your own controls keep their usual behavior. Horizontal swipes move one card on release; taps, vertical gestures, and canceled gestures keep the selection. Links and controls inside a card do not start a swipe. Only the active card is exposed to assistive technology and keyboard focus. The counter announces selection changes. Reduced motion disables the card transitions.

The component inherits the background, foreground, card, border, and muted text theme tokens. Override `--peel-stack-background`, `--peel-stack-paper`, `--peel-stack-foreground`, `--peel-stack-muted`, `--peel-stack-border`, or `--peel-stack-shade` through `style` to adjust the palette.

Use `--peel-stack-card-width`, `--peel-stack-card-height`, and `--peel-stack-stage-height` to change the card and stage dimensions. Cards use a fixed height, so increase the card and stage heights for longer descriptions or additional content. `--peel-stack-spread` accepts an angle such as `6deg`; `--peel-stack-radius`, `--peel-stack-title-size`, and `--peel-stack-label-size` adjust the remaining details.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
