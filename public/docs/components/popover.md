# Popover

A popover that springs out of its trigger, or morphs the trigger button itself into the panel.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/popover)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/popover.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/popover.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/popover.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/popover.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/animated/popover";

export function SettingsPopover() {
  return (
    <Popover>
      <PopoverTrigger>Settings</PopoverTrigger>
      <PopoverContent side="bottom">
        <PopoverTitle>Display</PopoverTitle>
        <PopoverDescription>Tune how the inbox looks.</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}

export function FeedbackPopover() {
  return (
    <Popover morph>
      <PopoverTrigger>Feedback</PopoverTrigger>
      <PopoverContent align="start">
        <PopoverTitle>Send feedback</PopoverTitle>
        <textarea aria-label="Feedback" />
        <PopoverClose>Cancel</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/popover.json). Each file's content is embedded in the registry JSON.



## API reference

### Popover

| Prop           | Type                      | Default      | Description                                                                                  |
| -------------- | ------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `open`         | `boolean`                 | Uncontrolled | Whether the popover is open when controlled by the caller.                                   |
| `defaultOpen`  | `boolean`                 | `false`      | Whether the popover starts open when uncontrolled.                                           |
| `onOpenChange` | `(open: boolean) => void` | None         | Called with the next state. Controlled usage requires the caller to update `open`.           |
| `morph`        | `boolean`                 | `false`      | The trigger button morphs into the panel, and the content fades in once the shape has grown. |
| `duration`     | `number`                  | `0.3`        | Opening time in seconds. Zero, or reduced motion, opens and closes instantly.                |
| `modal`        | `boolean \| "trap-focus"` | `false`      | `true` locks page scroll and outside clicks. `"trap-focus"` keeps focus inside the panel.    |

### PopoverTrigger

Accepts Base UI trigger props such as `render`, `disabled`, and `openOnHover`. It is unstyled by default, so pass `render` to use your own button. With `morph`, it renders a pill that becomes the panel.

### PopoverContent

| Prop           | Type                                     | Default    | Description                                                                            |
| -------------- | ---------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `side`         | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Side of the trigger to open on. Morph panels grow up for `top` and down otherwise.     |
| `align`        | `"start" \| "center" \| "end"`           | `"center"` | Alignment against the trigger. Morph panels pin this edge of the trigger.              |
| `sideOffset`   | `number`                                 | `8`        | Gap between trigger and panel in pixels. Morph panels cover the trigger and ignore it. |
| `alignOffset`  | `number`                                 | `0`        | Shift along the alignment axis in pixels. Ignored by morph panels.                     |
| `initialFocus` | `boolean \| RefObject \| function`       | `true`     | Element to focus on open. Defaults to the first focusable element in the panel.        |
| `finalFocus`   | `boolean \| RefObject \| function`       | `true`     | Element to focus on close. Defaults to the trigger.                                    |
| `aria-label`   | `string`                                 | None       | Names the panel when it has no PopoverTitle.                                           |
| `className`    | `string`                                 | None       | Additional panel classes. The panel is `w-72` by default.                              |

### PopoverClose, PopoverTitle, and PopoverDescription

`PopoverClose` is a button that closes the popover and accepts `render`. `PopoverTitle` labels the panel and `PopoverDescription` describes it for assistive technology. All three take `className`.
