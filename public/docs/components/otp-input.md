# OTP Input

A one-time code field with 4, 6, or 8 slots, a traveling focus highlight, and characters that rise into place.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Entering numeric or alphanumeric verification, two-factor, and invite codes of 4, 6, or 8 characters.

## Limitations

- Single row of 4, 6, or 8 slots. Edits happen at the end of the code; clicking a filled slot does not move the caret into it. Alphanumeric codes are uppercased.

## Integration requirements

- React 19, Tailwind CSS 4, Motion, and theme colors. Supply a label. Controlled usage requires updating value in onValueChange. Reduced motion removes animation and keeps a static caret.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/otp-input)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/otp-input.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/otp-input.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/otp-input.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/otp-input.json --yes
```

## Code


### Usage

```tsx
import { OtpInput } from "@/components/animated/otp-input";

export function OtpInputExample() {
  return <OtpInput label="Verification code" length={6} onComplete={(code) => console.log(code)} />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/otp-input.json). Each file's content is embedded in the registry JSON.



## Characters

`length` sets 4, 6, or 8 slots. `separator` splits them in half with a dash, or with any text you pass, such as `separator="·"`. Slots are 40 pixels wide and shrink evenly when the container is narrower, so eight slots with a separator fit on a phone. Numeric mode accepts digits only and opens the numeric keypad on touch devices. Alphanumeric mode accepts letters and digits and uppercases letters as they arrive. Other characters are dropped, so pasting `123-456` fills six slots.

One native input sits over the slots. It handles typing, pasting, and SMS autofill through `autocomplete="one-time-code"`, and submits the code with forms through `name`. Editing always happens at the end of the code: Backspace removes the last character, and the highlight moves to the next empty slot.

## Motion

A highlight travels between slots as the code grows or shrinks, and a blinking caret marks the next empty slot. Each character rises into its slot with a short blur. Setting `invalid` turns the borders red and shakes the row once. Setting `success` turns the borders green and sends a small wave across the row. The input keeps focus, and the highlight steps aside so every border shows the same color. Reduced motion removes the travel, wave, and shake and shows a steady caret.

## API reference

| Prop            | Type                          | Default      | Purpose                                                                                    |
| --------------- | ----------------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `label`         | `string`                      | Required     | Accessible name for the code field.                                                        |
| `length`        | `4 \| 6 \| 8`                 | `6`          | Number of slots.                                                                           |
| `separator`     | `boolean \| string`           | `false`      | Splits the slots in half. `true` shows a dash; a string shows that text instead.           |
| `mode`          | `"numeric" \| "alphanumeric"` | `"numeric"`  | Accepted characters. Alphanumeric codes are uppercased.                                    |
| `value`         | `string`                      | Uncontrolled | Current code. Unsupported characters are dropped and extra characters are cut off.         |
| `defaultValue`  | `string`                      | `""`         | Initial uncontrolled code.                                                                 |
| `onValueChange` | `(value: string) => void`     | None         | Called with the filtered code on every change. Controlled usage requires updating `value`. |
| `onComplete`    | `(value: string) => void`     | None         | Called with the full code whenever the last slot is filled.                                |
| `invalid`       | `boolean`                     | `false`      | Sets `aria-invalid`, shows red borders, and shakes the row when it turns on.               |
| `success`       | `boolean`                     | `false`      | Shows green borders, such as after the code is verified.                                   |
| `disabled`      | `boolean`                     | `false`      | Prevents input.                                                                            |
| `name`          | `string`                      | None         | Field name for native form submission.                                                     |
| `className`     | `string`                      | None         | Additional root classes.                                                                   |



OtpInput renders a single transparent native text input over a row of 4, 6, or 8 visual slots built with Motion. The input carries the accessible name from label, autocomplete one-time-code for SMS autofill, inputmode numeric or text, and the form name. Typed, pasted, and autofilled text is filtered to digits in numeric mode or to letters and digits in alphanumeric mode, uppercased, and cut to length. The caret is kept at the end of the code, so edits append or remove the last character. Slots are hidden from assistive technology. The separator prop places a dash, or the given string, between the two halves of the slots; it is decorative and is not part of the value.

While focused, a shared highlight moves to the next empty slot, or the last slot when the code is full, and a blinking caret marks an empty active slot. Characters rise and unblur on entry and lift out on removal. Filling the last slot calls onComplete. The invalid prop sets aria-invalid, uses destructive borders, and shakes the row when it becomes true. The success prop uses success borders on every slot, runs a staggered wave across the slots when it becomes true, and hides the highlight while keeping focus on the input, so the code can still be edited. The component does not verify codes; the caller sets invalid or success after checking. Reduced motion removes all movement and blinking. Lengths other than 4, 6, or 8 throw. Supply callbacks and controlled state from a client component; the caller must update value after onValueChange in controlled usage.

The demo starts with six numeric slots. The Length control selects 4, 6, or 8, Characters switches between numeric and alphanumeric, the Separator switch adds a center dash, and Correct code shows the expected code: the first digits of 12345678 or characters of A1B2C3D4. A complete correct code sets success; a complete wrong code sets invalid. Changing length or characters resets the code. Installation includes one component file and requires React 19, Tailwind CSS 4, Motion, and standard theme colors.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
