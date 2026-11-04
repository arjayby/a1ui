# Switch

A switch whose thumb squashes on press, springs across the track, and can rotate icons in and out.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/switch)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/switch.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/switch.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/switch.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/switch.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { Switch } from "@/components/animated/switch";

export function SwitchExample() {
  return (
    <Switch
      label="Dark mode"
      thumbIcons={{ checked: <MoonIcon weight="fill" />, unchecked: <SunIcon weight="fill" /> }}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/switch.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop              | Type                                           | Default      | Description                                                                           |
| ----------------- | ---------------------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `label`           | `ReactNode`                                    | None         | Visible label. Clicking it toggles the switch.                                        |
| `aria-label`      | `string`                                       | None         | Accessible name when there is no visible label.                                       |
| `checked`         | `boolean`                                      | Uncontrolled | Current state when controlled by the caller.                                          |
| `defaultChecked`  | `boolean`                                      | `false`      | Initial state when uncontrolled.                                                      |
| `onCheckedChange` | `(checked: boolean) => void`                   | None         | Called with the next state. Controlled usage requires the caller to update `checked`. |
| `thumbIcons`      | `{ checked: ReactNode; unchecked: ReactNode }` | None         | Small icons that rotate in and out inside the thumb. Sized to 12 pixels.              |
| `duration`        | `number`                                       | `0.3`        | Thumb travel time in seconds. Zero moves it instantly.                                |
| `disabled`        | `boolean`                                      | `false`      | Prevents toggling.                                                                    |
| `required`        | `boolean`                                      | `false`      | Requires the switch to be on before a form submits.                                   |
| `name`            | `string`                                       | None         | Field name for form submission.                                                       |
| `className`       | `string`                                       | None         | Additional classes on the label, or on the switch when there is no label.             |
