# Orbit Dial

A circular control with radial ticks, a numeric readout, and a native range slider.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Numeric adjustments in creative tools, audio interfaces, and settings panels.

## Limitations

- One numeric value with a linear scale. Values snap to complete steps from the minimum. Long formatted values are truncated.

## Integration requirements

- Supply a label and connect onValueChange for controlled use. Requires React, Tailwind CSS 4, and the background, foreground, border, and muted text theme tokens.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/orbit-dial)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/orbit-dial.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/orbit-dial.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/orbit-dial.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/orbit-dial.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import { OrbitDial } from "@/components/ui/orbit-dial";

export function OrbitDialExample() {
  const [intensity, setIntensity] = useState(64);

  return (
    <OrbitDial
      label="Intensity"
      value={intensity}
      onValueChange={setIntensity}
      unit="%"
      getValueText={(value) => `${value} percent`}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/orbit-dial.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                        | Default                  | Purpose                                                                       |
| --------------- | --------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `label`         | `string`                    | Required                 | Text inside the dial and the slider's accessible name.                        |
| `ariaLabel`     | `string`                    | `label`                  | A longer accessible name when the visible label is abbreviated.               |
| `value`         | `number`                    | None                     | Controlled value. Pair with `onValueChange`.                                  |
| `defaultValue`  | `number`                    | `min`                    | Initial value in uncontrolled mode.                                           |
| `onValueChange` | `(value: number) => void`   | None                     | Runs when an interaction changes the value.                                   |
| `min`           | `number`                    | `0`                      | Lowest allowed value and the starting point for steps.                        |
| `max`           | `number`                    | `100`                    | Upper limit. If it falls between steps, the last complete step is used.       |
| `step`          | `number`                    | `1`                      | Positive increment, including decimals such as `0.1`.                         |
| `disabled`      | `boolean`                   | `false`                  | Disables both the dial and slider.                                            |
| `unit`          | `string`                    | None                     | Suffix beside the readout, such as `%` or `dB`.                               |
| `formatValue`   | `(value: number) => string` | `String`                 | Formats the numeric readout and boundary labels. Keep it short enough to fit. |
| `getValueText`  | `(value: number) => string` | Formatted value and unit | Spoken value for assistive technology, such as `64 percent`.                  |
| `id`            | `string`                    | Generated                | ID of the native range input.                                                 |
| `name`          | `string`                    | None                     | Includes the current value in form submission.                                |
| `className`     | `string`                    | None                     | Outer layout classes. The dial fills its container up to 16rem wide.          |
| `style`         | `CSSProperties`             | None                     | Inline styles and component CSS variables.                                    |

Drag the circular face with a mouse, pen, or touch. The dial stops at either end of its 270-degree arc, including when dragging through the gap at the bottom. The center ignores pointer movement to avoid sudden angle changes.

The slider below the dial provides a straight-line alternative. Focus it and use arrow keys to move one step, or Home and End to jump to the limits. The native input supplies the control's accessible name, value, disabled state, and form value. Clicking the dial also focuses this input.

Values are clamped to the range and rounded to steps relative to `min`. For example, `min={0.1}`, `max={1}`, and `step={0.2}` allow `0.1`, `0.3`, `0.5`, `0.7`, and `0.9`. Equal or reversed limits disable the control at the minimum. Non-finite bounds fall back to `0` and `100`, and a non-positive or non-finite step falls back to `1`. Ranges whose span or step count cannot be represented safely are disabled.

The component uses the project's `--background`, `--foreground`, `--muted-foreground`, and `--border` colors with a monospace font. Override `--orbit-dial-background`, `--orbit-dial-foreground`, `--orbit-dial-muted`, `--orbit-dial-border`, or `--orbit-dial-face` through `style` for a local variation. Values update directly without automatic motion or transition delays.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
