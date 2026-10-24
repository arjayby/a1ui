# Icon Toggle

A two-state icon button that morphs its SVG paths on every click.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Icon toggles with a reversible morph between two states, such as menu and close or play and pause.

## Limitations

- Custom path pairs must use matching SVG commands and coordinate counts in a 24 by 24 viewBox. Uses rounded strokes with no fill. Does not morph arbitrary React icon components.

## Integration requirements

- React 19, Tailwind CSS 4, Motion for React, and the shared UI Button. Supply a stable accessible label. Controlled usage requires updating pressed in onPressedChange. Reduced motion switches paths instantly.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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



## Custom icons

The `paths` prop contains pairs of SVG path strings. Each pair describes one stroke in the first and second icons within a `24 × 24` viewBox. Matching paths must use the same commands in the same order, with the same number of coordinates. A collapsed stroke can disappear into another stroke.

This example morphs a plus into a minus:

```tsx
import { IconToggle } from "@/components/animated/icon-toggle";

export function DetailsToggle() {
  return (
    <IconToggle
      label="Toggle details"
      paths={[
        ["M5 12 L19 12", "M5 12 L19 12"],
        ["M12 5 L12 19", "M5 12 L19 12"],
      ]}
    />
  );
}
```

## API reference

| Prop              | Type                                     | Default      | Purpose                                                                                             |
| ----------------- | ---------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `label`           | `string`                                 | Required     | Stable accessible name. `aria-pressed` announces the current state.                                 |
| `paths`           | `readonly (readonly [string, string])[]` | Sun and moon | Pairs of unpressed and pressed SVG paths with matching commands. Uses rounded strokes with no fill. |
| `pressed`         | `boolean`                                | Uncontrolled | Current state when controlled by the caller.                                                        |
| `defaultPressed`  | `boolean`                                | `false`      | Initial state when uncontrolled.                                                                    |
| `onPressedChange` | `(pressed: boolean) => void`             | None         | Called with the next state on activation. Controlled usage requires the caller to update `pressed`. |
| `duration`        | `number`                                 | `0.3`        | Morph duration in seconds. Zero or negative values switch instantly. Non-finite values use `0.3`.   |
| `disabled`        | `boolean`                                | `false`      | Prevents activation.                                                                                |
| `className`       | `string`                                 | None         | Additional button classes.                                                                          |



IconToggle uses the shared UI Button with the outline variant and icon size. Motion animates the d attribute of persistent SVG paths in a 24 by 24 viewBox. Each click toggles between two icons, and the next click reverses the morph. Rapid clicks retarget the animation from its current shape. The button stays the same size and does not submit forms. Native button behavior supports Enter and Space. A stable required label and aria-pressed expose the toggle to assistive technology. Reduced motion switches paths instantly.

The default icon pair is sun and moon. The contours come from the installed Phosphor SunIcon and MoonIcon, converted to matching cubic SVG paths. The sun's circle becomes a crescent as its rays retract onto the moon's outline. The demo represents light and dark modes without changing the site's theme. Connect onPressedChange to the app's theme state when using this as a theme toggle.

Custom paths are pairs of unpressed and pressed path strings. Each pair must have the same SVG commands, command order, and coordinate count. Arbitrary React icon components and incompatible SVG paths are not supported. Strokes use currentColor with no fill. Supply callbacks and controlled state from a client component. The demo has one button, an icon-pair selector for sun and moon, menu and close, play and pause, or plus and minus, and a duration control initially set to 0.3 seconds. The initial pair is sun and moon. Changing a control resets the preview.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
