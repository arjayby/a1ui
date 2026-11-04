# Copy Button

A copy button that animates its icon and label into a checkmark and copied confirmation.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/copy-button)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/copy-button.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/copy-button.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/copy-button.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/copy-button.json --yes
```

## Dependencies

- `motion`
- `@phosphor-icons/react`
- `button` (shadcn)

## Code


### Usage

```tsx
import { CopyButton } from "@/components/animated/copy-button";

export function CopyButtonExample() {
  return <CopyButton value="hello@a1ui.dev" animation="blur" duration={0.3} />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/copy-button.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop          | Type                          | Default    | Description                                                  |
| ------------- | ----------------------------- | ---------- | ------------------------------------------------------------ |
| `value`       | `string`                      | Required   | Plain text written to the clipboard.                         |
| `label`       | `string`                      | `"Copy"`   | Button text before copying.                                  |
| `copiedLabel` | `string`                      | `"Copied"` | Button text after a successful copy.                         |
| `onCopy`      | `() => void`                  | None       | Called after the clipboard write succeeds.                   |
| `onCopyError` | `() => void`                  | None       | Called when the clipboard is unavailable or the write fails. |
| `animation`   | `"blur" \| "slide" \| "flip"` | `"blur"`   | Transition style for the icon and label.                     |
| `duration`    | `number`                      | `0.2`      | Transition time in seconds. Zero switches instantly.         |
| `disabled`    | `boolean`                     | `false`    | Prevents copying.                                            |
| `className`   | `string`                      | None       | Additional classes for the button.                           |
