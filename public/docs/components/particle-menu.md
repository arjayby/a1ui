# Particle Menu

Grainy symbols that scatter around your pointer and spring back into place.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Artistic navigation with interactive particle symbols.

## Limitations

- A specialized visual navigation treatment, not a general dropdown selector.

## Integration requirements

- Supply labeled items with supported shapes and navigation destinations.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/particle-menu)

Four original sigils inspired by Elden Ring mark Grace, Runes, Ashes, and Oaths. Each symbol breaks into particles around the pointer and returns to its original shape when you leave.

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
```

## Code


### Usage

```tsx
import { ParticleMenu } from "@/components/ui/particle-menu";

export function SiteNavigation() {
  return (
    <ParticleMenu
      ariaLabel="Main navigation"
      items={[
        { id: "grace", label: "Grace", shape: "grace", href: "/grace" },
        { id: "runes", label: "Runes", shape: "runes", href: "/runes" },
        { id: "ashes", label: "Ashes", shape: "ashes", href: "/ashes" },
        { id: "oaths", label: "Oaths", shape: "oaths", href: "/oaths" },
      ]}
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/particle-menu.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop        | Type                 | Default           | Purpose                                                                  |
| ----------- | -------------------- | ----------------- | ------------------------------------------------------------------------ |
| `items`     | `ParticleMenuItem[]` | Required          | Items with a unique `id`, visible `label`, and `shape`.                  |
| `ariaLabel` | `string`             | `"Particle menu"` | Accessible name for the navigation.                                      |
| `strength`  | `number`             | `1`               | Particle displacement, clamped between `0` and `2`.                      |
| `radius`    | `number`             | `38`              | Pointer influence in the 120-unit symbol, clamped between `10` and `70`. |
| `className` | `string`             | None              | Layout classes for the navigation container.                             |

Each item accepts `shape: "grace" | "runes" | "ashes" | "oaths"`. Labels and destinations are independent of the symbols, so you can use your own site structure. Provide `href` to render a link, or omit it and provide `onSelect` to render a button. Callbacks must be passed from a Client Component.

Keyboard focus gently opens the symbol and keeps a visible focus outline. Touch input uses the same particle response without blocking page scrolling or requiring a second tap to activate an item. Reduced motion keeps the symbols still. Each animation stops once its particles settle, and pending frames are cancelled on unmount or when the tab is hidden.

The component uses React, SVG, and Tailwind. It needs no animation library or external assets.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
