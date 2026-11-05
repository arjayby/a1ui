# Accordion

An accordion whose panels glide open to their natural height, stagger their content in, and turn a chevron or fold a plus into a minus.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/accordion)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/accordion.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/accordion.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/accordion.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/accordion.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/animated/accordion";

export function AccordionExample() {
  return (
    <Accordion defaultValue={["shipping"]} icon="plus">
      <AccordionItem value="shipping">
        <AccordionTrigger>How long does shipping take?</AccordionTrigger>
        <AccordionContent>
          <p>Orders leave our warehouse within one business day.</p>
          <p>Standard delivery takes two to four days.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="returns">
        <AccordionTrigger>Can I return an item?</AccordionTrigger>
        <AccordionContent>
          <p>Send anything back within 30 days for a full refund.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/accordion.json). Each file's content is embedded in the registry JSON.



## API reference

### Accordion

| Prop            | Type                        | Default      | Description                                                                                    |
| --------------- | --------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `value`         | `string[]`                  | Uncontrolled | Open items when controlled by the caller.                                                      |
| `defaultValue`  | `string[]`                  | `[]`         | Items open on first render when uncontrolled. They appear in place without animating.          |
| `onValueChange` | `(value: string[]) => void` | None         | Called with the next open items. Controlled usage requires the caller to update `value`.       |
| `multiple`      | `boolean`                   | `false`      | Lets several items stay open at once. Otherwise opening one item closes the others.            |
| `icon`          | `"chevron" \| "plus"`       | `"chevron"`  | `chevron` turns a caret upside down. `plus` rotates its vertical stroke flat, leaving a minus. |
| `duration`      | `number`                    | `0.3`        | Panel open and close time in seconds. Zero opens instantly and skips the content stagger.      |
| `disabled`      | `boolean`                   | `false`      | Disables every item.                                                                           |
| `className`     | `string`                    | None         | Additional root classes.                                                                       |

### AccordionItem

| Prop        | Type      | Default  | Description                                        |
| ----------- | --------- | -------- | -------------------------------------------------- |
| `value`     | `string`  | Required | Identifies the item in `value` and `defaultValue`. |
| `disabled`  | `boolean` | `false`  | Prevents opening or closing the item.              |
| `className` | `string`  | None     | Additional item classes.                           |

### AccordionTrigger and AccordionContent

| Prop        | Type     | Default | Description                                                                                                   |
| ----------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `className` | `string` | None    | Additional classes on the trigger button, or on the content wrapper whose direct children stagger in on open. |
