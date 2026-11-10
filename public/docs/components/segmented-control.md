# Segmented Control

A single-choice control whose thumb you can drag or throw between options, with labels that invert as it passes through them.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/segmented-control)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/segmented-control.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/segmented-control.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/segmented-control.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/segmented-control.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/animated/segmented-control";

const ranges = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year", disabled: true },
] as const;

export function SegmentedControlExample() {
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("week");

  return (
    <SegmentedControl
      aria-label="Range"
      name="range"
      options={ranges}
      value={range}
      onValueChange={setRange}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/segmented-control.json). Each file's content is embedded in the registry JSON.



## API reference

Click an option and the thumb slides to it. Press the thumb and it shrinks; drag and it stays under the point where you grabbed it, across every segment, and resists when pulled past either end. Let go and it lands on the option nearest to where the throw was heading, carrying the pointer's speed into the spring, so a flick overshoots slightly and a slow release does not. The thumb can be caught again while it is still settling. The value changes on release, not while dragging.

The labels are drawn twice. The copy in the thumb's text colour is clipped to the thumb, so a label inverts exactly where the thumb covers it and stays legible at every position.

It is a radio group: one tab stop on the selected option, arrow keys move the selection and wrap past the ends, Home and End jump to the first and last option, and disabled options are skipped by the keyboard and by a drag. For several pressed items at once, or a lighter look with a raised surface, use [Toggle Group](http://localhost:3000/components/toggle-group); to switch panels, use [Tabs](http://localhost:3000/components/tabs).

With reduced motion the thumb does not slide. Each option has its own fill, and the old and new fills cross-fade in place; a drag steps through the options the same way. With increased contrast the track gains an outline and the labels use the foreground colour, and in forced colours the thumb uses the system highlight.

### SegmentedControl

| Prop              | Type                       | Default      | Description                                                                                         |
| ----------------- | -------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `options`         | `SegmentedControlOption[]` | Required     | The choices, in order. Every segment is as wide as the widest label, so nothing shifts on change.   |
| `value`           | `string`                   | Uncontrolled | Selected value. Controlled usage requires updating it in `onValueChange`.                           |
| `defaultValue`    | `string`                   | None         | Initial uncontrolled value. Without one, no option is selected and the thumb fades in on first use. |
| `onValueChange`   | `(value: string) => void`  | None         | Called when a click, a key press, or the end of a drag chooses a different option.                  |
| `size`            | `"sm" \| "md" \| "lg"`     | `"md"`       | Track height: 32, 36 or 44 pixels.                                                                  |
| `name`            | `string`                   | None         | Field name for native form submission.                                                              |
| `disabled`        | `boolean`                  | `false`      | Dims the control and prevents pointer and keyboard changes.                                         |
| `aria-label`      | `string`                   | None         | Accessible name for the group. Give it this or `aria-labelledby`.                                   |
| `aria-labelledby` | `string`                   | None         | ID of a visible heading that names the group.                                                       |
| `className`       | `string`                   | None         | Additional track classes, such as `w-full` to share a container's width equally.                    |

### SegmentedControlOption

| Field        | Type        | Default  | Description                                                              |
| ------------ | ----------- | -------- | ------------------------------------------------------------------------ |
| `value`      | `string`    | Required | Unique value for the option.                                             |
| `label`      | `ReactNode` | Required | Text, an icon, or both. It is rendered twice, so avoid stateful content. |
| `disabled`   | `boolean`   | `false`  | Dims the option and keeps the thumb from landing on it.                  |
| `aria-label` | `string`    | None     | Accessible name, required when the label is only an icon.                |
