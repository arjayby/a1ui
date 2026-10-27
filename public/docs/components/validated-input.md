# Validated Input

A labeled text field that checks its value against a Zod schema and animates the error and success states.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Validating emails, usernames, URLs, and other single-line text fields with Zod in native forms.

## Limitations

- Validates one field against a synchronous schema that accepts a string. Shows the first issue only. Cross-field and async checks belong to the caller.

## Integration requirements

- React 19, Tailwind CSS 4, Motion, Phosphor icons, Zod 4, and the shadcn input and label components. Supply label and schema. Controlled usage requires updating value in onValueChange. Reduced motion removes the shake and transitions.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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



## Validation

`schema` is any Zod schema that accepts a string, such as `z.email()`, `z.url()`, or a `z.string()` chain. The field runs `safeParse` on every render and shows the message of the first issue, so the wording comes from the schema. Pipe schemas when a blank field needs its own message, as in the usage example above.

Errors wait until you leave the field after typing in it, so a half-typed address is not flagged. After that, the field checks every keystroke, and the error clears as soon as the value passes. The schema result is also set as the input's native validity, so a surrounding form will not submit while it fails. Submitting reveals the error, focuses the first failing field, and skips the browser's own popup. Native constraints such as `required` still show the browser's report when the schema passes.

The field renders the shadcn `Input` and `Label` from `@/components/ui`. Other input props, such as `type`, `name`, `placeholder`, `autoComplete`, and `disabled`, pass through to the input.

## Motion

The description and the error share one reserved line under the field. When the error appears, the description fades out and the error fades in over it, so the field and everything below it stay in place. A new message blurs in when the error changes. Messages that wrap to more lines than the description still grow the line. A submit that fails shakes the input once. A check mark springs in at the end of the input when a touched value passes. Reduced motion removes the shake and the transitions.

## API reference

| Prop            | Type                           | Default      | Purpose                                                                                 |
| --------------- | ------------------------------ | ------------ | --------------------------------------------------------------------------------------- |
| `label`         | `ReactNode`                    | Required     | Visible label linked to the input.                                                      |
| `schema`        | `ZodType<unknown, string>`     | Required     | Schema the value must pass. The first issue's message is shown as the error.            |
| `description`   | `ReactNode`                    | None         | Hint shown under the field, replaced by the error while it shows.                       |
| `value`         | `string`                       | Uncontrolled | Current value.                                                                          |
| `defaultValue`  | `string`                       | `""`         | Initial uncontrolled value.                                                             |
| `onValueChange` | `(value: string) => void`      | None         | Called with the raw text on every change. Controlled usage requires updating `value`.   |
| `className`     | `string`                       | None         | Additional root classes.                                                                |
| Input props     | `ComponentProps<typeof Input>` | None         | Passed to the input, except `value`, `defaultValue`, `onChange`, `ref`, and `children`. |



ValidatedInput renders a Label and the shadcn Input from @/components/ui, and a message line under the input that always reserves one line of text. The optional description and the error sit in the same line: the description fades out while the error shows, so showing or clearing an error does not shift the layout unless the message wraps to more lines. It runs schema.safeParse on the current text on every render and keeps the first issue's message as the error. The error is hidden until the field is touched: blurring after an edit, or a form submit that fires the input's invalid event. Once touched, the error updates on every change and is replaced by a check mark when the value passes. The error and description are linked with aria-describedby, aria-invalid is set while the error shows, and the error sits in a polite live region.

The schema result is applied with setCustomValidity, so native forms refuse to submit while the schema fails. On the invalid event the component prevents the browser popup, reveals the error, focuses the input when it is the first invalid control in its form, and shakes the input once. If the schema passes but a native constraint such as required or type fails, the browser reports it normally. The schema must be synchronous and accept a string; the component does not run async refinements or cross-field checks. Other input props pass through to the input. Supply callbacks and controlled state from a client component; the caller must update value after onValueChange in controlled usage. Reduced motion removes the shake and transitions.

The demo is a single email field in a form with no submit button, validated by z.string().trim().min(1).pipe(z.email()), with the description We'll never share it. Leaving the field after typing, or pressing Enter to submit the form, shows any error in place of the description; pressing Enter with an invalid value also shakes the field. A valid address shows a check mark. Installation includes one component file and requires React 19, Tailwind CSS 4, Motion, Phosphor icons, Zod 4, the shadcn input and label components, and standard theme colors.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
