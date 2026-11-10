# Rolling Number

A number that rolls digit by digit to each new value, up for an increase and down for a decrease, with Intl formatting and an optional delta chip.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/rolling-number)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/rolling-number.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/rolling-number.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/rolling-number.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/rolling-number.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { RollingNumber } from "@/components/animated/rolling-number";

export function Revenue({ total }: { total: number }) {
  return (
    <RollingNumber
      value={total}
      locale="en-US"
      format={{ style: "currency", currency: "USD" }}
      delta
      className="text-4xl font-semibold"
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/rolling-number.json). Each file's content is embedded in the registry JSON.



## Behavior

- Each digit is its own wheel. It rolls up when the value rises and down when it falls, and passes through 0 when it wraps, so 19 to 21 turns the ones wheel forward from 9 to 1.
- A new value in the middle of a roll retargets every wheel from where it is on screen and keeps its speed, so quick changes never restart or jump.
- Digits use tabular figures and keep their place value. Going from 999 to 1,000 opens a new column and separator at their width while the other columns stay where they are.
- The delta chip sits outside the number's box, so it never moves the number. It shows the change with a sign and an arrow, in neutral colors. Style it by direction with `data-direction="up"` or `"down"` on `[data-slot="rolling-number-delta"]`.

## Accessibility

- Screen readers get the formatted value as one piece of text. The rolling columns and the delta chip are hidden from them.
- `announce` turns that text into a polite live region. Leave it off for values that change many times a minute.
- With reduced motion, the digits that changed cross-fade in place and columns appear without sliding.
- Pass `locale` explicitly when rendering on a server, so the server and the browser format the number the same way.

## API reference

| Prop            | Type                       | Default        | Description                                                                                                                                    |
| --------------- | -------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`         | `number`                   | Required       | The number to show. Each change rolls the digits that differ.                                                                                  |
| `locale`        | `string \| string[]`       | Runtime locale | BCP 47 locale tag or tags. Locales with their own numerals roll those glyphs.                                                                  |
| `format`        | `Intl.NumberFormatOptions` | None           | Grouping, decimals, currency, percent, compact notation, and every other `Intl.NumberFormat` option.                                           |
| `delta`         | `boolean`                  | `false`        | Shows a chip with the signed change and an arrow after each update. The chip uses the same format, and skips changes too small for it to show. |
| `deltaDuration` | `number`                   | `2`            | Seconds the delta chip stays before it fades. A new change restarts the wait.                                                                  |
| `announce`      | `boolean`                  | `false`        | Announces each new value through a polite live region.                                                                                         |
| `duration`      | `number`                   | `0.5`          | Roll spring duration in seconds, settling without overshoot. Zero swaps digits instantly.                                                      |
| `className`     | `string`                   | None           | Additional classes on the root element. Set the font size, weight, and color here.                                                             |
