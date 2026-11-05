# Alert Dialog

A confirmation dialog that springs in, shakes when you click outside it, and fades out before it unmounts.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/alert-dialog)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/alert-dialog.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/alert-dialog.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/alert-dialog.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/alert-dialog.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/animated/alert-dialog";

export function AlertDialogExample() {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete project</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Delete this project?</AlertDialogTitle>
        <AlertDialogDescription>All deployments and preview links will be removed.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => deleteProject()}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/alert-dialog.json). Each file's content is embedded in the registry JSON.



## API reference

### AlertDialog

| Prop           | Type                                    | Default      | Description                                                                                        |
| -------------- | --------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `open`         | `boolean`                               | Uncontrolled | Whether the dialog is open when controlled by the caller.                                          |
| `defaultOpen`  | `boolean`                               | `false`      | Whether the dialog starts open when uncontrolled.                                                  |
| `onOpenChange` | `(open: boolean, eventDetails) => void` | None         | Called on open and close. `eventDetails.reason` says why. Controlled usage must update `open`.     |
| `duration`     | `number`                                | `0.3`        | Open and close time in seconds. Zero, or reduced motion, opens and closes instantly with no shake. |

### AlertDialogTrigger

Renders a `<button>` that opens the dialog. Accepts every Base UI `AlertDialog.Trigger` prop, including `render` to supply your own button.

### AlertDialogContent

| Prop           | Type                               | Default         | Description                                                                                         |
| -------------- | ---------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `initialFocus` | `boolean \| RefObject \| function` | First focusable | Element to focus when the dialog opens. Pass the Cancel button's ref to default to the safe choice. |
| `finalFocus`   | `boolean \| RefObject \| function` | The trigger     | Element to focus when the dialog closes.                                                            |
| `className`    | `string`                           | None            | Additional popup classes, such as a max width.                                                      |

Clicking the backdrop never closes an alert dialog. The popup shakes instead and keeps focus. Escape still closes it.

### AlertDialogTitle, AlertDialogDescription, and AlertDialogFooter

| Prop        | Type        | Default | Description                                                                        |
| ----------- | ----------- | ------- | ---------------------------------------------------------------------------------- |
| `className` | `string`    | None    | Additional classes. The title and description name and describe the `alertdialog`. |
| `children`  | `ReactNode` | None    | Content. The footer stacks buttons on small screens and right-aligns them above.   |

### AlertDialogCancel and AlertDialogAction

Both close the dialog when clicked and accept every Base UI `AlertDialog.Close` prop, such as `onClick` and `disabled`.

| Prop        | Type                         | Default     | Description                                                  |
| ----------- | ---------------------------- | ----------- | ------------------------------------------------------------ |
| `variant`   | `"default" \| "destructive"` | `"default"` | AlertDialogAction only. `destructive` uses the danger color. |
| `className` | `string`                     | None        | Additional button classes.                                   |
