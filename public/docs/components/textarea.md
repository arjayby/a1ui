# Textarea

A textarea that grows smoothly to fit its text, with a rolling character counter and an error that slides in.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/textarea)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/textarea.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/textarea.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/textarea.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/textarea.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import { Textarea } from "@/components/animated/textarea";

export function TextareaExample() {
  const [message, setMessage] = useState("");

  return (
    <Textarea
      label="Feedback"
      name="feedback"
      description="Press Enter for a new line."
      placeholder="Tell us what you think…"
      value={message}
      onValueChange={setMessage}
      minRows={2}
      maxRows={6}
      maxLength={140}
      showCount
      error={message.length > 0 && message.trim() === "" ? "Write more than spaces." : undefined}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/textarea.json). Each file's content is embedded in the registry JSON.



## API reference

Other textarea attributes, such as `placeholder`, `disabled`, `onBlur`, and `ref`, pass through to the textarea.

| Prop            | Type                      | Default      | Description                                                                         |
| --------------- | ------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `label`         | `ReactNode`               | None         | Visible label, wired to the textarea.                                               |
| `aria-label`    | `string`                  | None         | Accessible name when there is no visible label.                                     |
| `description`   | `ReactNode`               | None         | Hint under the field, linked with `aria-describedby`.                               |
| `error`         | `ReactNode`               | None         | Message that slides in under the field. Sets `aria-invalid` and a destructive edge. |
| `value`         | `string`                  | Uncontrolled | Current text when controlled by the caller.                                         |
| `defaultValue`  | `string`                  | `""`         | Initial text when uncontrolled.                                                     |
| `onValueChange` | `(value: string) => void` | None         | Called with the next text. Controlled usage requires the caller to update `value`.  |
| `minRows`       | `number`                  | `2`          | Smallest height, in rows.                                                           |
| `maxRows`       | `number`                  | `8`          | Tallest height, in rows. Longer text scrolls inside the field.                      |
| `maxLength`     | `number`                  | None         | Native character limit.                                                             |
| `showCount`     | `boolean`                 | `false`      | Shows a rolling counter that shifts colour near the limit. Needs `maxLength`.       |
| `duration`      | `number`                  | `0.25`       | Height spring duration in seconds. Zero resizes instantly.                          |
| `name`          | `string`                  | None         | Field name for form submission.                                                     |
| `required`      | `boolean`                 | `false`      | Requires text before a form submits.                                                |
| `className`     | `string`                  | None         | Additional classes on the outer wrapper.                                            |
