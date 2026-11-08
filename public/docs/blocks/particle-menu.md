# Particle Menu

Grainy symbols that scatter around your pointer and spring back into place.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/particle-menu)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/particle-menu.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { ParticleMenu } from "@/components/blocks/particle-menu";

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

| Prop        | Type                 | Default           | Description                                                              |
| ----------- | -------------------- | ----------------- | ------------------------------------------------------------------------ |
| `items`     | `ParticleMenuItem[]` | Required          | Items with a unique `id`, visible `label`, and `shape` (see below).      |
| `ariaLabel` | `string`             | `"Particle menu"` | Accessible name for the navigation.                                      |
| `strength`  | `number`             | `1`               | Particle displacement, clamped between `0` and `2`.                      |
| `radius`    | `number`             | `38`              | Pointer influence in the 120-unit symbol, clamped between `10` and `70`. |
| `className` | `string`             | None              | Layout classes for the navigation container.                             |

### Shapes

| Shape                               | Style                                                     |
| ----------------------------------- | --------------------------------------------------------- |
| `grace`, `runes`, `ashes`, `oaths`  | Grainy sigils filled with fine particles.                 |
| `ring`, `lattice`, `halo`, `spiral` | Bold dot-matrix glyphs built from overlapping round dots. |
