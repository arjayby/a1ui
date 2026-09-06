# Shape Flow

Text that reflows around a draggable X, powered by Pretext.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Editorial text wrapping around a draggable X shape.

## Limitations

- One left-to-right plain-text paragraph. Rich text and right-to-left flow are unsupported.

## Integration requirements

- Use a loaded named font. Interactive layout needs Canvas 2D, Intl.Segmenter, and ResizeObserver.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/shape-flow)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/shape-flow.json --yes
```

## Code


### Usage

```tsx
import { ShapeFlow } from "@/components/ui/shape-flow";

export function ShapeFlowExample() {
  return (
    <ShapeFlow
      text="A page is a conversation between what is said and what is left open. Give the words a little room and they find their own rhythm. Move the X and watch the paragraph find a new shape."
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
| `text`       | `string` | Required    | Plain text to wrap around the X. Whitespace collapses as in a normal paragraph.    |
| `radius`     | `number` | `80`        | Half the X's width and height in pixels. Shrinks to fit narrow containers.         |
| `gap`        | `number` | `4`         | Space between the X and the text in pixels.                                        |
| `height`     | `number` | `320`       | Minimum height in pixels. The layout and drag area grow together to fit long text. |
| `fontSize`   | `number` | `18`        | Text size in pixels.                                                               |
| `lineHeight` | `number` | `28`        | Line height in pixels, with a minimum of `fontSize`.                               |
| `fontFamily` | `string` | `"Georgia"` | Named font family used for both measurement and rendering.                         |
| `className`  | `string` | None        | Outer layout classes, such as `max-w-xl`.                                          |

Text fills the available spaces on either side and between the arms of the X. Gaps narrower than two characters are skipped. Drag any arm with a mouse, pen, or touch. Focus the X and use arrow keys to move it by 8 pixels, or hold Shift for 32-pixel steps. Home centers the X in the full layout. The X stays inside the drag area when the container resizes.

The full paragraph renders on the server and remains available to screen readers. Once the font loads, the component uses [Pretext](https://github.com/chenglou/pretext) to measure the text once and reuse those measurements during dragging and resizing. If font measurement is unavailable, it keeps the ordinary paragraph. No automatic animation runs, including with reduced motion enabled.

Use the typography props to keep measurement and rendering in sync. Supply a named font that your app loads, such as `Georgia` or `"Commit Mono"`, rather than `system-ui`. The interactive layout requires Canvas 2D, `Intl.Segmenter`, and `ResizeObserver`. This component lays out one plain-text paragraph from left to right; rich text and right-to-left paragraph flow are outside its scope.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
