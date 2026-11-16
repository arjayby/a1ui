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
- `motion`

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



## Behaviour

- **Drag.** The duck lifts the moment it is pressed and follows the pointer 1:1 from where it was grabbed, including outside the paragraph. The text reflows around its live position on every frame.
- **Release.** [Motion](https://motion.dev) drives every animation. Letting go hands the pointer's velocity to two springs, one for each axis, and the duck comes to rest where its momentum would carry it. Only a flick bounces: a slow release, or one after a pause, settles without overshooting.
- **Catch.** A duck in flight can be grabbed again at any point and carries on from where it is on screen.
- **Edges.** Past an edge of the paragraph the duck follows with growing resistance, then eases back inside when it is let go. A throw at an edge gives the same way.
- **Keyboard.** Arrow keys move the duck 8 pixels, or 32 with Shift, and Home returns it to the middle. Each move is a spring that never overshoots, and steps add up while the duck is still moving.

Only the duck's `transform` and `opacity` are animated. The lines of text are positioned in the same frame as the duck that displaces them.

## Accessibility

- The duck is a button named "Move duck", described by its drag and keyboard instructions. The original paragraph stays in the accessibility tree and the reflowed lines are hidden from it.
- Under `prefers-reduced-motion`, the duck still follows a drag 1:1, but it dims instead of lifting, stops at the edges instead of stretching past them, stays where it is let go, and takes keyboard moves at once. The preference is read when the block mounts.

## API reference

| Prop         | Type     | Default     | Description                                                                        |
| ------------ | -------- | ----------- | ---------------------------------------------------------------------------------- |
| `text`       | `string` | Required    | Plain text to wrap around the duck. Whitespace collapses as in a normal paragraph. |
| `radius`     | `number` | `80`        | Half the duck's width and height in pixels. Shrinks to fit narrow containers.      |
| `gap`        | `number` | `4`         | Space between the duck and the text in pixels.                                     |
| `height`     | `number` | `320`       | Minimum height in pixels. The layout and drag area grow together to fit long text. |
| `fontSize`   | `number` | `18`        | Text size in pixels.                                                               |
| `lineHeight` | `number` | `28`        | Line height in pixels, with a minimum of `fontSize`.                               |
| `fontFamily` | `string` | `"Georgia"` | Named font family used for both measurement and rendering.                         |
| `className`  | `string` | None        | Outer layout classes, such as `max-w-xl`.                                          |
