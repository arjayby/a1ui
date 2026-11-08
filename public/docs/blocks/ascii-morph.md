# ASCII Morph

A cloud of characters that morphs into a globe, a flower, and an A1 monogram.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/ascii-morph)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
```

## Dependencies

- `clsx`
- `motion`

## Code


### Usage

```tsx
import { AsciiMorph } from "@/components/blocks/ascii-morph";

export function AsciiMorphExample() {
  return <AsciiMorph className="max-w-xl" />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/ascii-morph.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                               | Default                | Description                                                                                                                |
| --------------- | ---------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `shape`         | `"globe" \| "flower" \| "a1"`      | Uncontrolled           | Controlled destination. Update it in `onShapeChange` to accept user input.                                                 |
| `defaultShape`  | `AsciiMorphShape`                  | `"globe"`              | Initial shape when uncontrolled. Read once on mount.                                                                       |
| `onShapeChange` | `(shape: AsciiMorphShape) => void` | None                   | Called when a click or key requests another shape.                                                                         |
| `duration`      | `number`                           | `1200`                 | Approximate settling time in milliseconds. Clamped to 400–4000. Spring velocity and travel distance affect the exact time. |
| `interactive`   | `boolean`                          | `true`                 | Enables the button and animated transitions. Set to `false` for a static illustration that follows `shape`.                |
| `ariaLabel`     | `string`                           | `"Change ASCII shape"` | Accessible name of the button.                                                                                             |
| `className`     | `string`                           | None                   | Outer layout classes. The illustration fills its container with a 6:5 aspect ratio by default.                             |
| `style`         | `CSSProperties`                    | None                   | Outer inline styles, including a custom height or color.                                                                   |
