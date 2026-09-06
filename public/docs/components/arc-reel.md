# Arc Reel

An infinitely looping reel with curved provider cards and synchronized scroll controls.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Looping galleries, provider cards, or logo reels with drag and keyboard controls.

## Limitations

- Supply your own artwork; demo images are not installed.

## Integration requirements

- Theme tokens --background, --foreground, --border, and --muted-foreground must exist.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/arc-reel)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
```

## Code


### Usage

```tsx
import { ArcReel } from "@/components/ui/arc-reel";

const providers = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "elevenlabs", name: "ElevenLabs" },
  { id: "mistral", name: "Mistral AI" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "runway", name: "Runway" },
  { id: "cohere", name: "Cohere" },
  { id: "xai", name: "xAI" },
];

export function Providers() {
  return <ArcReel items={providers} initialIndex={2} ariaLabel="AI providers" />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/arc-reel.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop           | Type            | Default      | Purpose                                                 |
| -------------- | --------------- | ------------ | ------------------------------------------------------- |
| `items`        | `ArcReelItem[]` | Required     | Cards in display order. An empty array renders nothing. |
| `initialIndex` | `number`        | `0`          | Starting card, clamped to the available items.          |
| `ariaLabel`    | `string`        | `"Arc Reel"` | Accessible name for the carousel.                       |
| `className`    | `string`        | None         | Sets layout constraints such as width or placement.     |
| `style`        | `CSSProperties` | None         | Overrides the reel's CSS variables.                     |

Each item needs a unique `id` and a `name`. Optional `logo` content replaces the visible name. Optional `artwork` content fills the square behind it while the name stays centered. Every provider in the demo has a unique generated monochrome image with a soft overlay to keep the names readable. Demo images are separate from the installable component; pass your own images through `artwork`.

Cards line the inside of a sphere with the viewer at its center. The middle sits farther away, while the sides face inward and grow larger as they wrap toward the viewer. The perspective adapts to the available width.

Drag with a mouse or swipe on a touchscreen to move through the cards. The reel coasts freely on release, and the marker tracks its position. The arrows move one card at a time, and the line between them is a draggable scrubber with eased movement. Cards loop continuously in both directions, including when dragging across the first or last provider. Focus the cards to use Left and Right to keep looping, or Home and End to choose the first and last providers. The scrubber selects a provider within the current cycle.

The component uses Embla for dragging and momentum. It repeats short lists as needed to fill the viewport, while exposing each provider once to assistive technology. A single card stays centered with navigation disabled. It responds to resizing and item changes, and removes settling animation when reduced motion is requested. Installation includes `embla-carousel-react`.

The reel inherits the project's background, foreground, card, and border colors and uses monospace labels. Override `--arc-reel-background`, `--arc-reel-frame`, `--arc-reel-image`, `--arc-reel-border`, `--arc-reel-foreground`, `--arc-reel-muted`, and `--arc-reel-accent` to change the palette. `--arc-reel-card-width` and `--arc-reel-gap` control card sizing and spacing.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
