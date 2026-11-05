# Toast

Toasts that stack as a deck, fan out on hover, and swipe away, with a loading state that morphs into success.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/toast)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/toast.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/toast.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/toast.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/toast.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
"use client";

import { Toaster, ToastProvider, useToast } from "@/components/animated/toast";

export function App({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <Toaster position="bottom-right" />
    </ToastProvider>
  );
}

export function SaveButton() {
  const toast = useToast();

  return (
    <button
      onClick={() =>
        toast.promise(saveProfile(), {
          loading: "Saving changes",
          success: { title: "Changes saved", description: "Your profile is up to date." },
          error: "Could not save",
        })
      }
    >
      Save
    </button>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/toast.json). Each file's content is embedded in the registry JSON.



## API reference

### ToastProvider

| Prop           | Type           | Default | Description                                                                 |
| -------------- | -------------- | ------- | --------------------------------------------------------------------------- |
| `timeout`      | `number`       | `5000`  | Milliseconds before a toast closes itself. `0` keeps toasts open.           |
| `limit`        | `number`       | `3`     | Toasts kept active at once. Older ones are marked limited and fade out.     |
| `toastManager` | `ToastManager` | None    | A manager from `createToastManager()` for adding toasts from outside React. |
| `children`     | `ReactNode`    | None    | The app, including the components that call `useToast()` and the Toaster.   |

### Toaster

| Prop        | Type            | Default           | Description                                                                                   |
| ----------- | --------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| `position`  | `ToastPosition` | `"bottom-right"`  | `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, or `bottom-right`.     |
| `contained` | `boolean`       | `false`           | Positions the deck inside the nearest positioned ancestor instead of fixing it to the window. |
| `duration`  | `number`        | `0.45`            | Spring time in seconds for entering, stacking, and fanning out. Zero places toasts instantly. |
| `label`     | `string`        | `"Notifications"` | Accessible name for the toast region.                                                         |
| `className` | `string`        | None              | Additional classes on the viewport.                                                           |

### useToast

Returns the Base UI toast manager for the nearest `ToastProvider`. `createToastManager()` returns the same methods for use outside React.

| Member    | Type                                                | Description                                                                                                |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `toasts`  | `ToastObject[]`                                     | Current toasts, newest first.                                                                              |
| `add`     | `(options) => string`                               | Adds a toast and returns its id. Options include `title`, `description`, `type`, `timeout`, `actionProps`. |
| `update`  | `(id, options) => void`                             | Changes a toast in place, such as turning a `loading` toast into `success`.                                |
| `close`   | `(id?) => void`                                     | Closes one toast, or every toast when no id is passed.                                                     |
| `promise` | `(promise, { loading, success, error }) => Promise` | Shows a loading toast that becomes success or error when the promise settles.                              |

Set `type` to `"success"`, `"error"`, or `"loading"` to show an icon. Loading toasts stay open until they are updated, and the spinner closes into a ring as the check or cross draws in. Drag a toast sideways or flick it to dismiss it.
