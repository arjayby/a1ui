# ASCII Terrain

A landscape made of characters, with rolling hills, pointer sculpting, and click ripples.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/ascii-terrain)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/ascii-terrain.json --yes
```

## Dependencies

- `clsx`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { AsciiTerrain } from "@/components/blocks/ascii-terrain";

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

| Prop          | Type            | Default                              | Description                                                                                                                      |
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
