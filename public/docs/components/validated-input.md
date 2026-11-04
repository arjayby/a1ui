# Validated Input

A labeled text field that checks its value against a Zod schema and animates the error and success states.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/validated-input)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/validated-input.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/validated-input.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/validated-input.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/validated-input.json --yes
```

## Dependencies

- `motion`
- `@phosphor-icons/react`
- `zod`
- `input` (shadcn)
- `label` (shadcn)

## Code


### Usage

```tsx
import { z } from "zod";

import { ValidatedInput } from "@/components/animated/validated-input";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."));

export function ValidatedInputExample() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <ValidatedInput label="Email" name="email" type="email" schema={email} />
      <button type="submit">Subscribe</button>
    </form>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/validated-input.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                           | Default      | Description                                                                                             |
| --------------- | ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------- |
| `label`         | `ReactNode`                    | Required     | Visible label linked to the input.                                                                      |
| `schema`        | `ZodType<unknown, string>`     | Required     | Zod schema that accepts a string, such as `z.email()`. The first issue's message is shown as the error. |
| `description`   | `ReactNode`                    | None         | Hint shown under the field, replaced by the error while it shows.                                       |
| `value`         | `string`                       | Uncontrolled | Current value.                                                                                          |
| `defaultValue`  | `string`                       | `""`         | Initial uncontrolled value.                                                                             |
| `onValueChange` | `(value: string) => void`      | None         | Called with the raw text on every change. Controlled usage requires updating `value`.                   |
| `className`     | `string`                       | None         | Additional root classes.                                                                                |
| Input props     | `ComponentProps<typeof Input>` | None         | Passed to the input, except `value`, `defaultValue`, `onChange`, `ref`, and `children`.                 |
