# Text Scramble

Reveals new text from left to right through a scramble of random characters.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/text-scramble)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/text-scramble.json --yes
```

## Dependencies

None.

## Code


### Usage

```tsx
"use client";

import { useState } from "react";
import { TextScramble } from "@/components/blocks/text-scramble";

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

| Prop         | Type      | Default                                     | Description                                                                        |
| ------------ | --------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `text`       | `string`  | Required                                    | The final value. Changing it starts a scramble.                                    |
| `duration`   | `number`  | `800`                                       | Total animation time in milliseconds. Zero or negative values resolve immediately. |
| `interval`   | `number`  | `40`                                        | Time between character changes in milliseconds, with a `16ms` minimum.             |
| `characters` | `string`  | `ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/` | Replacement characters. Whitespace is ignored. An empty pool resolves immediately. |
| `disabled`   | `boolean` | `false`                                     | Shows the final text immediately and stops any active animation.                   |
| `className`  | `string`  | None                                        | Styles the outer span. Typography inherits from its parent.                        |
