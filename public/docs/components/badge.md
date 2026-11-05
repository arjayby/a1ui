# Badge

A badge whose count rolls like an odometer, resizes smoothly, pops in from zero, and can pulse a live status dot.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/badge)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/badge.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/badge.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/badge.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/badge.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { BellIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/animated/badge";

export function NotificationBell({ unread }: { unread: number }) {
  return (
    <span className="relative inline-grid size-10 place-items-center">
      <BellIcon aria-hidden="true" className="size-5" />
      <Badge
        count={unread}
        max={99}
        countLabel="unread notifications"
        className="ring-background absolute -top-1.5 left-6 ring-2"
      />
    </span>
  );
}

export function StreamStatus() {
  return (
    <Badge variant="outline" dot live>
      Live
    </Badge>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/badge.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop         | Type                                                     | Default     | Description                                                                                                 |
| ------------ | -------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `variant`    | `"default" \| "secondary" \| "outline" \| "destructive"` | `"default"` | Color scheme.                                                                                               |
| `children`   | `ReactNode`                                              | None        | Text or icons shown before the count. Icons are sized to 12 pixels.                                         |
| `count`      | `number`                                                 | None        | Whole number that rolls between values: digits slide up as it rises and down as it falls. Negatives show 0. |
| `max`        | `number`                                                 | None        | Largest count shown before the badge reads, for example, `99+`.                                             |
| `showZero`   | `boolean`                                                | `false`     | Keeps the badge visible at zero. Otherwise it pops out at zero and pops back in when the count rises.       |
| `countLabel` | `string`                                                 | None        | Words screen readers hear after the count, such as `unread messages`. Counts use a polite live region.      |
| `dot`        | `boolean`                                                | `false`     | Shows a status dot in the text color before the content.                                                    |
| `live`       | `boolean`                                                | `false`     | Pulses an expanding ring around the dot.                                                                    |
| `duration`   | `number`                                                 | `0.4`       | Roll, resize, and pop spring duration in seconds. Zero swaps digits instantly and stops the pulse.          |
| `className`  | `string`                                                 | None        | Additional classes on the badge, such as absolute positioning over an icon.                                 |
