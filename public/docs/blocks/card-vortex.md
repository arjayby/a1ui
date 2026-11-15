# Card Vortex

A ring of link cards that fans out from the center of any element on hover, focus, or tap, each card curving into its place on the ring.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/blocks path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/blocks/card-vortex)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/card-vortex.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/card-vortex.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/card-vortex.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/card-vortex.json --yes
```

## Dependencies

- `motion`

## Code


### Usage

```tsx
import { CardVortex } from "@/components/blocks/card-vortex";

const work = [
  { id: "hades", title: "Hades", href: "/work/hades", image: <img src="/work/hades.jpg" alt="" /> },
  { id: "raus", title: "Raus", href: "/work/raus", image: <img src="/work/raus.jpg" alt="" /> },
  { id: "hiro", title: "Hiro", href: "/work/hiro", image: <img src="/work/hiro.jpg" alt="" /> },
  { id: "dance", title: "Dance", href: "/work/dance", image: <img src="/work/dance.jpg" alt="" /> },
  { id: "every", title: "Every", href: "/work/every", image: <img src="/work/every.jpg" alt="" /> },
  { id: "ona", title: "Ona", href: "/work/ona", image: <img src="/work/ona.jpg" alt="" /> },
];

export function WorkLink() {
  return (
    <CardVortex items={work} ariaLabel="Selected work">
      <a href="/work">Work</a>
    </CardVortex>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/card-vortex.json). Each file's content is embedded in the registry JSON.



## Behaviour

- **Trigger.** The children are the trigger, and they can be any element: a logo, a nav label, a button. The ring is centered on them and laid over the page, so it takes no space in the layout.
- **Motion.** Each card animates on its own. It starts at the trigger's center, heads out 45 degrees clockwise of its final position, so the top card sets off toward the top right, and curves round into place while it grows from a single pixel to full size and fades from transparent to opaque. Cards enter in turn, stay upright and settle without overshooting. They shrink back to a pixel and fade out at the center the same way in reverse order. Moving the pointer back before they finish turns each card round at once from where it is, without waiting for its turn.
- **Staying open.** The ring stays open while the pointer is on the trigger, on a card, or anywhere inside the ring, and closes shortly after it leaves. A click or tap in the space between the cards closes it.
- **Fitting.** The ring fits inside the viewport. If the trigger is too close to an edge, such as a link in a header, the ring moves away from that edge and the cards curve out to it from the trigger. If the viewport is too small for the full ring, the ring and its cards also scale down, but never below 75%, so the titles stay readable. Put `data-card-vortex-boundary` on an ancestor to fit the ring inside that element instead.
- **Images.** `image` fills a frame as wide as the card and `--card-vortex-image-height` (`5rem`) tall. Give an `<img>` the classes `size-full object-cover`, or use your framework's image component with `fill`.

## Accessibility

- The cards are ordinary links inside a `nav` named by `ariaLabel`. While the ring is closed they are hidden from the keyboard and from screen readers.
- Focusing the trigger with the keyboard opens the ring, and Tab then moves through the cards in order. Escape closes it and returns focus to the trigger. Use a button or a link as the trigger so it can be focused.
- The trigger's button or link gets `aria-expanded` and `aria-controls` pointing at the cards' `nav`.
- On a touch screen, a tap on the trigger opens the ring and a tap outside the cards closes it. If the trigger is a link, the first tap opens the ring and a second tap follows the link.
- Under `prefers-reduced-motion`, the cards fade in at their final positions with no sliding or scaling.

## API reference

| Prop           | Type                      | Default           | Description                                                                                                                                   |
| -------------- | ------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`     | `ReactNode`               | Required          | The trigger element.                                                                                                                          |
| `items`        | `CardVortexItem[]`        | Required          | Cards in clockwise order. An empty array renders only the trigger.                                                                            |
| `radius`       | `number`                  | `165`             | Distance from the trigger's center to each card's center, in pixels.                                                                          |
| `startAngle`   | `number`                  | `-90`             | Angle of the first card in degrees. `-90` is straight up.                                                                                     |
| `fromAngle`    | `number`                  | `45`              | The direction each card first heads in, in degrees clockwise of its final position. Negative curves the other way.                            |
| `open`         | `boolean`                 | Uncontrolled      | Controls the ring. Pair it with `onOpenChange`.                                                                                               |
| `onOpenChange` | `(open: boolean) => void` | None              | Called when hover, focus, a tap or Escape asks the ring to open or close.                                                                     |
| `ariaLabel`    | `string`                  | `"Related pages"` | Accessible name for the cards' `nav`.                                                                                                         |
| `className`    | `string`                  | None              | Additional classes on the wrapper around the trigger.                                                                                         |
| `style`        | `CSSProperties`           | None              | Overrides the CSS variables, such as `--card-vortex-card-width` (`9.5rem`), `--card-vortex-image-height` (`5rem`) and `--card-vortex-shadow`. |

### CardVortexItem

| Field    | Type        | Default  | Description                                |
| -------- | ----------- | -------- | ------------------------------------------ |
| `id`     | `string`    | Required | Stable identity for the card.              |
| `title`  | `string`    | Required | The card's label and the link's name.      |
| `href`   | `string`    | Required | Where the card goes.                       |
| `image`  | `ReactNode` | None     | Artwork that fills the card's image frame. |
| `target` | `string`    | None     | The link's `target`, such as `"_blank"`.   |
| `rel`    | `string`    | None     | The link's `rel`.                          |
