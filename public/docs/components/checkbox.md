# Checkbox

A checkbox that draws its check, morphs from an indeterminate dash, and can strike through its label.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/checkbox)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/checkbox.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/checkbox.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/checkbox.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/checkbox.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { Checkbox } from "@/components/animated/checkbox";

export function CheckboxExample() {
  return <Checkbox label="Ship the changelog" strikethrough />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/checkbox.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop              | Type                         | Default      | Description                                                                             |
| ----------------- | ---------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `label`           | `ReactNode`                  | None         | Visible label. Clicking it toggles the checkbox.                                        |
| `description`     | `ReactNode`                  | None         | Secondary text under the label, linked with `aria-describedby`.                         |
| `aria-label`      | `string`                     | None         | Accessible name when there is no visible label.                                         |
| `checked`         | `boolean`                    | Uncontrolled | Current state when controlled by the caller.                                            |
| `defaultChecked`  | `boolean`                    | `false`      | Initial state when uncontrolled.                                                        |
| `onCheckedChange` | `(checked: boolean) => void` | None         | Called with the next state. Controlled usage requires the caller to update `checked`.   |
| `indeterminate`   | `boolean`                    | `false`      | Shows a dash for a partially selected group. The caller clears it in `onCheckedChange`. |
| `strikethrough`   | `boolean`                    | `false`      | Draws a line through the label when checked.                                            |
| `duration`        | `number`                     | `0.25`       | Check-mark draw time in seconds. Zero draws it instantly and removes the burst.         |
| `disabled`        | `boolean`                    | `false`      | Prevents toggling.                                                                      |
| `required`        | `boolean`                    | `false`      | Requires the checkbox to be ticked before a form submits.                               |
| `name`            | `string`                     | None         | Field name for form submission.                                                         |
| `value`           | `string`                     | `"on"`       | Value submitted when ticked.                                                            |
| `className`       | `string`                     | None         | Additional classes on the label, or on the box when there is no label.                  |
