# Dialog

A modal dialog that grows out of the button that opened it and shrinks back into it, over a blurred backdrop.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/dialog)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/dialog.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/dialog.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/dialog.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/dialog.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/animated/dialog";

export function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger>Edit profile</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Changes appear on your public profile right away.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <DialogClose>Save changes</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/dialog.json). Each file's content is embedded in the registry JSON.



## API reference

### Dialog

| Prop           | Type                      | Default      | Description                                                                                      |
| -------------- | ------------------------- | ------------ | ------------------------------------------------------------------------------------------------ |
| `open`         | `boolean`                 | Uncontrolled | Whether the dialog is open when controlled by the caller.                                        |
| `defaultOpen`  | `boolean`                 | `false`      | Whether the dialog starts open when uncontrolled.                                                |
| `onOpenChange` | `(open: boolean) => void` | None         | Called when a trigger, close button, Escape, or outside click asks to change the open state.     |
| `duration`     | `number`                  | `0.35`       | Open time in seconds. Closing takes 70% of it. Zero opens and closes instantly.                  |
| `dismissible`  | `boolean`                 | `true`       | Close when the backdrop is clicked. Escape and close buttons always close.                       |
| `children`     | `ReactNode`               | None         | A `DialogTrigger` and a `DialogContent`. A controlled dialog can leave out the trigger entirely. |

### DialogContent

| Prop              | Type        | Default   | Description                                                                |
| ----------------- | ----------- | --------- | -------------------------------------------------------------------------- |
| `showCloseButton` | `boolean`   | `true`    | Shows a close button in the top-right corner.                              |
| `closeLabel`      | `string`    | `"Close"` | Accessible name for the corner close button.                               |
| `className`       | `string`    | None      | Additional popup classes, such as a wider `sm:max-w-2xl`.                  |
| `children`        | `ReactNode` | None      | Dialog body. Include a `DialogTitle` so the dialog has an accessible name. |

### DialogTrigger and DialogClose

| Prop        | Type           | Default | Description                                                                    |
| ----------- | -------------- | ------- | ------------------------------------------------------------------------------ |
| `render`    | `ReactElement` | None    | Replaces the default outline button with your own element, such as a `Button`. |
| `className` | `string`       | None    | Additional classes. With `render`, these are the only classes added.           |
| `disabled`  | `boolean`      | `false` | Prevents the button from opening or closing the dialog.                        |

### DialogHeader, DialogFooter, DialogTitle, and DialogDescription

| Prop        | Type     | Default | Description                                                                                      |
| ----------- | -------- | ------- | ------------------------------------------------------------------------------------------------ |
| `className` | `string` | None    | Additional classes. The title names the dialog and the description is linked as its description. |
