# ASCII Morph

A cloud of characters that morphs into a globe, a flower, and an A1 monogram.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Interactive ASCII illustrations for landing pages, portfolios, and identity studies.

## Limitations

- Three built-in silhouettes only: globe, flower, and A1. Does not convert images or arbitrary text into ASCII.

## Integration requirements

- React and Tailwind CSS. Uses SVG, requestAnimationFrame, matchMedia, and IntersectionObserver. Reduced motion switches shapes instantly. No automatic animation or pause control is needed.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/ascii-morph)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/ascii-morph.json --yes
```

## Code


### Usage

```tsx
import { AsciiMorph } from "@/components/ui/ascii-morph";

export function AsciiMorphExample() {
  return <AsciiMorph className="max-w-xl" />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/ascii-morph.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                               | Default                | Purpose                                                                                                                    |
| --------------- | ---------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `shape`         | `"globe" \| "flower" \| "a1"`      | Uncontrolled           | Controlled destination. Update it in `onShapeChange` to accept user input.                                                 |
| `defaultShape`  | `AsciiMorphShape`                  | `"globe"`              | Initial shape when uncontrolled. Read once on mount.                                                                       |
| `onShapeChange` | `(shape: AsciiMorphShape) => void` | None                   | Called when a click or key requests another shape.                                                                         |
| `duration`      | `number`                           | `1600`                 | Approximate settling time in milliseconds. Clamped to 400–4000. Spring velocity and travel distance affect the exact time. |
| `interactive`   | `boolean`                          | `true`                 | Enables the button and animated transitions. Set to `false` for a static illustration that follows `shape`.                |
| `ariaLabel`     | `string`                           | `"Change ASCII shape"` | Accessible name of the button.                                                                                             |
| `className`     | `string`                           | None                   | Outer layout classes. The illustration fills its container with a 6:5 aspect ratio by default.                             |
| `style`         | `CSSProperties`                    | None                   | Outer inline styles, including a custom height or color.                                                                   |

`AsciiMorphShape` and `AsciiMorphProps` are exported types. The sequence is Globe, Flower, A1, then Globe again. A1 is a fixed monogram; this component does not accept custom images or text.

### Controlled shape

Use a Client Component when supplying a callback.

```tsx
"use client";

import { useState } from "react";
import { AsciiMorph, type AsciiMorphShape } from "@/components/ui/ascii-morph";

export function ControlledAsciiMorphExample() {
  const [shape, setShape] = useState<AsciiMorphShape>("flower");
  return <AsciiMorph shape={shape} onShapeChange={setShape} duration={2000} />;
}
```

### Interaction and motion

Click or tap anywhere on the illustration to advance. Enter and Space activate the focused button. Right and Down go forward; Left and Up go back. The current shape is announced through a live status, and individual glyphs stay hidden from assistive technology.

Each glyph keeps its identity, position, and velocity when you interrupt a transition. The animation updates SVG coordinates without rendering React on every frame. It stops once the shape settles and suspends while the component is offscreen or the document is hidden. Unmounting cancels the frame and removes observers and event listeners.

Reduced motion skips travel and shows the requested silhouette immediately, including when the preference changes during a morph. There is no automatic cycling. The initial silhouette renders on the server, and a fixed SVG viewBox scales every position together when the container resizes. The glyphs inherit the component's color and stay visible across theme changes.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
