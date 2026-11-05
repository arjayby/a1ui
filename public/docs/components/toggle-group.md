# Toggle Group

A segmented control whose surface slides between items, or chips that pop in with a check when pressed.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/toggle-group)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/toggle-group.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/toggle-group.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/toggle-group.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/toggle-group.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/animated/toggle-group";

export function ToggleGroupExample() {
  return (
    <>
      <ToggleGroup aria-label="View" defaultValue={["list"]}>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="board">Board</ToggleGroupItem>
        <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup multiple variant="outline" aria-label="Teams" defaultValue={["design"]}>
        <ToggleGroupItem value="design">Design</ToggleGroupItem>
        <ToggleGroupItem value="engineering">Engineering</ToggleGroupItem>
        <ToggleGroupItem value="sales" disabled>
          Sales
        </ToggleGroupItem>
      </ToggleGroup>
    </>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/toggle-group.json). Each file's content is embedded in the registry JSON.



## API reference

### ToggleGroup

| Prop            | Type                         | Default        | Description                                                                                          |
| --------------- | ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `value`         | `string[]`                   | Uncontrolled   | Pressed item values when controlled by the caller.                                                   |
| `defaultValue`  | `string[]`                   | `[]`           | Initially pressed item values when uncontrolled.                                                     |
| `onValueChange` | `(value: string[]) => void`  | None           | Called with the next pressed values. Controlled usage requires the caller to update `value`.         |
| `multiple`      | `boolean`                    | `false`        | `false` is a segmented control with a sliding surface. `true` renders chips that press on their own. |
| `variant`       | `"muted" \| "outline"`       | `"muted"`      | `muted` uses a muted track or chips. `outline` uses a bordered track or bordered chips.              |
| `duration`      | `number`                     | `0.35`         | Slide and pop time in seconds. Zero moves and presses instantly.                                     |
| `disabled`      | `boolean`                    | `false`        | Disables every item.                                                                                 |
| `orientation`   | `"horizontal" \| "vertical"` | `"horizontal"` | Layout direction and the arrow keys that move focus.                                                 |
| `loopFocus`     | `boolean`                    | `true`         | Wraps arrow-key focus from the last item to the first.                                               |
| `aria-label`    | `string`                     | None           | Names the group for assistive technology.                                                            |
| `className`     | `string`                     | None           | Additional root classes.                                                                             |

In single mode, clicking the pressed item keeps it pressed, so a segmented control never ends up empty once a value is chosen.

### ToggleGroupItem

| Prop         | Type      | Default  | Description                                                   |
| ------------ | --------- | -------- | ------------------------------------------------------------- |
| `value`      | `string`  | Required | Identifies the item in the group value.                       |
| `disabled`   | `boolean` | `false`  | Prevents pressing the item.                                   |
| `aria-label` | `string`  | None     | Required for icon-only items, which render as square buttons. |
| `className`  | `string`  | None     | Additional item classes.                                      |
