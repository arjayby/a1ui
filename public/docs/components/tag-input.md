# Tag Input

A text field that collects multiple tags, with a two-step Backspace removal and an optional limit.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/tag-input)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/tag-input.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/tag-input.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/tag-input.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/tag-input.json --yes
```

## Dependencies

- `motion`
- `@phosphor-icons/react`
- `label` (shadcn)

## Code


### Usage

```tsx
import { TagInput } from "@/components/animated/tag-input";

export function TagInputExample() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <TagInput label="Topics" name="topics" max={5} placeholder="Add a topic" defaultValue={["Design"]} />
      <button type="submit">Save</button>
    </form>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/tag-input.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop            | Type                       | Default      | Description                                                                             |
| --------------- | -------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `label`         | `ReactNode`                | Required     | Visible label linked to the text input.                                                 |
| `value`         | `string[]`                 | Uncontrolled | Current tags. Blank and duplicate entries are dropped.                                  |
| `defaultValue`  | `string[]`                 | `[]`         | Initial uncontrolled tags.                                                              |
| `onValueChange` | `(tags: string[]) => void` | None         | Called with the full list after each add or removal. Controlled usage requires `value`. |
| `max`           | `number`                   | None         | Most tags allowed. Shows a count next to the label.                                     |
| `description`   | `ReactNode`                | None         | Hint shown under the field and linked with `aria-describedby`.                          |
| `placeholder`   | `string`                   | None         | Placeholder for the text input, hidden when the field is full.                          |
| `name`          | `string`                   | None         | Field name; each tag is submitted as its own value.                                     |
| `disabled`      | `boolean`                  | `false`      | Prevents adding and removing tags.                                                      |
| `id`            | `string`                   | Generated    | Id of the text input.                                                                   |
| `className`     | `string`                   | None         | Additional root classes.                                                                |
