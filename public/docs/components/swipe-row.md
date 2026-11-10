# Swipe Row

A list row that swipes either way to reveal actions, with a full swipe that commits the primary one.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/swipe-row)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/swipe-row.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/swipe-row.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/swipe-row.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/swipe-row.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { PushPinIcon, TrashIcon } from "@phosphor-icons/react";

import { SwipeRow, SwipeRowGroup } from "@/components/animated/swipe-row";

export function SwipeRowExample({
  messages,
  onPin,
  onDelete,
}: {
  messages: { id: string; subject: string }[];
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <SwipeRowGroup aria-label="Inbox" className="divide-y">
      {messages.map((message) => (
        <SwipeRow
          key={message.id}
          trailing={[
            {
              label: "Delete",
              icon: <TrashIcon aria-hidden="true" />,
              tone: "destructive",
              removesRow: true,
              onAction: () => onDelete(message.id),
            },
            { label: "Pin", icon: <PushPinIcon aria-hidden="true" />, onAction: () => onPin(message.id) },
          ]}
        >
          <div className="bg-background px-4 py-3">{message.subject}</div>
        </SwipeRow>
      ))}
    </SwipeRowGroup>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/swipe-row.json). Each file's content is embedded in the registry JSON.



## API reference

The first 10 pixels of a drag pick an axis, so a vertical scroll never moves the row. After that the row follows the pointer 1:1 from the point where it was grabbed, and resists with a rubber band once it is past the width of its actions. On release, the pointer's velocity is projected forward to choose between closed and open, and the settle spring starts at that velocity. A row can be caught again while it is still moving.

Dragging across 60% of the row arms a full swipe: the primary action fills the revealed space, the device ticks once where `navigator.vibrate` exists, and releasing commits the action. Moving back before releasing cancels it. A flick can carry the last stretch over the threshold, but only from past the actions, so a short flick opens the row and never commits.

The actions are real buttons in reading order. Tabbing to one reveals its side, and tabbing away hides it. A press outside the row, a tap on its content, a page scroll, or another row opening in the same `SwipeRowGroup` closes it. With reduced motion nothing slides: the actions fade in over the edge of the row and the fade tracks the drag.

### SwipeRow

| Prop           | Type                                   | Default      | Description                                                                      |
| -------------- | -------------------------------------- | ------------ | -------------------------------------------------------------------------------- |
| `leading`      | `readonly SwipeRowAction[]`            | `[]`         | Actions at the left edge, revealed by swiping right. The first one is primary.   |
| `trailing`     | `readonly SwipeRowAction[]`            | `[]`         | Actions at the right edge, revealed by swiping left. The first one is primary.   |
| `fullSwipe`    | `boolean`                              | `true`       | Lets a swipe across most of the row commit the primary action on release.        |
| `open`         | `"leading" \| "trailing" \| null`      | Uncontrolled | The open side. Controlled usage requires updating it in `onOpenChange`.          |
| `defaultOpen`  | `"leading" \| "trailing" \| null`      | `null`       | Initial uncontrolled open side.                                                  |
| `onOpenChange` | `(open: SwipeRowSide \| null) => void` | None         | Called when the row opens a side or closes.                                      |
| `disabled`     | `boolean`                              | `false`      | Ignores swipes and disables the action buttons.                                  |
| `className`    | `string`                               | None         | Additional classes for the row, which clips its content.                         |
| `children`     | `ReactNode`                            | Required     | The row's content. Give it a background if the list sits on a different surface. |

### SwipeRowAction

| Field        | Type                                      | Default     | Description                                                                                                  |
| ------------ | ----------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `label`      | `string`                                  | Required    | Visible label and accessible name of the button.                                                             |
| `icon`       | `ReactNode`                               | None        | Icon shown above the label. Mark it `aria-hidden`.                                                           |
| `tone`       | `"neutral" \| "primary" \| "destructive"` | `"neutral"` | Fill colour of the button.                                                                                   |
| `removesRow` | `boolean`                                 | `false`     | The row leaves in the swipe direction after this action. Unmount the row in `onAction`; a press restores it. |
| `onAction`   | `() => void`                              | Required    | Called when the button is pressed, or when a full swipe commits the primary action.                          |

### SwipeRowGroup

A `div` with `role="list"` that accepts every `div` prop. Rows inside it become list items, and opening one closes the row that was open.
