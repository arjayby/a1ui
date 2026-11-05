# Radio Group

A radio group whose single dot slides from option to option, with a card variant whose highlighted border glides between cards.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/radio-group)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/radio-group.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/radio-group.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/radio-group.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/radio-group.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/animated/radio-group";

export function RadioGroupExample() {
  return (
    <RadioGroup aria-label="Plan" name="plan" defaultValue="pro" variant="card">
      <RadioGroupItem value="hobby" label="Hobby" description="One project, community support." />
      <RadioGroupItem value="pro" label="Pro" description="Unlimited projects and previews." />
      <RadioGroupItem value="enterprise" label="Enterprise" description="Talk to sales." disabled />
    </RadioGroup>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/radio-group.json). Each file's content is embedded in the registry JSON.



## API reference

### RadioGroup

| Prop              | Type                      | Default      | Description                                                                                    |
| ----------------- | ------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `value`           | `string \| null`          | Uncontrolled | Selected option when controlled by the caller. `null` clears the selection.                    |
| `defaultValue`    | `string`                  | None         | Initially selected option when uncontrolled.                                                   |
| `onValueChange`   | `(value: string) => void` | None         | Called with the newly selected option. Controlled usage requires the caller to update `value`. |
| `variant`         | `"default" \| "card"`     | `"default"`  | `default` renders compact rows. `card` renders bordered cards with a sliding highlight.        |
| `duration`        | `number`                  | `0.35`       | Travel time of the dot and card highlight in seconds. Zero moves them instantly.               |
| `name`            | `string`                  | None         | Field name for form submission.                                                                |
| `disabled`        | `boolean`                 | `false`      | Prevents selecting any option.                                                                 |
| `required`        | `boolean`                 | `false`      | Requires an option to be chosen before a form submits.                                         |
| `aria-label`      | `string`                  | None         | Names the group when no visible heading labels it.                                             |
| `aria-labelledby` | `string`                  | None         | Points at a visible heading that names the group.                                              |
| `className`       | `string`                  | None         | Additional classes on the group grid.                                                          |

### RadioGroupItem

| Prop          | Type        | Default  | Description                                                            |
| ------------- | ----------- | -------- | ---------------------------------------------------------------------- |
| `value`       | `string`    | Required | Value selected and submitted when this option is chosen.               |
| `label`       | `ReactNode` | None     | Visible label. Clicking it, or anywhere on a card, selects the option. |
| `description` | `ReactNode` | None     | Secondary text under the label, linked with `aria-describedby`.        |
| `aria-label`  | `string`    | None     | Accessible name when there is no visible label.                        |
| `disabled`    | `boolean`   | `false`  | Prevents selecting this option. Arrow keys skip it.                    |
| `className`   | `string`    | None     | Additional classes on the row or card, or on the radio with no label.  |
