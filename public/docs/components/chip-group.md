# Chip Group

Chips that press on their own, popping in with a drawn check.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/chip-group)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/chip-group.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/chip-group.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/chip-group.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/chip-group.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { ChipGroup, ChipGroupItem } from "@/components/animated/chip-group";

export function ChipGroupExample() {
  return (
    <ChipGroup aria-label="Teams" defaultValue={["design"]}>
      <ChipGroupItem value="design">Design</ChipGroupItem>
      <ChipGroupItem value="engineering">Engineering</ChipGroupItem>
      <ChipGroupItem value="sales" disabled>
        Sales
      </ChipGroupItem>
    </ChipGroup>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/chip-group.json). Each file's content is embedded in the registry JSON.



## API reference

### ChipGroup

| Prop            | Type                         | Default        | Description                                                                                  |
| --------------- | ---------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| `value`         | `string[]`                   | Uncontrolled   | Pressed item values when controlled by the caller.                                           |
| `defaultValue`  | `string[]`                   | `[]`           | Initially pressed item values when uncontrolled.                                             |
| `onValueChange` | `(value: string[]) => void`  | None           | Called with the next pressed values. Controlled usage requires the caller to update `value`. |
| `variant`       | `"muted" \| "outline"`       | `"muted"`      | `muted` fills idle chips with the muted colour. `outline` gives them a border.               |
| `duration`      | `number`                     | `0.35`         | Pop time in seconds. Zero presses instantly.                                                 |
| `disabled`      | `boolean`                    | `false`        | Disables every item.                                                                         |
| `orientation`   | `"horizontal" \| "vertical"` | `"horizontal"` | Layout direction and the arrow keys that move focus.                                         |
| `loopFocus`     | `boolean`                    | `true`         | Wraps arrow-key focus from the last item to the first.                                       |
| `aria-label`    | `string`                     | None           | Names the group for assistive technology.                                                    |
| `className`     | `string`                     | None           | Additional root classes.                                                                     |

Every item presses on its own, and the group can end up empty. For a single choice that always keeps one option selected, use [Segmented Control](http://localhost:3000/components/segmented-control).

### ChipGroupItem

| Prop         | Type      | Default  | Description                                                   |
| ------------ | --------- | -------- | ------------------------------------------------------------- |
| `value`      | `string`  | Required | Identifies the item in the group value.                       |
| `disabled`   | `boolean` | `false`  | Prevents pressing the item.                                   |
| `aria-label` | `string`  | None     | Required for icon-only items, which render as square buttons. |
| `className`  | `string`  | None     | Additional item classes.                                      |
