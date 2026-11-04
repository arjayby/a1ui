# ASCII Lens

An image rendered as ASCII, with a circular lens that reveals the original.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/ascii-lens)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/ascii-lens.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/ascii-lens.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/ascii-lens.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/ascii-lens.json --yes
```

## Dependencies

- `clsx`

## Code


### Usage

```tsx
import { AsciiLens } from "@/components/blocks/ascii-lens";

const illustration = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
  <rect width="640" height="480" fill="#d7d2c8" />
  <circle cx="320" cy="240" r="150" fill="#43566c" />
</svg>`;

export function PortfolioCard() {
  return (
    <AsciiLens
      src={`data:image/svg+xml,${encodeURIComponent(illustration)}`}
      alt="Dark circle on a warm background"
      radius={100}
      className="max-w-xl"
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/ascii-lens.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop          | Type            | Default       | Purpose                                                              |
| ------------- | --------------- | ------------- | -------------------------------------------------------------------- |
| `src`         | `string`        | Required      | Image URL. Same-origin URLs work without extra server configuration. |
| `alt`         | `string`        | Required      | Description read by assistive technology.                            |
| `cellSize`    | `number`        | `10`          | Character spacing in CSS pixels, clamped to 6–24.                    |
| `radius`      | `number`        | `92`          | Circular reveal radius in CSS pixels, clamped to 32–240.             |
| `characters`  | `string`        | `".:-=+*#%@"` | Printable ASCII from light to dark, up to 32 characters.             |
| `interactive` | `boolean`       | `true`        | Adds pointer and keyboard lens controls. False renders static ASCII. |
| `className`   | `string`        | None          | Classes for the outer element. Its default aspect ratio is 4:3.      |
| `style`       | `CSSProperties` | None          | Inline size, background, or text color.                              |
