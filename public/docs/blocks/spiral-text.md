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

None.

## Code


### Usage

```tsx
import { SpiralText } from "@/components/blocks/spiral-text";

export function Poster() {
  return (
    <SpiralText
      text="THE CONTENT ARCHITECTURE · "
      density={1}
      tightenStrength={0.35}
      rippleDuration={1800}
      rotationSpeed={2}
      className="max-w-2xl"
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/spiral-text.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop              | Type      | Default  | Description                                                                                         |
| ----------------- | --------- | -------- | --------------------------------------------------------------------------------------------------- |
| `text`            | `string`  | Required | Repeats along the spiral path and names the graphic for assistive technology.                       |
| `density`         | `number`  | `1`      | Adjusts the number of resting turns between `0.65` and `1.6`.                                       |
| `tightenStrength` | `number`  | `0.35`   | Controls how closely the coils draw together, clamped from `0.08` to `0.7`.                         |
| `rippleDuration`  | `number`  | `1800`   | Sets the outward wave duration in milliseconds, with a `300ms` minimum.                             |
| `rotating`        | `boolean` | `true`   | Rotates the text clockwise. Set to `false` to pause at the current angle.                           |
| `rotationSpeed`   | `number`  | `1`      | Rotations per minute. Higher values spin faster. Non-positive or non-finite values use the default. |
| `className`       | `string`  | None     | Sets layout constraints such as width or placement.                                                 |
