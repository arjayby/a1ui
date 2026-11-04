# Icon Toggle

A two-state icon button that morphs its SVG paths on every click.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/icon-toggle)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/icon-toggle.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/icon-toggle.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/icon-toggle.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/icon-toggle.json --yes
```

## Dependencies

- `motion`
- `button` (shadcn)

## Code


### Usage

```tsx
import { IconToggle } from "@/components/animated/icon-toggle";

export function IconToggleExample() {
  return <IconToggle label="Dark mode" duration={0.3} />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/icon-toggle.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop              | Type                                     | Default      | Purpose                                                                                                                     |
| ----------------- | ---------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `label`           | `string`                                 | Required     | Stable accessible name. `aria-pressed` announces the current state.                                                         |
| `paths`           | `readonly (readonly [string, string])[]` | Sun and moon | Pairs of unpressed and pressed SVG paths in a `24 × 24` viewBox. Each pair must use the same commands and coordinate count. |
| `pressed`         | `boolean`                                | Uncontrolled | Current state when controlled by the caller.                                                                                |
| `defaultPressed`  | `boolean`                                | `false`      | Initial state when uncontrolled.                                                                                            |
| `onPressedChange` | `(pressed: boolean) => void`             | None         | Called with the next state on activation. Controlled usage requires the caller to update `pressed`.                         |
| `duration`        | `number`                                 | `0.3`        | Morph duration in seconds. Zero switches instantly.                                                                         |
| `disabled`        | `boolean`                                | `false`      | Prevents activation.                                                                                                        |
| `className`       | `string`                                 | None         | Additional button classes.                                                                                                  |
