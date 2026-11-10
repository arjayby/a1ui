# Wheel Picker

A drum-style picker that scrolls natively and selects the option at its centre, with wheels that sit side by side for times and dates.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/wheel-picker)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/wheel-picker.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/wheel-picker.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/wheel-picker.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/wheel-picker.json --yes
```

## Dependencies

None.

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import { WheelPicker, WheelPickerGroup } from "@/components/animated/wheel-picker";

const hours = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1) }));
const minutes = Array.from({ length: 60 }, (_, index) => ({ value: String(index).padStart(2, "0") }));
const periods = [{ value: "AM" }, { value: "PM" }];

export function TimePickerExample() {
  const [hour, setHour] = useState("9");

  return (
    <WheelPickerGroup label="Time" className="w-56 px-2">
      <WheelPicker
        label="Hour"
        name="hour"
        options={hours}
        value={hour}
        onValueChange={setHour}
        className="flex-1"
      />
      <WheelPicker label="Minute" name="minute" options={minutes} defaultValue="41" className="flex-1" />
      <WheelPicker label="AM or PM" name="period" options={periods} className="flex-1" />
    </WheelPickerGroup>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/wheel-picker.json). Each file's content is embedded in the registry JSON.



## Behavior

The wheel is a native scroll container with CSS scroll snap, so touch flicks, trackpads and mouse wheels keep the momentum and snapping of the platform. Each row's rotation and fade is computed from the scroll position on every scroll event; no animation runs on a clock. The value changes the moment an option crosses the centre, and a disabled option passes under the centre without becoming the value or a resting place.

A mouse can drag the wheel. The wheel stays under the point where it was grabbed, stretches with rubber-band resistance past either end, and on release continues at the pointer's speed toward the row the throw was heading for. Clicks, keys and a `value` set from outside move the wheel on a critically damped spring that starts from wherever the wheel is and keeps its speed when the target changes. Any touch, wheel or press takes the wheel back at once. A `value` that changes while someone is scrolling is applied when the scroll comes to rest.

The picker has no animation library and draws no translucent surface. With `prefers-reduced-motion` the rows lie flat and the wheel is positioned instantly instead of on a spring. With `prefers-contrast: more` the fade is removed and the selection band gains a border.

## Accessibility

Each wheel is a `listbox` named by `label`, and its options are `option` elements. The selected option carries `aria-selected` and is the wheel's `aria-activedescendant`. A wheel is one tab stop.

| Key                        | Action                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| `ArrowUp` / `ArrowDown`    | Select the previous or next enabled option.                        |
| `PageUp` / `PageDown`      | Move by one wheel of rows.                                         |
| `Home` / `End`             | Select the first or last enabled option.                           |
| Typing                     | Select the next option that starts with the typed text.            |
| `ArrowLeft` / `ArrowRight` | Inside a `WheelPickerGroup`, move focus to the neighbouring wheel. |

## API reference

### WheelPicker

| Prop            | Type                           | Default              | Description                                                                                            |
| --------------- | ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `label`         | `string`                       | Required             | Accessible name of the wheel, such as "Hour".                                                          |
| `options`       | `readonly WheelPickerOption[]` | Required             | The rows, top to bottom. Values must be unique.                                                        |
| `value`         | `string`                       | Uncontrolled         | Selected value. Changing it scrolls the wheel to that option.                                          |
| `defaultValue`  | `string`                       | First enabled option | Initial uncontrolled value.                                                                            |
| `onValueChange` | `(value: string) => void`      | None                 | Called as each option crosses the centre, and on a click or key. Controlled usage must update `value`. |
| `name`          | `string`                       | None                 | Field name for native form submission.                                                                 |
| `disabled`      | `boolean`                      | `false`              | Prevents pointer, touch and keyboard changes and leaves the field out of form data.                    |
| `haptics`       | `boolean`                      | `true`               | Calls `navigator.vibrate` once per option where the device supports it.                                |
| `visibleCount`  | `number`                       | `5`                  | Rows on show. Odd, at least 3; even numbers round up. Inherited from the group.                        |
| `itemHeight`    | `number`                       | `36`                 | Row height in whole pixels. Inherited from the group.                                                  |
| `className`     | `string`                       | None                 | Additional root classes, such as a width.                                                              |

### WheelPickerOption

| Field       | Type        | Default  | Description                                                       |
| ----------- | ----------- | -------- | ----------------------------------------------------------------- |
| `value`     | `string`    | Required | The value reported and submitted.                                 |
| `label`     | `ReactNode` | `value`  | What the row shows.                                               |
| `textValue` | `string`    | None     | Text matched by typeahead when `label` is not a string.           |
| `disabled`  | `boolean`   | `false`  | Struck through, skipped by scrolling and keys, and not clickable. |

### WheelPickerGroup

Sets wheels side by side under one selection band. Anything else placed inside, such as a colon between two wheels, sits on the band as well.

| Prop           | Type        | Default  | Description                                   |
| -------------- | ----------- | -------- | --------------------------------------------- |
| `label`        | `string`    | Required | Accessible name of the group, such as "Time". |
| `itemHeight`   | `number`    | `36`     | Row height shared by the wheels inside.       |
| `visibleCount` | `number`    | `5`      | Rows on show in the wheels inside.            |
| `className`    | `string`    | None     | Additional classes, such as a width.          |
| `children`     | `ReactNode` | Required | The wheels.                                   |
