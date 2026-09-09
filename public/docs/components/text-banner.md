# Text Banner

Bold text and staggered pixel separators in a seamless, infinitely scrolling banner.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Continuously scrolling words or phrases with separators for page banners.

## Limitations

- Plain text only. Repeated content is decorative and cannot contain links or controls.

## Integration requirements

- Supply items and a pause control using the paused prop. Requires ResizeObserver. Reduced motion displays one static sequence.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/text-banner)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/text-banner.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/text-banner.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/text-banner.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/text-banner.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { TextBanner } from "@/components/ui/text-banner";

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

| Prop           | Type                | Default     | Purpose                                                                                          |
| -------------- | ------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `items`        | `readonly string[]` | Required    | Words or phrases to repeat. Blank entries are ignored.                                           |
| `speed`        | `number`            | `80`        | Movement in pixels per second. Zero or negative values pause. Non-finite values use the default. |
| `direction`    | `"left" \| "right"` | `"right"`   | Direction of travel. The default moves left to right.                                            |
| `paused`       | `boolean`           | `false`     | Pauses at the current position. Clearing it resumes the loop.                                    |
| `pauseOnHover` | `boolean`           | `false`     | Pauses while a pointer is over the banner.                                                       |
| `separator`    | `string`            | Pixel motif | Replaces the six-pixel motif with text. An empty string removes it.                              |
| `className`    | `string`            | None        | Adds classes to the outer element.                                                               |
| `style`        | `CSSProperties`     | None        | Changes background, color, font size, font family, or padding.                                   |

Standard div attributes pass through to the outer element. The banner inherits the page font and uses `--muted`, `--foreground`, and `--border` for its colors and thin borders. These tokens follow the project's light and dark themes. Set `--text-banner-background` and `--text-banner-foreground` on a parent to customize multiple banners, or use `style` for a single instance.

The banner measures one sequence and repeats it enough to cover the container. Two matching groups loop at a constant speed, including when there is only one short word. `ResizeObserver` updates the layout when the container, text, or font size changes. Empty lists render nothing. The animation styles ship inside the component.

Screen readers receive the text once. Repeated copies and separators are hidden from the accessibility tree. Reduced motion stops the animation and shows one wrapping sequence so every phrase remains readable. For a continuously moving banner, provide a pause button using `paused`, as in the example. Hover pausing is an optional addition to that control.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
