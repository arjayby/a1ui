# Kbd

A keycap that sinks and springs back when its key is pressed, with platform-aware labels and combos that pulse when held.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/kbd)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/kbd.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/kbd.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/kbd.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/kbd.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { Kbd, KbdGroup } from "@/components/animated/kbd";

export function KbdExample() {
  return (
    <div className="flex items-center gap-4">
      {/* ⌘ + K on a Mac, Ctrl + K elsewhere. Each key presses while held. */}
      <KbdGroup keys={["mod", "k"]} listen onComplete={() => console.log("Combo held")} />
      <Kbd listen="Escape" />
      <Kbd>Fn</Kbd>
    </div>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/kbd.json). Each file's content is embedded in the registry JSON.



## API reference

### Kbd

| Prop              | Type                         | Default            | Description                                                                                                    |
| ----------------- | ---------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `listen`          | `string`                     | None               | Key to watch, such as `"k"`, `"Meta"`, `"Shift"`, `"Enter"`, or `"mod"` (⌘ on Mac, Ctrl elsewhere).            |
| `children`        | `ReactNode`                  | Label for `listen` | Visible label. Without it the cap shows the platform label for `listen` with a spoken name for screen readers. |
| `pressed`         | `boolean`                    | Uncontrolled       | Pressed state when controlled by the caller. Keyboard and pointer presses then only call `onPressedChange`.    |
| `onPressedChange` | `(pressed: boolean) => void` | None               | Called when the watched key or a pointer presses or releases the cap.                                          |
| `platform`        | `"mac" \| "other"`           | Detected           | Label set to use. The server renders `"other"` and the client switches after mount.                            |
| `duration`        | `number`                     | `0.3`              | Release spring time in seconds. The press takes about a third of it. Zero moves the cap instantly.             |
| `className`       | `string`                     | None               | Additional classes on the `kbd` element. Other `kbd` attributes pass through.                                  |

### KbdGroup

| Prop         | Type               | Default  | Description                                                                         |
| ------------ | ------------------ | -------- | ----------------------------------------------------------------------------------- |
| `keys`       | `string[]`         | None     | Keys in the combo, such as `["mod", "shift", "p"]`, rendered with platform labels.  |
| `listen`     | `boolean`          | `false`  | Presses each key in `keys` while it is held on the keyboard.                        |
| `children`   | `ReactNode`        | None     | Custom contents, usually `Kbd` elements, used instead of `keys`.                    |
| `separator`  | `ReactNode`        | `"+"`    | Shown between keys from `keys`. Pass `null` for none.                               |
| `onComplete` | `() => void`       | None     | Called each time every key in the group becomes held at once.                       |
| `platform`   | `"mac" \| "other"` | Detected | Label set for every key in the group.                                               |
| `duration`   | `number`           | `0.3`    | Key spring and success pulse time in seconds. Zero shows the pulse as a still glow. |
| `className`  | `string`           | None     | Additional classes on the outer `kbd` element.                                      |
