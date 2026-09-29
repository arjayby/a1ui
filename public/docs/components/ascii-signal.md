# ASCII Signal

A small ASCII waveform that changes with an idle, processing, or complete state.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Compact status displays for uploads, generation, and background tasks.

## Limitations

- The signal has three fixed states and does not report numeric progress.

## Integration requirements

- Supply a status and a distinct label for each state. Reduced motion shows static frames.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/ascii-signal)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/ascii-signal.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/ascii-signal.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/ascii-signal.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/ascii-signal.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { AsciiSignal, type AsciiSignalStatus } from "@/components/ui/ascii-signal";

export function GenerationStatus() {
  const [status, setStatus] = useState<AsciiSignalStatus>("idle");

  return (
    <>
      <AsciiSignal status={status} />
      <button type="button" onClick={() => setStatus("processing")}>
        Start
      </button>
      <button type="button" onClick={() => setStatus("complete")}>
        Finish
      </button>
    </>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/ascii-signal.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop        | Type                                   | Default                    | Purpose                                 |
| ----------- | -------------------------------------- | -------------------------- | --------------------------------------- |
| `status`    | `"idle" \| "processing" \| "complete"` | Required                   | Selects the waveform or checkmark.      |
| `label`     | `string`                               | Text for the current state | Visible text announced when it changes. |
| `paused`    | `boolean`                              | `false`                    | Holds a static frame and stops updates. |
| `className` | `string`                               | None                       | Adds classes to the outer card.         |
| `style`     | `CSSProperties`                        | None                       | Adds inline styles to the outer card.   |

`AsciiSignalStatus` and `AsciiSignalProps` are exported types. Use a different `label` for each state so assistive technology can announce the change. The ASCII drawing is decorative; the visible label carries the status.

The signal has three fixed states and does not report numeric progress. Give a separate percentage or progress bar when the exact amount matters.

The idle wave moves gently, processing moves faster, and switching to complete draws a checkmark. Motion stops while the component is offscreen or the browser tab is hidden. Reduced motion and `paused` show a static frame.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
