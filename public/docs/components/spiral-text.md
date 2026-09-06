# Spiral Text

Text set on a responsive spiral that tightens under pressure and ripples on release.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Supported baseline: React 19, TypeScript, Tailwind CSS 4. Components use client-side React and browser APIs.

## When to use

- Decorative spiral typography with pointer interaction.

## Limitations

- A decorative text composition, not a reading paragraph or changing-label effect.

## Integration requirements

- Supply text and room for the responsive spiral.

Import paths in examples assume the default @/components/ui alias. Adapt them to the target project's components.json. Put examples with state or callbacks in a client component when using React Server Components.

## Demo

[Interactive preview](http://localhost:3000/components/spiral-text)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/spiral-text.json --yes
```

## Code


### Usage

```tsx
import { SpiralText } from "@/components/ui/spiral-text";

export function Poster() {
  return (
    <SpiralText
      text="THE CONTENT ARCHITECTURE · "
      density={1}
      tightenStrength={0.35}
      rippleDuration={1800}
      rotationSpeed={2}
      className="max-w-2xl"
    />
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/spiral-text.json). Each file's content is embedded in the registry JSON.



## API reference

| Prop              | Type      | Default  | Purpose                                                                                             |
| ----------------- | --------- | -------- | --------------------------------------------------------------------------------------------------- |
| `text`            | `string`  | Required | Repeats along the spiral path and names the graphic for assistive technology.                       |
| `density`         | `number`  | `1`      | Adjusts the number of resting turns between `0.65` and `1.6`.                                       |
| `tightenStrength` | `number`  | `0.35`   | Controls how closely the coils draw together, clamped from `0.08` to `0.7`.                         |
| `rippleDuration`  | `number`  | `1800`   | Sets the outward wave duration in milliseconds, with a `300ms` minimum.                             |
| `rotating`        | `boolean` | `true`   | Rotates the text clockwise. Set to `false` to pause at the current angle.                           |
| `rotationSpeed`   | `number`  | `1`      | Rotations per minute. Higher values spin faster. Non-positive or non-finite values use the default. |
| `className`       | `string`  | None     | Sets layout constraints such as width or placement.                                                 |

The text follows concentric circular rings. Pressing starts gathering the rings immediately, reaching full tension after `450ms`. On release, a circular wave travels outward, swelling and fading each ring before it settles. Outer rings stay gathered until the wave reaches them. Repeated presses carry each ring's current position and velocity into the next motion, so you can interrupt a wave without abruptly stopping it. The interaction responds to mouse, touch, and pen input and stays still when the user requests reduced motion.

The text rotates by default while the dotted background stays fixed. Holding pauses rotation; releasing resumes it. Set `rotating={false}` to pause it independently. Rotation is disabled when the user requests reduced motion.

Use `rotationSpeed` to control the speed. For example, `rotationSpeed={2}` completes two turns per minute, while `rotationSpeed={0.5}` completes one turn every two minutes.

Glyph positions are calculated once per text or density change. Each interactive ring is drawn into a canvas cache after fonts load. The cache refreshes when its size, pixel density, font, or color changes. The Web Animations API transforms and fades these cached pixels without redrawing the text on every frame or press. SVG provides the initial rendering and the static homepage preview. Motion stops while the component is offscreen or the page is hidden.

## Verification

Run the target project's typecheck and build. Render the integrated component and check the browser for missing styles, hydration errors, and failed assets. Exercise its keyboard controls and primary interaction. Report any app data or callbacks still needed; sample data is not a live integration.
