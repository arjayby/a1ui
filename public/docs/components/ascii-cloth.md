# ASCII Cloth

A hanging sheet of characters that stretches when dragged, with a word woven into the fabric.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Interactive fabric illustrations for identity, portfolio, and hero sections.

## Limitations

- The woven word is limited to 24 printable ASCII characters on one row.

## Integration requirements

- Requires Canvas 2D, ResizeObserver, and IntersectionObserver. Supply a pause control for motion; reduced motion shows static cloth.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/ascii-cloth)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/ascii-cloth.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/ascii-cloth.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/ascii-cloth.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/ascii-cloth.json --yes
```

## Code


### Usage

```tsx
import { AsciiCloth } from "@/components/ui/ascii-cloth";

export function AsciiClothExample() {
  return <AsciiCloth word="STUDIO" cellSize={15} className="h-96" />;
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/ascii-cloth.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop          | Type            | Default                                  | Purpose                                                                     |
| ------------- | --------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| `word`        | `string`        | `"A1 UI"`                                | Text woven into the middle row of the sheet.                                |
| `cellSize`    | `number`        | `15`                                     | Approximate character spacing in pixels, clamped to 10–24.                  |
| `interactive` | `boolean`       | `true`                                   | Enables pointer and keyboard dragging. False removes the focusable control. |
| `paused`      | `boolean`       | `false`                                  | Freezes the current frame and disables dragging until resumed.              |
| `ariaLabel`   | `string`        | `"ASCII cloth hanging from two corners"` | Accessible description of the illustration.                                 |
| `className`   | `string`        | None                                     | Outer layout classes. The default height is 24rem.                          |
| `style`       | `CSSProperties` | None                                     | Set height, text color, or a loaded monospace font.                         |

The woven word is limited to 24 printable ASCII characters on one row. Longer words are clipped again if the sheet is too narrow. The word shares the cloth's character grid, so it bends and stretches with the other characters.

The default accessible label includes the woven word. Pass `ariaLabel` to provide a different description.

Drag a character to pull the sheet, then release it to watch the spring mesh settle. The top corners stay fixed. For keyboard use, focus the cloth and press Enter or Space to grab the center. Arrow keys pull it one cell at a time. Press Enter, Space, or Escape to release it.

Reduced motion displays a static sheet and disables dragging. The simulation also stops when the component is offscreen, in an inert preview, or in a hidden tab. Set `interactive={false}` for decorative use.

The component uses Canvas 2D, `ResizeObserver`, and `IntersectionObserver`. It inherits text color and the monospace font, with an accessible label in server-rendered HTML. Canvas size and character count are bounded. It has no image assets or graphics library dependency.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
