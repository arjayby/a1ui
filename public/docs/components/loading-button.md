# Loading Button

A loading button with animated icon and label transitions for async actions and network requests.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/loading-button)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/loading-button.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/loading-button.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/loading-button.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/loading-button.json --yes
```

## Dependencies

- `motion`
- `@phosphor-icons/react`
- `button` (shadcn)

## Code


### Usage

```tsx
"use client";

import { LoadingButton } from "@/components/animated/loading-button";

export function LoadingButtonExample() {
  async function saveChanges() {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications: true }),
    });
    if (!response.ok) throw new Error("Could not save settings");
  }

  return (
    <LoadingButton
      onClick={saveChanges}
      label="Save changes"
      loadingLabel="Saving..."
      successLabel="Saved"
      errorLabel="Try again"
      animation="blur"
      duration={0.3}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/loading-button.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop           | Type                             | Default        | Description                                                                                                     |
| -------------- | -------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `onClick`      | `() => void \| Promise<unknown>` | Required       | Action to run. Return the promise so loading lasts until the action finishes. Throw or reject to show an error. |
| `label`        | `string`                         | `"Submit"`     | Idle label and accessible name.                                                                                 |
| `loadingLabel` | `string`                         | `"Loading..."` | Label and live announcement while the action runs.                                                              |
| `successLabel` | `string`                         | `"Done"`       | Label and live announcement after success.                                                                      |
| `errorLabel`   | `string`                         | `"Try again"`  | Button label and live announcement after failure.                                                               |
| `icon`         | `ReactNode`                      | Arrow right    | Idle icon. Loading shows a spinner, and success shows a checkmark.                                              |
| `animation`    | `"blur" \| "slide" \| "flip"`    | `"slide"`      | Blur, slide, or flip transitions for the icon and label.                                                        |
| `duration`     | `number`                         | `0.2`          | Fade time in seconds; movement settles on a spring of the same length. Zero switches instantly.                 |
| `disabled`     | `boolean`                        | `false`        | Prevents starting the action. The button also disables itself during loading and success.                       |
| `className`    | `string`                         | None           | Additional classes for the button. Override `w-32` to change its fixed width.                                   |
