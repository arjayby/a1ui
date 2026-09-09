# ASCII Terrain

A landscape made of characters, with rolling hills, pointer sculpting, and click ripples.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Interactive ASCII landscapes and decorative hero backgrounds.

## Limitations

- Procedural illustration only. No geographic data or persistent terrain editing. JavaScript is required to draw.

## Integration requirements

- Supply a pause control for automatic motion. Requires Canvas 2D, ResizeObserver, and IntersectionObserver. Reduced motion shows a static landscape.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/ascii-terrain)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { AsciiTerrain } from "@/components/ui/ascii-terrain";

export function AsciiTerrainExample() {
  const [paused, setPaused] = useState(false);

  return (
    <div>
      <AsciiTerrain paused={paused} cellSize={10} amplitude={1} seed={7} />
      <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
        {paused ? "Resume terrain" : "Pause terrain"}
      </button>
    </div>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/ascii-terrain.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop          | Type            | Default                              | Purpose                                                                                                                          |
| ------------- | --------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `cellSize`    | `number`        | `10`                                 | Character spacing in pixels, clamped to 6–24. Smaller values add detail.                                                         |
| `amplitude`   | `number`        | `1`                                  | Base hill height, clamped to 0–2. Pointer hills and ripples are independent.                                                     |
| `speed`       | `number`        | `1`                                  | Terrain drift speed, clamped to 0–3. Zero stops drift while keeping interactions active.                                         |
| `seed`        | `number`        | `7`                                  | Reproducible starting landscape. Change it to create a different terrain.                                                        |
| `characters`  | `string`        | `".:-=+*#%@"`                        | Up to 32 printable, non-space ASCII characters ordered from low to high elevation. Invalid or empty input uses the default ramp. |
| `paused`      | `boolean`       | `false`                              | Freeze the current frame and disable interactions. Resume continues from the same animation time.                                |
| `interactive` | `boolean`       | `true`                               | Enable pointer, touch, and keyboard interaction. False removes the focusable control.                                            |
| `ariaLabel`   | `string`        | `"ASCII terrain with rolling hills"` | Accessible description of the terrain.                                                                                           |
| `className`   | `string`        | None                                 | Outer layout classes. The default height is 24rem.                                                                               |
| `style`       | `CSSProperties` | None                                 | Set height, text color, or a loaded monospace font.                                                                              |

Move the pointer across the landscape to raise a hill. Click or tap to send a wave across it. Focus the terrain and use arrow keys to move the hill, Enter or Space to create a ripple, Home to return to the center, and Escape to release the hill. Touch scrolling stays available.

Include a pause control for automatically moving terrain, as in the example. Reduced motion shows a static landscape and disables sculpting and ripples. The animation also stops while offscreen, inside an inert catalog preview, or in a hidden browser tab. Use `interactive={false}` for decorative backgrounds and keep page content outside the canvas.

The component uses Canvas 2D and inherits text color and the monospace font. It needs `ResizeObserver`, `IntersectionObserver`, and JavaScript to draw; its accessible description is present in server-rendered HTML. It draws on each display frame with bounded character counts and canvas resolution. Hover hills ease toward the pointer, and click ripples build gradually before fading. It has no WebGL, image assets, or graphics library dependency. This is a procedural illustration, not a geographic map or terrain editor.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
