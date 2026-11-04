# Compare Curtain

A draggable divider that reveals two aligned images or design states.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/compare-curtain)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/compare-curtain.json --yes
```

## Dependencies

- `clsx`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import { CompareCurtain } from "@/components/blocks/compare-curtain";

export function ImageComparison() {
  const [reveal, setReveal] = useState(50);

  return (
    <CompareCurtain
      before={<div className="bg-background grid size-full place-items-center">Draft design</div>}
      after={
        <div className="bg-foreground text-background grid size-full place-items-center">Finished design</div>
      }
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
