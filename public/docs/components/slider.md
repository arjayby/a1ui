# Slider

A slider with magnetic stops that catch the thumb and pulse as you slide through them.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/slider)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/slider.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/slider.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/slider.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/slider.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { Slider } from "@/components/animated/slider";

export function SliderExample() {
  return <Slider label="Intensity" stops={[0, 25, 50, 75, 100]} defaultValue={50} snapDistance={3} />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/slider.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop             | Type                        | Default         | Description                                                                                                     |
| ---------------- | --------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `label`          | `string`                    | Required        | Visible label and accessible slider name.                                                                       |
| `stops`          | `readonly number[]`         | `[]`            | Magnetic stops and their visible markers. Values must align with `step`.                                        |
| `showStopLabels` | `boolean`                   | `false`         | Displays numeric labels beneath the stop markers.                                                               |
| `min`            | `number`                    | `0`             | Finite minimum value.                                                                                           |
| `max`            | `number`                    | `100`           | Finite maximum, greater than `min`.                                                                             |
| `step`           | `number`                    | `1`             | Positive finite value increment.                                                                                |
| `snapDistance`   | `number`                    | 3% of the range | Non-negative finite distance in value units at which the thumb catches a stop. Zero catches only exact matches. |
| `value`          | `number`                    | Uncontrolled    | Current value, clamped to the range. Non-finite values use `min`.                                               |
| `defaultValue`   | `number`                    | `min`           | Initial uncontrolled value.                                                                                     |
| `onValueChange`  | `(value: number) => void`   | None            | Called with the selected value, including any magnetic snap. Controlled usage requires updating `value`.        |
| `formatValue`    | `(value: number) => string` | None            | Formats the value readout and accessible value text, such as `0.3 seconds`.                                     |
| `disabled`       | `boolean`                   | `false`         | Prevents pointer, touch, and keyboard changes.                                                                  |
| `name`           | `string`                    | None            | Field name for native form submission.                                                                          |
| `className`      | `string`                    | None            | Additional root classes.                                                                                        |
