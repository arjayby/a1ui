# Text Banner

Bold text and staggered pixel separators in a seamless, infinitely scrolling banner.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/text-banner)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/text-banner.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/text-banner.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/text-banner.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/text-banner.json --yes
```

## Dependencies

- `clsx`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { TextBanner } from "@/components/blocks/text-banner";

export function BannerExample() {
  const [paused, setPaused] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <TextBanner items={["a1ui", "Components"]} speed={80} direction="right" paused={paused} />
      <button type="button" onClick={() => setPaused((current) => !current)} aria-pressed={paused}>
        {paused ? "Resume banner" : "Pause banner"}
      </button>
    </div>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/text-banner.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop           | Type                | Default     | Description                                                                                      |
| -------------- | ------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `items`        | `readonly string[]` | Required    | Words or phrases to repeat. Blank entries are ignored.                                           |
| `speed`        | `number`            | `80`        | Movement in pixels per second. Zero or negative values pause. Non-finite values use the default. |
| `direction`    | `"left" \| "right"` | `"right"`   | Direction of travel. The default moves left to right.                                            |
| `paused`       | `boolean`           | `false`     | Pauses at the current position. Clearing it resumes the loop.                                    |
| `pauseOnHover` | `boolean`           | `false`     | Pauses while a pointer is over the banner.                                                       |
| `separator`    | `string`            | Pixel motif | Replaces the six-pixel motif with text. An empty string removes it.                              |
| `className`    | `string`            | None        | Adds classes to the outer element.                                                               |
| `style`        | `CSSProperties`     | None        | Changes background, color, font size, font family, or padding.                                   |
