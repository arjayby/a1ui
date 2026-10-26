# Tag Input

A text field that collects multiple tags, with a two-step Backspace removal and an optional limit.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Collecting keywords, topics, skills, labels, or email recipients as a list of short tags in forms.

## Limitations

- Tags are plain trimmed strings added at the end; duplicates are rejected case-insensitively. No suggestions, reordering, or inline editing of existing tags.

## Integration requirements

- React 19, Tailwind CSS 4, Motion, Phosphor icons, the shadcn label component, and theme colors. Supply a label. Controlled usage requires updating value in onValueChange. Reduced motion removes the shake and transitions.

Import paths in examples assume the @/components/animated path. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

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



## Adding and removing

Press Enter or type a comma to turn the text into a tag. Pasting text with commas or line breaks adds each entry as its own tag. Tags are trimmed, empty entries are skipped, and a tag that matches an existing one in any letter case is rejected. An empty Enter is left alone, so it still submits the surrounding form.

Backspace at the start of the text removes tags in two steps. The first press highlights the last tag, and the second press removes it. Typing, any other key, or leaving the field clears the highlight. Each tag also has a remove button. It is skipped by Tab, since Backspace covers keyboard removal, and it keeps focus in the text so you can keep typing.

## Limit

`max` caps the number of tags and shows a count such as `3/5` next to the label. Once the field is full, the text becomes read-only and the placeholder hides. Typing or adding more shakes the field, and Backspace still removes tags. A paste that would go past the limit adds what fits.

With `name`, each tag is submitted as a separate form value, so `formData.getAll("topics")` returns the list.

## Motion

Tags scale in with a short blur and scale out when removed, and the rest of the row slides into place. The highlighted tag turns red before removal. A rejected tag shakes the field. Reduced motion removes the shake and transitions.

## API reference

| Prop            | Type                       | Default      | Purpose                                                                                 |
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



TagInput renders a Label from @/components/ui, a bordered field that wraps a list of tags followed by a native text input, an optional description, and a polite live region. Enter or a comma adds the trimmed text as a tag; pasting text containing commas or newlines adds each entry. Tags are compared case-insensitively and duplicates are rejected. Enter on an empty draft is not prevented, so it submits the surrounding form. Backspace with the caret at the start of the input highlights the last tag (data-highlighted on the tag) on the first press and removes it on the second; any other key, typing, or blur clears the highlight. Each tag has a remove button with aria-label "Remove" followed by the tag text and tabIndex -1 that keeps focus in the input.

The max prop caps the tag count, shows a count next to the label linked through aria-describedby, sets data-full on the root, and makes the input read-only while full. Rejected additions (duplicates or over the limit) shake the field and are announced. With name, each tag renders as a hidden input with that name. Additions, removals, highlights, and rejections are announced in the live region. The component does not offer suggestions, reorder tags, or edit tags in place. Supply callbacks and controlled state from a client component; the caller must update value after onValueChange in controlled usage. Reduced motion removes the shake and transitions.

The demo is a Topics field starting with Design, Motion, and React, a description, and a limit of 5. The Max tags control selects 3, 5, or 8 and trims the list when the limit drops. Installation includes one component file and requires React 19, Tailwind CSS 4, Motion, Phosphor icons, the shadcn label component, and standard theme colors.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
