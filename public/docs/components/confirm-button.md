# Confirm Button

A hold-to-confirm button with a directional color fill and configurable hold duration.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Deliberate confirmation actions that require an uninterrupted pointer or keyboard hold.

## Limitations

- onConfirm fires once per completed hold. The caller handles asynchronous work and errors. Confirmation stays visible for two seconds after release before resetting. Click-only activation does not confirm.

## Integration requirements

- React 19.2 or later, Tailwind CSS 4, Motion for React, Phosphor icons, and the shared UI Button. Supply onConfirm in a client component. duration is in seconds; direction is right, left, up, or down.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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

| Prop                 | Type                                  | Default             | Purpose                                                                                                                                                 |
| -------------------- | ------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onConfirm`          | `() => void`                          | Required            | Action called once when an uninterrupted hold completes.                                                                                                |
| `label`              | `string`                              | `"Hold to confirm"` | Idle label and accessible name.                                                                                                                         |
| `holdingLabel`       | `string`                              | `"Keep holding"`    | Label while the fill progresses.                                                                                                                        |
| `confirmedLabel`     | `string`                              | `"Confirmed"`       | Label and live announcement when the hold completes. Remains visible while held and for two seconds after release.                                      |
| `direction`          | `"right" \| "left" \| "up" \| "down"` | `"right"`           | Direction the color travels toward. Right fills from left to right, left from right to left, up from bottom to top, and down from top to bottom.        |
| `duration`           | `number`                              | `1.5`               | Required hold time and fill duration in seconds. Non-positive or non-finite values use `1.5`.                                                           |
| `animation`          | `"blur" \| "slide" \| "flip"`         | `"blur"`            | Text and check icon transitions, matching Copy Button.                                                                                                  |
| `transitionDuration` | `number`                              | `0.2`               | Text and icon transition time in seconds, independent of the hold and fill duration. Non-positive values skip transitions. Non-finite values use `0.2`. |
| `disabled`           | `boolean`                             | `false`             | Prevents starting a hold and cancels an active hold.                                                                                                    |
| `className`          | `string`                              | None                | Additional button classes. Overrides the default `w-40` width and can set `--confirm-fill` to customize the fill color.                                 |

The fill uses the neutral text color at 20% opacity by default and disappears on success. The confirmed label and check icon use the success color, using `--status-success` with a green fallback. For a custom fill color, set `className="[--confirm-fill:#64748b]"`. Reduced motion skips text and icon transitions while preserving the linear fill because it communicates the required hold time.



The fill and hold use the same duration. `onConfirm` fires when the fill reaches the end, while the button is still held. It fires once per hold. On success, the fill clears and a check icon appears beside the confirmed label. Both use the success text color. After release, the confirmed label remains visible for two seconds before the button resets. New holds are blocked during this confirmation.

Releasing early, moving the pointer outside the button, pressing Escape, losing focus, or hiding the tab cancels the hold and clears the fill. A new hold always starts from zero. Changing `disabled`, `duration`, or `direction` also cancels an active hold.

Keyboard users hold Space or Enter for the same duration. A click alone does not confirm. The button uses `type="button"` and does not submit forms automatically. The caller handles asynchronous work, loading, and errors through `onConfirm` and `disabled`.

ConfirmButton is a separate component from the slide-to-confirm ConfirmationButton block. It uses the shared UI Button with the outline variant. Pointer input includes mouse, touch, and pen. Only the primary pointer and primary button start a hold. Pointer release, cancellation, lost capture, movement outside the button, keyboard release, Escape, button or window blur, and document visibility changes cancel unfinished holds. Unmounting cancels the animation frame. The fill uses requestAnimationFrame and elapsed time without rendering React on every frame. It reaches full progress, hides the fill, animates a check icon and the confirmed label using the Copy Button presets, and calls onConfirm once, with no additional calls from key repeat or native clicks. Releasing after completion starts a two-second confirmation before restoring idle. Unmounting clears the confirmation timer. The demo shows one button with controls for fill direction, animation, hold duration, and transition duration. Changing a control resets the preview. The demo does not save data.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
