# Confirmation Button

A drag-to-confirm button with a dotted arrow, pending feedback, and a confirmed state.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/confirmation-button)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/confirmation-button.json --yes
```

## Dependencies

- `clsx`
- `lucide-react`

Requires React 19.2 or later.

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { ConfirmationButton } from "@/components/blocks/confirmation-button";

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

| Prop             | Type                          | Default                          | Description                                                                                                               |
| ---------------- | ----------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `onConfirm`      | `() => void \| Promise<void>` | Required                         | Runs once after a completed gesture or keyboard activation. Resolve to confirm; throw or reject to allow another attempt. |
| `label`          | `string`                      | `"Slide to confirm"`             | Idle text and the handle's accessible name.                                                                               |
| `pendingLabel`   | `string`                      | `"Confirming..."`                | Text while the callback is pending.                                                                                       |
| `confirmedLabel` | `string`                      | `"Confirmed"`                    | Text after the callback succeeds.                                                                                         |
| `errorLabel`     | `string`                      | `"Couldn't confirm. Try again."` | Visible and announced feedback if the callback fails.                                                                     |
| `disabled`       | `boolean`                     | `false`                          | Prevents interaction and cancels an active drag.                                                                          |
| `className`      | `string`                      | None                             | Outer layout classes, such as `max-w-xs`.                                                                                 |
| `style`          | `CSSProperties`               | None                             | Inline styles and component theme tokens.                                                                                 |
