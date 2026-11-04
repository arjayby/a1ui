# Arc Reel

An infinitely looping reel with curved provider cards and synchronized scroll controls.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/arc-reel)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/arc-reel.json --yes
```

## Dependencies

- `embla-carousel-react@^8.6.0`

## Code


### Usage

```tsx
import { ArcReel } from "@/components/blocks/arc-reel";

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
