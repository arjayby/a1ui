# Loading Button

A loading button with animated icon and label transitions for async actions and network requests.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Submitting data, saving changes, and running network requests with loading, success, and retry feedback.

## Limitations

- Runs the supplied action on click. Does not submit forms automatically or cancel requests. Success resets after two seconds.

## Integration requirements

- React 19, Tailwind CSS 4, Motion for React, and Phosphor icons. Supply onClick and return its promise. Throw or reject on failure, including non-OK fetch responses. Reduced motion skips transitions and spinner rotation.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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

The button stays busy until `onClick` resolves, then shows a checkmark for two seconds before resetting. A thrown error or rejected promise displays `errorLabel` inside the button and allows another attempt.

The example expects your app to provide `/api/settings`. A `fetch` response with an HTTP error still resolves, so the callback checks `response.ok` and throws on failure.


### Source
[Complete source and dependencies](http://localhost:3000/r/loading-button.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop           | Type                             | Default        | Purpose                                                                                                                   |
| -------------- | -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `onClick`      | `() => void \| Promise<unknown>` | Required       | Action to run. Return the promise so loading lasts until the action finishes. Throw or reject to show an error.           |
| `label`        | `string`                         | `"Submit"`     | Idle label and accessible name.                                                                                           |
| `loadingLabel` | `string`                         | `"Loading..."` | Label and live announcement while the action runs.                                                                        |
| `successLabel` | `string`                         | `"Done"`       | Label and live announcement after success.                                                                                |
| `errorLabel`   | `string`                         | `"Try again"`  | Button label and live announcement after failure.                                                                         |
| `icon`         | `ReactNode`                      | Arrow right    | Idle icon. Loading shows a spinner, and success shows a checkmark.                                                        |
| `animation`    | `"blur" \| "slide" \| "flip"`    | `"slide"`      | Blur, slide, or flip transitions for the icon and label.                                                                  |
| `duration`     | `number`                         | `0.2`          | Transition time in seconds for the icon and label. Zero or negative values switch instantly. Non-finite values use `0.2`. |
| `disabled`     | `boolean`                        | `false`        | Prevents starting the action. The button also disables itself during loading and success.                                 |
| `className`    | `string`                         | None           | Additional classes for the button. Override `w-32` to change its fixed width.                                             |



The component uses the shared UI Button at its default size and outline variant. Its blur, slide, and flip presets animate the icon and label. The button has a fixed width of 8rem and no layout or width animation. Use className to set a different fixed width when custom labels need more space. Reduced motion skips all transitions and spinner rotation. The live demo simulates 1.5-second requests and includes a failing-request example with red error text inside the button. It does not save data.

Supply onClick in a client component and return the action's promise. The button uses type="button" and does not submit a form automatically. Loading lasts until the promise settles. A synchronous lock blocks duplicate activation during loading and the two-second success confirmation. A thrown error or rejection replaces the button label with errorLabel, announces the error in a hidden live status region, and allows retry. Error feedback adds no content outside the button, so its container stays the same size. Success resets to idle after two seconds, independently of duration. Unmounting clears the success reset timer but does not cancel the supplied request.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
