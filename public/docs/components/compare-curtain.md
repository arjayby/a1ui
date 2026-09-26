# Compare Curtain

A draggable divider that reveals two aligned images or design states.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Before-and-after images, design revisions, and visual product comparisons.

## Limitations

- Horizontal comparison only. The caller supplies aligned layers with matching dimensions.

## Integration requirements

- Requires React 19 and Tailwind CSS 4. Supply accessible descriptions for images inside each layer. The divider supports pointer, touch, and keyboard input.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/compare-curtain)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import { CompareCurtain } from "@/components/ui/compare-curtain";

export function ImageComparison() {
  const [reveal, setReveal] = useState(50);

  return (
    <CompareCurtain
      before={<div className="grid size-full place-items-center bg-background">Draft design</div>}
      after={<div className="grid size-full place-items-center bg-foreground text-background">Finished design</div>}
      beforeLabel="Draft"
      afterLabel="Finished"
      ariaLabel="Reveal finished design"
      value={reveal}
      onValueChange={setReveal}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/compare-curtain.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                      | Default              | Purpose                                                   |
| --------------- | ------------------------- | -------------------- | --------------------------------------------------------- |
| `before`        | `ReactNode`               | Required             | Full layer behind the reveal.                             |
| `after`         | `ReactNode`               | Required             | Layer revealed from the left.                             |
| `beforeLabel`   | `string`                  | `Before`             | Label beneath the right side.                             |
| `afterLabel`    | `string`                  | `After`              | Label beneath the left side and part of the spoken value. |
| `ariaLabel`     | `string`                  | `Reveal after image` | Accessible name for the draggable divider.                |
| `value`         | `number`                  | None                 | Controlled reveal percentage. Pair with `onValueChange`.  |
| `defaultValue`  | `number`                  | `50`                 | Initial percentage in uncontrolled mode.                  |
| `onValueChange` | `(value: number) => void` | None                 | Runs when the divider changes.                            |
| `disabled`      | `boolean`                 | `false`              | Stops pointer and keyboard changes.                       |
| `className`     | `string`                  | None                 | Outer layout classes.                                     |
| `style`         | `CSSProperties`           | None                 | Inline styles on the outer element.                       |

Drag the center arrow directly with a mouse, pen, or touch. The divider is the only control. It clamps to 0–100 percent, keeps its arrow visible at the ends, and has no automatic animation.

The arrow has slider semantics. Focus it and use arrow keys for one percent, Shift with arrow keys or Page Up and Page Down for ten percent, and Home or End for the boundaries. Provide a clear `ariaLabel` and useful alternative text for any images in both layers.

Both layers fill the same frame. Use images or other content that can be cropped without changing their alignment. The component uses the surrounding theme's foreground, background, and muted colors.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
