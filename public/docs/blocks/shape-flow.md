# Shape Flow

Text that reflows around a floating ASCII duck, powered by Pretext.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/shape-flow)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
```

## Dependencies

- `@chenglou/pretext@^0.0.8`
- `clsx`

## Code


### Usage

```tsx
import { ShapeFlow } from "@/components/blocks/shape-flow";

export function ShapeFlowExample() {
  return (
    <ShapeFlow
      text="A page is a conversation between what is said and what is left open. Give the words a little room and they find their own rhythm. Move the duck and watch the paragraph find a new shape."
      radius={80}
      gap={4}
      className="max-w-xl"
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/shape-flow.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop         | Type     | Default     | Purpose                                                                            |
| ------------ | -------- | ----------- | ---------------------------------------------------------------------------------- |
| `text`       | `string` | Required    | Plain text to wrap around the duck. Whitespace collapses as in a normal paragraph. |
| `radius`     | `number` | `80`        | Half the duck's width and height in pixels. Shrinks to fit narrow containers.      |
| `gap`        | `number` | `4`         | Space between the duck and the text in pixels.                                     |
| `height`     | `number` | `320`       | Minimum height in pixels. The layout and drag area grow together to fit long text. |
| `fontSize`   | `number` | `18`        | Text size in pixels.                                                               |
| `lineHeight` | `number` | `28`        | Line height in pixels, with a minimum of `fontSize`.                               |
| `fontFamily` | `string` | `"Georgia"` | Named font family used for both measurement and rendering.                         |
| `className`  | `string` | None        | Outer layout classes, such as `max-w-xl`.                                          |
