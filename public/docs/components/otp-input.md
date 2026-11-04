# OTP Input

A one-time code field with 4, 6, or 8 slots, a traveling focus highlight, and characters that rise into place.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

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

## Dependencies

- `motion`

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
