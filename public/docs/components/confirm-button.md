# Confirm Button

A hold-to-confirm button with a directional color fill and configurable hold duration.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/confirm-button)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/confirm-button.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/confirm-button.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/confirm-button.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/confirm-button.json --yes
```

## Dependencies

- `motion`
- `@phosphor-icons/react`
- `button` (shadcn)

Requires React 19.2 or later.

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/animated/confirm-button";

export function ConfirmButtonExample() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ConfirmButton
      onConfirm={() => setConfirmed(true)}
      label={confirmed ? "Hold to confirm again" : "Hold to confirm"}
      direction="right"
      duration={2}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/confirm-button.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop                 | Type                                  | Default             | Description                                                                                                             |
| -------------------- | ------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `onConfirm`          | `() => void`                          | Required            | Action called once when an uninterrupted hold completes.                                                                |
| `label`              | `string`                              | `"Hold to confirm"` | Idle label and accessible name.                                                                                         |
| `holdingLabel`       | `string`                              | `"Keep holding"`    | Label while the fill progresses.                                                                                        |
| `confirmedLabel`     | `string`                              | `"Confirmed"`       | Label and live announcement when the hold completes. Remains visible while held and for two seconds after release.      |
| `direction`          | `"right" \| "left" \| "up" \| "down"` | `"right"`           | Direction the fill travels toward.                                                                                      |
| `duration`           | `number`                              | `1.5`               | Required hold time and fill duration in seconds.                                                                        |
| `animation`          | `"blur" \| "slide" \| "flip"`         | `"blur"`            | Text and check icon transitions, matching Copy Button.                                                                  |
| `transitionDuration` | `number`                              | `0.2`               | Text and icon transition time in seconds, independent of `duration`.                                                    |
| `disabled`           | `boolean`                             | `false`             | Prevents starting a hold and cancels an active hold.                                                                    |
| `className`          | `string`                              | None                | Additional button classes. Overrides the default `w-40` width and can set `--confirm-fill` to customize the fill color. |
