# Text Scramble

Reveals new text from left to right through a scramble of random characters.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Animating changing headings, labels, or status text through scrambled characters.

## Limitations

- The initial text does not animate. Animation starts when the text prop changes.

## Integration requirements

- Update the text prop to animate. Use a monospace font to reduce width shifts.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/text-scramble)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
```

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { TextScramble } from "@/components/ui/text-scramble";

const phrases = ["MAKE IT CLEAR.", "MAKE IT COUNT.", "MAKE IT YOURS."];

export function ScrambleExample() {
  const [index, setIndex] = useState(0);

  const randomizePhrase = () => {
    const offset = 1 + Math.floor(Math.random() * (phrases.length - 1));
    setIndex((current) => (current + offset) % phrases.length);
  };

  return (
    <div className="flex flex-col items-start gap-4">
      <TextScramble text={phrases[index]} duration={800} aria-live="polite" aria-atomic="true" />
      <button type="button" onClick={randomizePhrase}>
        Randomize phrase
      </button>
    </div>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/text-scramble.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop         | Type      | Default                                     | Purpose                                                                            |
| ------------ | --------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `text`       | `string`  | Required                                    | The final value. Changing it starts a scramble.                                    |
| `duration`   | `number`  | `800`                                       | Total animation time in milliseconds. Zero or negative values resolve immediately. |
| `interval`   | `number`  | `40`                                        | Time between character changes in milliseconds, with a `16ms` minimum.             |
| `characters` | `string`  | `ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/` | Replacement characters. Whitespace is ignored. An empty pool resolves immediately. |
| `disabled`   | `boolean` | `false`                                     | Shows the final text immediately and stops any active animation.                   |
| `className`  | `string`  | None                                        | Styles the outer span. Typography inherits from its parent.                        |

Standard span attributes, including `id`, `style`, and `aria-live`, pass through to the outer element.

The initial value renders as plain text, including on the server. Whenever the text changes, the entire phrase scrambles and resolves from left to right, including characters shared with the previous value. Whitespace stays in place. A new value interrupts an active scramble and resolves to the latest text.

Emoji and combining characters stay together in browsers that support `Intl.Segmenter`. Older browsers fall back to Unicode code points. Non-finite timing values use the defaults. Use a monospace font to keep replacement characters from shifting the text width.

Screen readers receive the final text as soon as the prop changes. Animated characters are hidden from the accessibility tree. Add `aria-live="polite"` and `aria-atomic="true"` when changes should be announced. The component does not announce changes by default. Reduced motion skips the animation, including when the preference changes during a scramble.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
