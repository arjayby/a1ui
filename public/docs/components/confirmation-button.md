# Confirmation Button

A drag-to-confirm button with a dotted arrow, pending feedback, and a confirmed state.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Deliberate confirmation actions with drag, keyboard, and asynchronous feedback.

## Limitations

- The app supplies the action. Dragging is left to right, and success stays visible until remount.

## Integration requirements

- Requires React 19.2 or later. Supply onConfirm. Return a promise for asynchronous work and reject it to allow retry. Change the React key to reset.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/confirmation-button)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
```

Requires React 19.2 or later.

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { ConfirmationButton } from "@/components/ui/confirmation-button";

export function ConfirmationButtonExample() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <ConfirmationButton label="Slide to confirm" onConfirm={() => setConfirmed(true)} />
      <p>{confirmed ? "Action confirmed." : "Waiting for confirmation."}</p>
    </div>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/confirmation-button.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop             | Type                          | Default                          | Purpose                                                                                                                   |
| ---------------- | ----------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `onConfirm`      | `() => void \| Promise<void>` | Required                         | Runs once after a completed gesture or keyboard activation. Resolve to confirm; throw or reject to allow another attempt. |
| `label`          | `string`                      | `"Slide to confirm"`             | Idle text and the handle's accessible name.                                                                               |
| `pendingLabel`   | `string`                      | `"Confirming..."`                | Text while the callback is pending.                                                                                       |
| `confirmedLabel` | `string`                      | `"Confirmed"`                    | Text after the callback succeeds.                                                                                         |
| `errorLabel`     | `string`                      | `"Couldn't confirm. Try again."` | Visible and announced feedback if the callback fails.                                                                     |
| `disabled`       | `boolean`                     | `false`                          | Prevents interaction and cancels an active drag.                                                                          |
| `className`      | `string`                      | None                             | Outer layout classes, such as `max-w-xs`.                                                                                 |
| `style`          | `CSSProperties`               | None                             | Inline styles and component theme tokens.                                                                                 |

Drag the dotted arrow from left to right with a mouse, pen, or touch. Releasing within the last 5% of the track runs `onConfirm`. Letting go early, losing pointer capture, or pressing Escape returns the handle without running the action. Clicking or tapping the handle does not confirm.

Keyboard users can focus the handle and press Enter or Space. Assistive-technology activation follows the same confirmation path. Pending and successful states prevent repeated submissions and announce their labels. Reduced motion disables the return animation and spinner rotation.

Return a promise from `onConfirm` for asynchronous work. The component shows success only after that promise resolves. A thrown error or rejection returns the handle to the start and displays `errorLabel`. Handle application-specific error reporting inside your callback and rethrow the error to keep the retry behavior.

Success stays visible until the component is remounted. Change its React `key` to start a new confirmation. The demo uses this to reset after its simulated action completes.

The component uses your `--background`, `--foreground`, and `--border` theme tokens, with neutral fallbacks. You can override `--confirmation-background`, `--confirmation-foreground`, `--confirmation-border`, and `--confirmation-track` through `style`. Give the control enough width for its label and the handle; 16rem or more works for the default text. Dragging always moves from left to right.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
