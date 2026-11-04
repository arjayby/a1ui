# Password Input

A password field that requires a strong password, with a strength meter that opens its requirements on hover, and a show/hide toggle.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/password-input)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/password-input.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/password-input.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/password-input.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/password-input.json --yes
```

## Dependencies

- `motion`
- `@phosphor-icons/react`
- `@base-ui/react`
- `input` (shadcn)
- `label` (shadcn)

## Code


### Usage

```tsx
import { PasswordInput } from "@/components/animated/password-input";

export function PasswordInputExample() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <PasswordInput label="Password" name="password" />
      <button type="submit">Create account</button>
    </form>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/password-input.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                           | Default                | Purpose                                                                                                                |
| --------------- | ------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `label`         | `ReactNode`                    | Required               | Visible label linked to the input.                                                                                     |
| `rules`         | `PasswordRule[]`               | `defaultPasswordRules` | Requirements, each `{ label, test }`. Every rule must pass. Spread the exported `defaultPasswordRules` to extend them. |
| `description`   | `ReactNode`                    | None                   | Hint shown under the meter.                                                                                            |
| `value`         | `string`                       | Uncontrolled           | Current value.                                                                                                         |
| `defaultValue`  | `string`                       | `""`                   | Initial uncontrolled value.                                                                                            |
| `onValueChange` | `(value: string) => void`      | None                   | Called with the text on every change. Controlled usage requires updating `value`.                                      |
| `autoComplete`  | `string`                       | `"new-password"`       | Autocomplete hint for password managers.                                                                               |
| `className`     | `string`                       | None                   | Additional root classes.                                                                                               |
| Input props     | `ComponentProps<typeof Input>` | None                   | Passed to the input, except `type`, `value`, `defaultValue`, `onChange`, `ref`, and `children`.                        |
