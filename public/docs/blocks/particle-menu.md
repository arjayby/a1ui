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



## Behaviour

- **Scatter.** Each symbol is a field of grains. The pointer pushes the grains within `radius` away from it, and a moving pointer hands them some of its speed, so a swipe carries them along its path. A grain always carries on from where it is, at the speed it has, so changing direction or leaving mid-flight never restarts it.
- **Settling.** Under a resting pointer, a held finger or keyboard focus, the grains settle without overshooting. Only a moving pointer gives them a slight spring. After the pointer leaves they drift home slowly, and the symbol's exact outline is restored.
- **Press.** An item dims the moment the pointer or the Enter key goes down, and fades back on release.
- **Idle.** Nothing runs while every grain is at rest or the tab is hidden.

## Accessibility

- Each item is a native link when it has an `href` and a button otherwise, inside a `nav` named by `ariaLabel`. The symbols are hidden from screen readers, which read the `label`.
- Keyboard focus scatters a symbol from its center, as hovering does, and outlines the item.
- On a touch screen, holding an item scatters its symbol, and lifting the finger lets it return.
- Under `prefers-reduced-motion`, the symbols stay still. Hovering or focusing an item dims it slightly instead, and pressing still dims it. The menu follows the setting as it changes.

## API reference

| Prop         | Type                           | Default           | Description                                                                                                     |
| ------------ | ------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `items`      | `ParticleMenuItem[]`           | Required          | Items with a unique `id`, visible `label`, and `shape` (see below).                                             |
| `ariaLabel`  | `string`                       | `"Particle menu"` | Accessible name for the navigation.                                                                             |
| `strength`   | `number`                       | `1`               | Particle displacement, clamped between `0` and `2`.                                                             |
| `radius`     | `number`                       | `38`              | Pointer influence in the 120-unit symbol, clamped between `10` and `70`.                                        |
| `renderItem` | `(item, control) => ReactNode` | None              | Wraps an item's link or button, for example in a Card Vortex. Render `control` before any other link or button. |
| `className`  | `string`                       | None              | Layout classes for the navigation container.                                                                    |

### Shapes

| Shape                               | Style                                                     |
| ----------------------------------- | --------------------------------------------------------- |
| `grace`, `runes`, `ashes`, `oaths`  | Grainy sigils filled with fine particles.                 |
| `ring`, `lattice`, `halo`, `spiral` | Bold dot-matrix glyphs built from overlapping round dots. |
