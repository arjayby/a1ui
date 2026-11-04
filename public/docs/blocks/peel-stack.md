# Peel Stack

A layered paper stack that rotates through collections with buttons, arrow keys, or a swipe.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/peel-stack)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/peel-stack.json --yes
```

## Dependencies

- `clsx`

## Code


### Usage

```tsx
import { PeelStack } from "@/components/blocks/peel-stack";

const collections = [
  {
    id: "form",
    title: "Form studies",
    description: "Explorations in shape and balance",
    label: "Studies",
  },
  {
    id: "material",
    title: "Material notes",
    description: "A collection of surfaces and textures",
    label: "Archive",
  },
  {
    id: "sound",
    title: "Field recordings",
    description: "Sounds gathered from everyday places",
    label: "Sound",
  },
  {
    id: "light",
    title: "Light studies",
    description: "Patterns of shadow and reflection",
    label: "Light",
  },
  {
    id: "motion",
    title: "Motion sketches",
    description: "Small experiments in rhythm and movement",
    label: "Motion",
  },
];

export function Collections() {
  return <PeelStack items={collections} ariaLabel="Design collections" showControls={false} />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/peel-stack.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop              | Type                   | Default           | Description                                             |
| ----------------- | ---------------------- | ----------------- | ------------------------------------------------------- |
| `items`           | `PeelStackItem[]`      | Required          | Cards in display order. An empty array renders nothing. |
| `activeId`        | `string`               | None              | Controlled selection. Pair with `onActiveChange`.       |
| `defaultActiveId` | `string`               | First item        | Initial selection when uncontrolled.                    |
| `onActiveChange`  | `(id: string) => void` | None              | Called when navigation requests a different card.       |
| `ariaLabel`       | `string`               | `"Peel Stack"`    | Accessible name for the carousel.                       |
| `previousLabel`   | `string`               | `"Previous card"` | Accessible name for the previous button.                |
| `nextLabel`       | `string`               | `"Next card"`     | Accessible name for the next button.                    |
| `showControls`    | `boolean`              | `true`            | Shows the optional previous and next buttons.           |
| `className`       | `string`               | None              | Outer layout classes.                                   |
| `style`           | `CSSProperties`        | None              | Inline styles and component theme tokens.               |
