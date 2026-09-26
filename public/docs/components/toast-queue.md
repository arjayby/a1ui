# Toast Queue

Compact event notifications with animated entry, dismissal, and queue limits.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Event confirmations, publishing feedback, and small app notifications.

## Limitations

- The queue lives in the component that calls the hook; it is not a global provider.

## Integration requirements

- Render ToastQueue with a useToastQueue controller. Requires React, Tailwind CSS 4, and theme tokens. Reduced motion disables entry and exit animation.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/toast-queue)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/toast-queue.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/toast-queue.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/toast-queue.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/toast-queue.json --yes
```

## Code


### Usage

```tsx
"use client";

import { ToastQueue, useToastQueue } from "@/components/ui/toast-queue";

export function SaveFeedback() {
  const queue = useToastQueue({ limit: 3 });

  return (
    <>
      <button
        type="button"
        onClick={() =>
          queue.push({
            tone: "success",
            title: "Changes saved",
            description: "All edits are up to date.",
          })
        }
      >
        Save
      </button>
      <ToastQueue {...queue} />
    </>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/toast-queue.json). Each file's content is embedded in the registry JSON.



## API reference

`useToastQueue({ limit })` returns `toasts`, `announcement`, `push`, `dismiss`, `clear`, and `removeExited`. Pass the returned object to `ToastQueue`. The default limit is 3; a lower limit of 1 applies when `limit` is zero or negative. New messages appear first. Older messages leave when the queue fills.

`push(message)` returns the new toast ID. Messages take `title`, optional `description`, optional `tone` (`"success"`, `"info"`, or `"error"`), and optional `durationMs`. Without `durationMs`, a message stays until dismissed or displaced by the limit. Call `dismiss(id)` for one toast or `clear()` for all. The stack calls `removeExited` after exit animation; the hook also removes exiting toasts on a timer if the animation event does not fire.

`ToastQueue` accepts the controller plus optional `label`, `className`, and `style`. The visual list has an accessible name, each toast has a labeled dismiss button, and a separate polite live region announces new messages. Exit animation hides departing toasts from assistive technology. Reduced motion disables both entry and exit animation and removes dismissed toasts immediately.

The component uses your `--background`, `--foreground`, and `--muted-foreground` theme tokens. Keep the queue near the related action or place it in a stable corner of the app. The hook is scoped to its caller, so put it in a shared client component if several actions should use one queue.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
