# Reorder List

A list whose rows lift, follow the pointer, and spring apart to open the gap where the row will land.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/reorder-list)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/reorder-list.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/reorder-list.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/reorder-list.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/reorder-list.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
"use client";

import { useState } from "react";

import { ReorderList, ReorderListHandle, ReorderListItem } from "@/components/animated/reorder-list";

const initial = [
  { id: "brief", title: "Write the launch brief" },
  { id: "pricing", title: "Review the pricing page" },
  { id: "changelog", title: "Publish the changelog" },
];

export function ReorderListExample() {
  const [tasks, setTasks] = useState(initial);

  return (
    <ReorderList label="Tasks" items={tasks} onReorder={setTasks} getLabel={(task) => task.title}>
      {(task) => (
        <ReorderListItem>
          <span className="flex-1 py-3">{task.title}</span>
          <ReorderListHandle />
        </ReorderListItem>
      )}
    </ReorderList>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/reorder-list.json). Each file's content is embedded in the registry JSON.



## API reference

A row lifts the moment it is pressed and stays under the point where it was grabbed. The other rows spring apart to open a gap, and that gap is where the row lands. On release the row settles into the gap at the speed it was let go, with a slight overshoot only after a flick. A settling row can be caught again, and the other rows retarget from wherever they are. Dragging past either end of the list stretches with rubber-band resistance, and holding the row near the edge of a scroll container scrolls it. Rows can have different heights. Escape cancels a drag.

`onReorder` is called once per drop, not on every move. While a row is held, the order is only previewed.

Without a `ReorderListHandle` the whole row drags. A mouse starts the drag after 6 pixels of vertical travel, so clicks still work and dragging sideways selects text. A finger lifts the row after a short hold, so the list still scrolls. Links, buttons, and form fields inside a row never start a drag; add `data-reorder-ignore` to exclude anything else.

Focus a handle, or the row when it has no handle, then press Space to pick it up, the arrow keys (or Home and End) to move it, Space to drop it, and Escape to put it back. Moving focus away drops the row where it is. A live region announces each step with the row's position.

With reduced motion, the dragged row still follows the pointer, and every other move becomes a short fade in place with no travel, scale, or overshoot.

### ReorderList

| Prop           | Type                                                       | Default          | Description                                                                                            |
| -------------- | ---------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------ |
| `label`        | `string`                                                   | Required         | Accessible name of the list.                                                                           |
| `items`        | `readonly T[]`                                             | Uncontrolled     | Controlled order. Update it in `onReorder`; if you do not, the rows spring back.                       |
| `defaultItems` | `readonly T[]`                                             | `[]`             | Initial order when uncontrolled.                                                                       |
| `onReorder`    | `(items: T[], move: { from: number; to: number }) => void` | None             | Called once per drop that changes the order, with the new array and the indexes the row moved between. |
| `getKey`       | `(item: T) => string`                                      | Item or `id`     | Stable, unique identity of an item. Defaults to the item itself for strings and numbers, or its `id`.  |
| `getLabel`     | `(item: T) => string`                                      | Item or "Item N" | Name used in announcements and in each handle's accessible name.                                       |
| `children`     | `(item: T, index: number) => ReactNode`                    | Required         | Renders one row. Return a `ReorderListItem`.                                                           |
| `disabled`     | `boolean`                                                  | `false`          | Prevents pointer and keyboard reordering.                                                              |
| `className`    | `string`                                                   | None             | Additional classes for the root. Add a maximum height and `overflow-y-auto` here to make it scroll.    |

### ReorderListItem

| Prop        | Type        | Default  | Description                                                     |
| ----------- | ----------- | -------- | --------------------------------------------------------------- |
| `children`  | `ReactNode` | Required | Row content. Include a `ReorderListHandle` to drag by it alone. |
| `className` | `string`    | None     | Additional row classes.                                         |

### ReorderListHandle

| Prop         | Type        | Default                 | Description                    |
| ------------ | ----------- | ----------------------- | ------------------------------ |
| `aria-label` | `string`    | "Reorder" and the label | Accessible name of the handle. |
| `children`   | `ReactNode` | Grip icon               | Replaces the icon.             |
| `className`  | `string`    | None                    | Additional handle classes.     |
