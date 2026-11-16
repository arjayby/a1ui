# Loader

Twelve looping indicators for waits of unknown length, from a leaning ring to sliding tiles, all sized and timed from two props.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/loader)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/loader.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/loader.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/loader.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/loader.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { Loader } from "@/components/animated/loader";

export function ResultsStatus({ pending }: { pending: boolean }) {
  if (!pending) return null;
  return <Loader variant="tiles" label="Searching 48,219 sessions" />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/loader.json). Each file's content is embedded in the registry JSON.



## Variants

| Variant    | Motion                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `ring`     | A quarter arc that leans into each turn instead of spinning at one speed.                        |
| `dots`     | Three dots that rise and brighten one after another.                                             |
| `bars`     | Four bars that stretch and settle in a travelling wave.                                          |
| `grid`     | A three-by-three grid with a wave that crosses it corner to corner.                              |
| `swap`     | Two dots that trade places on each half turn, one passing in front of the other.                 |
| `ripple`   | Two rings that grow from the center and fade, half a cycle apart.                                |
| `tiles`    | Three tiles on a two-by-two board, each sliding into the gap the last one left.                  |
| `infinity` | A dash that travels a figure eight without lifting.                                              |
| `morph`    | One outline that morphs from a circle into a triangle, a square, and a star, turning as it goes. |
| `stack`    | Three lines of a list that climb a row per cycle; the top one leaves and returns from below.     |
| `tumble`   | A square that hops through a quarter turn and lands flat before the next.                        |
| `line`     | A pill that stretches across a track. It fills its container, so give it a width.                |

## Accessibility

The root has `role="status"`, so screen readers announce its text when the loader appears. Say what is loading with `label` or `aria-label` when "Loading" is too vague.

With reduced motion, the shape holds still and its opacity breathes instead, so the loader still reads as working.

## API reference

| Prop         | Type                                                                                                                              | Default     | Description                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`    | `"ring" \| "dots" \| "bars" \| "grid" \| "swap" \| "ripple" \| "tiles" \| "infinity" \| "morph" \| "stack" \| "tumble" \| "line"` | `"ring"`    | Which animation to show.                                                                                                                                 |
| `size`       | `number`                                                                                                                          | `24`        | Height of the animation in pixels. Every part scales from it. The `line` variant uses a sixth of it for its track height.                                |
| `cycle`      | `number`                                                                                                                          | `1.2`       | Seconds per loop, kept between 0.4 and 2.5. Zero holds a still frame.                                                                                    |
| `label`      | `ReactNode`                                                                                                                       | None        | Visible text beside the animation, or above the track for `line`. It replaces the hidden `aria-label` text.                                              |
| `aria-label` | `string`                                                                                                                          | `"Loading"` | Visually hidden text announced when there is no visible label.                                                                                           |
| `className`  | `string`                                                                                                                          | None        | Additional classes on the root element. The loader draws in `currentColor`, so a text color class recolors it, and a width class sizes the `line` track. |
