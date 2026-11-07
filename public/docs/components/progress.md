# Progress

A progress bar, ring, or step row whose fill springs to each value while the percentage rolls like a counter.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/progress)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/progress.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/progress.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/progress.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/progress.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { Progress } from "@/components/animated/progress";

export function ProgressExample({ uploaded }: { uploaded: number | null }) {
  return <Progress label="Uploading assets" value={uploaded} shimmer />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/progress.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop          | Type                                         | Default         | Description                                                                                                                                                                                                       |
| ------------- | -------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `number \| null`                             | `0`             | Current value, clamped between `min` and `max`. `null` shows a looping indeterminate sweep.                                                                                                                       |
| `min`         | `number`                                     | `0`             | Lowest value.                                                                                                                                                                                                     |
| `max`         | `number`                                     | `100`           | Highest value. Reaching it marks the bar `data-complete`.                                                                                                                                                         |
| `variant`     | `"bar" \| "ring" \| "steps"`                 | `"bar"`         | A horizontal track, a circular stroke, or a row of segments that fill one after another.                                                                                                                          |
| `steps`       | `number`                                     | `5`             | Number of segments for the `steps` variant.                                                                                                                                                                       |
| `label`       | `ReactNode`                                  | None            | Visible label, used as the progress bar's accessible name.                                                                                                                                                        |
| `aria-label`  | `string`                                     | None            | Accessible name when there is no visible label.                                                                                                                                                                   |
| `showValue`   | `boolean`                                    | `true`          | Shows the value text, which rolls its digits like a counter.                                                                                                                                                      |
| `formatValue` | `(value: number, percent: number) => string` | Rounded percent | Formats the value text and `aria-valuetext`. Receives the clamped value and its percentage.                                                                                                                       |
| `shimmer`     | `boolean`                                    | `false`         | Moves a highlight across the fill while it is below 100%.                                                                                                                                                         |
| `size`        | `number`                                     | `64`            | Ring diameter in pixels. The stroke width scales with it.                                                                                                                                                         |
| `duration`    | `number`                                     | `0.6`           | Fill spring duration in seconds, settling without overshoot. The sweep and shimmer loops scale with it but never take longer than 2.5 seconds per pass. Zero jumps to each value and stops the sweep and shimmer. |
| `className`   | `string`                                     | None            | Additional classes on the root element.                                                                                                                                                                           |
