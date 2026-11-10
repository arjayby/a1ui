# Task Steps

An ordered list that narrates a long-running job, with status icons that morph in place, a live timer on each step, and logs that open while a step runs.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/task-steps)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/task-steps.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/task-steps.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/task-steps.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/task-steps.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { TaskSteps, type TaskStep } from "@/components/blocks/task-steps";

export function DeployStatus({ steps }: { steps: TaskStep[] }) {
  return <TaskSteps aria-label="Deployment" steps={steps} />;
}

// Pass the same ids on every render and change only what changed.
const steps: TaskStep[] = [
  { id: "install", label: "Install dependencies", status: "done", durationMs: 4200 },
  {
    id: "build",
    label: "Build",
    status: "running",
    detail: "Compiling the app and prerendering its static pages.",
    logs: ["next build", "Creating an optimized production build"],
  },
  { id: "checks", label: "Run checks", status: "pending" },
  { id: "deploy", label: "Deploy", status: "pending" },
];
```


### Source
[Complete source and dependencies](http://localhost:3000/r/task-steps.json). Each file's content is embedded in the registry JSON.



## Behaviour

- **Timing.** The block starts a step's clock when it first sees the step running and stops it when the step is done or failed. To show times from your server instead, pass `startedAt` for a running step and `durationMs` for a finished one.
- **Detail.** A step with `detail` or `logs` opens while it runs and closes when it is done. A failed step stays open so the reason stays on screen. Anyone can open or close a step, and that choice holds until the step changes status. A long log scrolls inside the step and follows its newest line until the reader scrolls up.
- **Jumps.** Status can change by any amount in one render, such as several steps finishing together or a failure part-way through. Every icon, connector and panel springs to its new target from wherever it is, and the changes are read out as one announcement.
- **Progress or Task Steps.** Use [Progress](http://localhost:3000/components/progress) with `variant="steps"` for a single value shown as segments. Use Task Steps when each step has a name, a state and a duration of its own.

## Accessibility

- The steps are an ordered list, and the running step has `aria-current="step"`.
- Each row states its status in words. Failed and skipped rows show the word; the others keep it for screen readers. Colour and icon shape repeat it.
- A step starting, finishing or being skipped is announced politely. A failure is announced assertively. Steps already under way when the block mounts are not announced.
- A step with detail is a disclosure button with `aria-expanded`; Enter and Space toggle it. A closed panel is `inert`. The log can be focused and scrolled with the keyboard, and it does not read each line as it arrives.
- Under `prefers-reduced-motion`, icons cross-fade, the spinner stops turning, the connector fades and panels change height at once. The timer keeps counting, so a running step still reads as running.

## API reference

| Prop             | Type                                                 | Default                | Description                                                                                       |
| ---------------- | ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `steps`          | `TaskStep[]`                                         | Required               | The steps in order. Keep each `id` stable so timing and open state follow the step.               |
| `aria-label`     | `string`                                             | `"Task progress"`      | Names the list. `aria-labelledby` is also supported.                                              |
| `statusLabels`   | `Partial<Record<TaskStepStatus, string>>`            | English status words   | The word for each status, used in rows and in announcements.                                      |
| `formatDuration` | `(milliseconds: number, running: boolean) => string` | `3s`, `4.2s`, `1m 05s` | Formats a time. `running` is true for a live clock, which is passed whole seconds.                |
| `className`      | `string`                                             | None                   | Additional classes on the root element, such as a maximum width. Other `div` props are forwarded. |

### TaskStep

| Field        | Type                                                        | Default  | Description                                                                          |
| ------------ | ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `id`         | `string`                                                    | Required | Stable identity for the step.                                                        |
| `label`      | `string`                                                    | Required | The step's name, also used in announcements.                                         |
| `status`     | `"pending" \| "running" \| "done" \| "failed" \| "skipped"` | Required | The step's current state.                                                            |
| `detail`     | `ReactNode`                                                 | None     | Supporting text in the step's panel.                                                 |
| `logs`       | `string[]`                                                  | None     | Log lines in the step's panel, oldest first.                                         |
| `startedAt`  | `number`                                                    | Measured | When the step started, in epoch milliseconds. Used for the live clock while it runs. |
| `durationMs` | `number`                                                    | Measured | How long the step took, in milliseconds. Shown once the step is done or failed.      |
