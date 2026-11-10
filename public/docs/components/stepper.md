# Stepper

A numeric stepper whose value rolls in the direction of each step, repeats faster the longer you hold, and nudges at its limits.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/stepper)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/stepper.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/stepper.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/stepper.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/stepper.json --yes
```

## Dependencies

- `motion`
- `@phosphor-icons/react`

## Code


### Usage

```tsx
import { Stepper } from "@/components/animated/stepper";

export function StepperExample() {
  return <Stepper label="Guests" name="guests" min={1} max={8} defaultValue={2} />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/stepper.json). Each file's content is embedded in the registry JSON.



## API reference

The buttons step on pointer down. Holding one repeats after 0.4 seconds and quickens from 5 to 20 steps a second; releasing, sliding off the button, or losing focus stops it. A step up rolls the value upward and a step down rolls it downward, and a step that lands mid-roll carries on from the position and speed on screen. When two values have the same length, only the digits that change roll.

At `min` or `max` the matching button dims but stays pressable: a press there pushes the value against a rubber band and lets it spring back. The width is reserved from the longest of `min`, `max`, and the values one step inside them, so the control keeps its footprint.

The value is a `spinbutton` and the only tab stop. Arrow Up and Arrow Right add a step, Arrow Down and Arrow Left remove one (the horizontal pair swaps in right-to-left layouts), Page Up and Page Down move by `largeStep`, and Home and End jump to `min` and `max`. With reduced motion, the value cross-fades in place and the nudge is dropped.

| Prop            | Type                        | Default      | Description                                                                                               |
| --------------- | --------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `label`         | `string`                    | Required     | Accessible name of the value. The buttons are named "Decrease" and "Increase" followed by it.             |
| `min`           | `number`                    | `0`          | Finite minimum value.                                                                                     |
| `max`           | `number`                    | `100`        | Finite maximum, greater than `min`.                                                                       |
| `step`          | `number`                    | `1`          | Positive finite increment. Steps land on a grid that starts at `min`.                                     |
| `largeStep`     | `number`                    | `step * 10`  | Positive finite distance for Page Up and Page Down, in value units.                                       |
| `value`         | `number`                    | Uncontrolled | Current value, clamped to the range. Non-finite values use `min`.                                         |
| `defaultValue`  | `number`                    | `min`        | Initial uncontrolled value.                                                                               |
| `onValueChange` | `(value: number) => void`   | None         | Called with each new value, once per repeat while a button is held. Controlled usage must update `value`. |
| `format`        | `(value: number) => string` | None         | Formats the visible value and the accessible value text, such as `$25`.                                   |
| `disabled`      | `boolean`                   | `false`      | Prevents pointer and keyboard changes and leaves the value out of form submission.                        |
| `name`          | `string`                    | None         | Field name for native form submission.                                                                    |
| `className`     | `string`                    | None         | Additional root classes.                                                                                  |
