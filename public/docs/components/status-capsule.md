# Status Capsule

A collapsible task summary with a progress ring, file details, and retry states.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Collapsible upload, export, and background-job summaries with per-task state.

## Limitations

- Presentation only. The caller owns jobs, retries, downloads, and consistency between task status and progress.

## Integration requirements

- Requires React 19 and Tailwind CSS 4. Supply tasks with unique IDs, job state, and action callbacks. Reduced motion disables transitions and spinner rotation.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/status-capsule)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/status-capsule.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/status-capsule.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/status-capsule.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/status-capsule.json --yes
```

## Code


### Usage

```tsx
"use client";

import { StatusCapsule, type StatusCapsuleTask } from "@/components/ui/status-capsule";

const tasks: StatusCapsuleTask[] = [
  { id: "thumbnails", label: "thumbnails.svg", detail: "96 KB", status: "success" },
  { id: "tokens", label: "tokens.json", detail: "12 KB", status: "running" },
  { id: "component", label: "component.tsx", detail: "36 KB", status: "ready" },
];

export function ExportStatus() {
  return (
    <StatusCapsule
      title="Exporting files"
      description="1 of 3 files · 48%"
      status="running"
      progress={48}
      tasks={tasks}
      footer="Your export will appear in Downloads."
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/status-capsule.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop               | Type                                                         | Default              | Purpose                                                                                    |
| ------------------ | ------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| `status`           | `"ready" \| "running" \| "success" \| "error"`               | Required             | Overall job state, progress treatment, and announced feedback.                             |
| `tasks`            | `readonly StatusCapsuleTask[]`                               | Required             | Task rows with stable, unique `id`, `label`, and `status`.                                 |
| `title`            | `string`                                                     | State label          | Summary text. Defaults to Ready, In progress, Complete, or Needs attention.                |
| `description`      | `string`                                                     | Completed task count | Secondary summary text.                                                                    |
| `progress`         | `number`                                                     | None                 | Percentage, clamped to 0–100. Omit during a running job for an indeterminate ring.         |
| `action`           | `{ label: string; onClick: () => void; disabled?: boolean }` | None                 | Optional action below the tasks. The caller controls its label, handler, and availability. |
| `footer`           | `ReactNode`                                                  | None                 | Optional note, link, or custom controls below the tasks.                                   |
| `expanded`         | `boolean`                                                    | Uncontrolled         | Controls whether task details are open.                                                    |
| `defaultExpanded`  | `boolean`                                                    | `true`               | Initial open state when uncontrolled.                                                      |
| `onExpandedChange` | `(expanded: boolean) => void`                                | None                 | Receives changes from the trigger or Escape key.                                           |
| `className`        | `string`                                                     | None                 | Outer layout classes.                                                                      |
| `style`            | `CSSProperties`                                              | None                 | Inline styles and component theme tokens.                                                  |

Each task accepts an optional `detail` string and `icon` React node. Task states are independent of the overall job state. Keep both in sync with your job data. Ready tasks show Ready, running tasks show In progress, successful tasks show Complete, and failed tasks show Needs attention.

The component displays data supplied by your application. It does not upload files, run jobs, retry requests, or write downloads. Connect `action.onClick` to your job handler, update `status`, `tasks`, and `progress` from your application, and set `action.disabled` while the action is unavailable. The demo uses a timer to simulate an export and an interrupted connection.

A successful job always shows 100% and a ready job shows 0%. Running jobs without a finite `progress` value show an indeterminate ring. The error state preserves supplied progress and announces Needs attention. Put a useful explanation and a retry action in `footer` and `action`.

The summary button supports Enter and Space. Escape inside the details collapses the capsule and returns focus to the summary. Closed details are hidden from assistive technology and inert, so their controls cannot receive focus. Controlled closing also returns focus when it was inside the details.

The progress ring has a progressbar role and remains accessible while collapsed. A separate polite live region announces title and state changes. Percentage updates do not repeat announcements unless you include them in `title`. Reduced motion disables transitions and spinner rotation.

The expanded capsule grows to 25rem and the collapsed capsule to 20rem, within the available width. Long task names wrap. Colors use your `--background`, `--foreground`, `--muted-foreground`, and `--border` tokens, with neutral fallbacks. You can override `--status-capsule-background`, `--status-capsule-foreground`, `--status-capsule-muted`, `--status-capsule-border`, and `--status-capsule-highlight` through `style`.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
