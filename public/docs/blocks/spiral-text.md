# Spiral Text

Text set on a responsive spiral that tightens under pressure and ripples on release.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/spiral-text)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { SpiralText } from "@/components/blocks/spiral-text";

export function Poster() {
  const [rotating, setRotating] = useState(true);

  return (
    <div className="flex flex-col items-center gap-4">
      <SpiralText
        text="THE CONTENT ARCHITECTURE · "
        density={1}
        tightenStrength={0.35}
        rippleDuration={1800}
        rotating={rotating}
        rotationSpeed={2}
        className="max-w-2xl"
      />
      <button type="button" onClick={() => setRotating((current) => !current)} aria-pressed={!rotating}>
        {rotating ? "Pause rotation" : "Resume rotation"}
      </button>
    </div>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/spiral-text.json). Each file's content is embedded in the registry JSON.



## Behaviour

- **Press and release.** The rings start to gather the moment a press lands and settle without overshooting. Release sends a wave out from the center: each ring stays gathered until the wave reaches it, then returns to rest as the crest swells it outward and dims it. `rippleDuration` is the time the wave takes to cross the figure.
- **Interrupting.** Every ring moves on a spring, so nothing has to finish first. A press during a ripple catches each ring at the size and speed it has and gathers it from there. A quick tap lets the rings spend their inward speed before the wave arrives. New `text`, `density` or `tightenStrength` during a gesture carries on from where the rings are.
- **Rotation.** `rotating` and `rotationSpeed` change how fast the figure turns, not where it is. Pausing coasts to a stop at the current angle, resuming picks up from that angle, and a new speed blends in over about half a second. The rotation also holds while the figure is pressed, and stops while it is offscreen or its tab is hidden.
- **Motion.** [Motion](https://motion.dev) drives every animation, and only `transform` and `opacity` change, so the glyphs are not laid out or drawn again while the figure moves.

## Accessibility

- The figure is an image named by `text`. The repeated glyphs are hidden from assistive technology.
- The rotation runs for longer than five seconds, so give it a visible pause control wired to `rotating` (WCAG 2.2.2).
- Under `prefers-reduced-motion`, the rotation stops at the angle it has reached and the rings stay still. A press dims the text with a short fade and release fades it back. A change to the setting takes effect at once, without a reload.

## API reference

| Prop              | Type               | Default  | Description                                                                                                                                                           |
| ----------------- | ------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`            | `string`           | Required | Repeats along the spiral path and names the graphic for assistive technology.                                                                                         |
| `density`         | `number`           | `1`      | Adjusts the number of resting turns between `0.65` and `1.6`.                                                                                                         |
| `tightenStrength` | `number`           | `0.35`   | Controls how closely the coils draw together, clamped from `0.08` to `0.7`.                                                                                           |
| `rippleDuration`  | `number`           | `1800`   | The time the outward wave takes to cross the figure, in milliseconds, with a `300ms` minimum.                                                                         |
| `rotating`        | `boolean`          | `true`   | Rotates the text clockwise. Set to `false` to coast to a stop at the current angle, and back to `true` to resume from it. Wire it to a visible pause control.         |
| `rotationSpeed`   | `number`           | `1`      | Rotations per minute. Higher values spin faster, and a change blends in from the current speed. Non-positive or non-finite values use the default.                    |
| `ref`             | `SpiralTextHandle` | None     | Presses the figure from code: `press()` tightens the rings as a held pointer does, and `release()` lets go and sends the ripple out. Works inside an inert container. |
| `className`       | `string`           | None     | Sets layout constraints such as width or placement.                                                                                                                   |
