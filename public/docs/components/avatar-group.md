# Avatar Group

Overlapping avatars that spring apart on hover, lift with a name label, and fan extra people out of a counting +N chip.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/avatar-group)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/avatar-group.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/avatar-group.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/avatar-group.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/avatar-group.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { Avatar, AvatarGroup } from "@/components/animated/avatar-group";

const members = ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Radia Perlman"];

export function AvatarGroupExample() {
  return (
    <AvatarGroup aria-label="Project members" max={3}>
      {members.map((name) => (
        <Avatar key={name} name={name} />
      ))}
      <Avatar name="Tim Berners-Lee" src="/avatars/tim.png" />
    </AvatarGroup>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/avatar-group.json). Each file's content is embedded in the registry JSON.



## API reference

The avatars overlap until the pointer or keyboard focus enters the group, then spring apart so every face shows. The hovered or focused avatar lifts and shows its name above it. With `max`, the rest collapse into a chip whose number counts up from zero the first time it scrolls into view. Clicking the chip fans the hidden avatars out below the group, and Escape or a click outside folds them back. Reduced motion keeps the spread and the labels but makes every change instant.

### AvatarGroup

| Prop           | Type                      | Default      | Description                                                                           |
| -------------- | ------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| `children`     | `ReactNode`               | None         | `Avatar` elements, in stacking order.                                                 |
| `max`          | `number`                  | None         | Shows at most this many avatars and collapses the rest into a "+N" chip.              |
| `size`         | `"sm" \| "md" \| "lg"`    | `"md"`       | 32, 40, or 48 pixels. Applies to every avatar and the chip.                           |
| `duration`     | `number`                  | `0.3`        | Spread, lift, and fan-out time in seconds. Zero makes every change instant.           |
| `open`         | `boolean`                 | Uncontrolled | Whether the hidden avatars are fanned out, when controlled.                           |
| `defaultOpen`  | `boolean`                 | `false`      | Whether the hidden avatars start fanned out, when uncontrolled.                       |
| `onOpenChange` | `(open: boolean) => void` | None         | Called when the chip, Escape, or an outside click opens or closes the hidden avatars. |
| `aria-label`   | `string`                  | None         | Accessible name for the group, such as "Project members".                             |
| `className`    | `string`                  | None         | Additional root classes.                                                              |

### Avatar

| Prop        | Type                   | Default     | Description                                                                       |
| ----------- | ---------------------- | ----------- | --------------------------------------------------------------------------------- |
| `name`      | `string`               | Required    | Accessible name, hover label, and the source of the initials.                     |
| `src`       | `string`               | None        | Local image path. The coloured initials show until it loads, and if it fails.     |
| `hue`       | `number`               | From `name` | Hue from 0 to 360 for the initials background.                                    |
| `size`      | `"sm" \| "md" \| "lg"` | `"md"`      | Size outside a group. Inside an `AvatarGroup`, the group's size wins.             |
| `duration`  | `number`               | `0.3`       | Lift and label time in seconds outside a group. Inside a group, the group's wins. |
| `className` | `string`               | None        | Additional classes on the focusable avatar.                                       |
