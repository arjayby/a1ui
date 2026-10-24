# Copy Button

A copy button that animates its icon and label into a checkmark and copied confirmation.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Copying text, links, and code with animated success feedback.

## Limitations

- Copies plain text only. Clipboard access requires HTTPS or localhost and browser permission.

## Integration requirements

- React 19, Tailwind CSS 4, Motion for React, and Phosphor icons. Supply value. Reduced motion skips the transitions.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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

| Prop        | Type                          | Default   | Purpose                                                                                                                                                                                                         |
| ----------- | ----------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`     | `string`                      | Required  | Plain text written to the clipboard.                                                                                                                                                                            |
| `animation` | `"blur" \| "slide" \| "flip"` | `"blur"`  | Transition style for both the icon and label. Blur softens both. Slide rotates the icon and slides the text. Flip rotates both vertically.                                                                      |
| `duration`  | `number`                      | `0.2`     | Transition time in seconds, applied to the icon and label. Zero or negative values switch instantly. Non-finite values use `0.2`. The copied confirmation resets after two seconds, independently of this prop. |
| `disabled`  | `boolean`                     | `false`   | Prevents copying.                                                                                                                                                                                               |
| `className` | `string`                      | None      | Additional classes for the button.                                                                                                                                                                              |



The component uses the shared UI Button at its default size and outline variant. The label sits to the right of the icon, and an invisible sizing label reserves room for "Copied" in both states. The button keeps the same width and position without a hardcoded pixel width. AnimatePresence and motion from motion/react animate both the icon and label using the selected animation. Only the icon and label animate. The button has no width animation or layout transition. Reduced motion skips the icon and label transitions, including blur. The demo shows all three styles with duration set to 0.3 seconds.

Success appears only after navigator.clipboard.writeText resolves. The button prevents repeat clicks during the write and the two-second confirmation. A rejected or unavailable clipboard shows "Couldn't copy. Try again." in a live status region and allows another attempt. Clipboard writes require HTTPS or localhost and browser permission. The component copies plain text only.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
