# Slider

A slider with magnetic stops that catch the thumb and pulse as you slide through them.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Adjusting values with magnetic catches at meaningful presets or unevenly spaced stops.

## Limitations

- Horizontal single-thumb slider. Feedback is visual and does not vibrate the device. Dense stop labels can overlap.

## Integration requirements

- React 19, Tailwind CSS 4, Motion, Base UI, and theme colors. Supply label and stops. Keyboard input bypasses magnetic snapping. Reduced motion removes animation and preserves snapping.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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



## Stops

The thumb catches the nearest stop within `snapDistance` value units during pointer or touch input. Continue dragging beyond that distance to release it. Values between stops remain selectable. Stops can be unevenly spaced; duplicates, non-finite values, and stops outside the range are ignored.

Stop values and supplied values must align with `step`, relative to `min`. For example, stops at `0.5` and `1.5` require a step such as `0.5`. This keeps the native range input and submitted form value in sync.

Numeric labels beneath the track are hidden by default. `showStopLabels` displays them without changing the stop markers or snapping.

A tiny vertical tick beneath the track marks each stop. The selected tick highlights, and the thumb gives a short pulse. Reduced motion removes the pulse and marker transitions while preserving the catch. The feedback is visual; the component does not vibrate the device.

Arrow keys change the value by `step` without magnetic snapping. Home and End select the range endpoints. Page Up, Page Down, and Shift with an arrow key use Base UI's larger increment of 10 value units.

## API reference

| Prop             | Type                      | Default         | Purpose                                                                                                         |
| ---------------- | ------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `label`          | `string`                  | Required        | Visible label and accessible slider name.                                                                       |
| `stops`          | `readonly number[]`       | `[]`            | Magnetic stops and their visible markers.                                                                       |
| `showStopLabels` | `boolean`                 | `false`         | Displays numeric labels beneath the stop markers.                                                               |
| `min`            | `number`                  | `0`             | Finite minimum value.                                                                                           |
| `max`            | `number`                  | `100`           | Finite maximum, greater than `min`.                                                                             |
| `step`           | `number`                  | `1`             | Positive finite value increment.                                                                                |
| `snapDistance`   | `number`                  | 3% of the range | Non-negative finite distance in value units at which the thumb catches a stop. Zero catches only exact matches. |
| `value`          | `number`                  | Uncontrolled    | Current value, clamped to the range. Non-finite values use `min`.                                               |
| `defaultValue`   | `number`                  | `min`           | Initial uncontrolled value.                                                                                     |
| `onValueChange`  | `(value: number) => void` | None            | Called with the selected value, including any magnetic snap. Controlled usage requires updating `value`.        |
| `disabled`       | `boolean`                 | `false`         | Prevents pointer, touch, and keyboard changes.                                                                  |
| `name`           | `string`                  | None            | Field name for native form submission.                                                                          |
| `className`      | `string`                  | None            | Additional root classes.                                                                                        |



Slider is a horizontal single-thumb control built on Base UI Slider with Motion feedback. Stops are optional numeric values within min and max. Pointer and touch changes catch the nearest stop within snapDistance value units, producing a plateau in the thumb's travel until the pointer leaves the catch distance. This is a visual simulation of a detent, not physical force or device vibration. The thumb pulses on entering a stop, and the corresponding marker highlights. Reduced motion removes pulse animation and marker transitions without changing snapping.

Keyboard and assistive input bypass magnetic snapping so users can select adjacent step values without becoming trapped. Base UI provides the native range input, focus handling, touch support, disabled behavior, and form submission. The visible label is also the accessible name. Supply callbacks and controlled state from a client component. The caller must update value after onValueChange in controlled usage. Invalid range, step, or snapDistance configuration throws. Non-finite current values fall back to min. Duplicate, non-finite, and out-of-range stops are ignored. Stops can be unevenly spaced but must align with step, relative to min, as must caller-supplied values. Dense stop labels can overlap; use a small set of distinct stops.

The demo starts at 50 with stops at 0, 25, 50, 75, and 100 and a catch distance of 3. The Stops control switches between quarters, thirds, and uneven spacing. Catch selects a distance of 1, 3, or 6. Stop labels are hidden by default and can be enabled with the Stop labels switch or the showStopLabels prop. Installation includes one component file and requires React 19, Tailwind CSS 4, Base UI, Motion, and standard theme colors.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
