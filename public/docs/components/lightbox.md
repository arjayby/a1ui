# Lightbox

An image viewer whose thumbnail grows to fill the screen and returns to the same thumbnail, with swipe paging, pinch zoom, and drag to dismiss.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/lightbox)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/lightbox.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/lightbox.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/lightbox.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/lightbox.json --yes
```

## Dependencies

- `motion`
- `@base-ui/react`

## Code


### Usage

```tsx
import { Lightbox, LightboxThumbnail, type LightboxImage } from "@/components/animated/lightbox";

const images: LightboxImage[] = [
  {
    src: "/photos/ridge.jpg",
    alt: "Blue ridges at sunrise",
    caption: "First light",
    width: 1800,
    height: 1200,
  },
  { src: "/photos/valley.jpg", alt: "A pine valley at dusk", width: 1200, height: 1800 },
  { src: "/photos/dunes.jpg", alt: "Rose-coloured dunes", width: 1600, height: 1600 },
];

// A grid of every image.
export function LightboxExample() {
  return <Lightbox images={images} />;
}

// Your own layout: place each thumbnail wherever it belongs.
export function LightboxInArticle() {
  return (
    <Lightbox images={images}>
      <LightboxThumbnail index={0} className="aspect-video" />
      <p>Text between the pictures.</p>
      <div className="grid grid-cols-2 gap-2">
        <LightboxThumbnail index={1} />
        <LightboxThumbnail index={2} />
      </div>
    </Lightbox>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/lightbox.json). Each file's content is embedded in the registry JSON.



## Gestures and keys

| Input                                              | Result                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Click or tap a thumbnail                           | The image grows from the thumbnail to its fitted size.                                          |
| Drag up or down                                    | The image follows the pointer and the backdrop fades. Release far or fast enough to dismiss.    |
| Swipe left or right                                | Pages to the neighbouring image. The ends stretch and spring back.                              |
| Pinch, double-click or double-tap                  | Zooms on the point under the fingers or pointer.                                                |
| `Ctrl` or `⌘` with the wheel                       | Zooms on the pointer. A trackpad pinch works the same way. The plain wheel pans a zoomed image. |
| Drag while zoomed                                  | Pans, stretching at the image's edges and coasting after a flick.                               |
| `←` `→` `Home` `End`                               | Previous, next, first and last image.                                                           |
| `+` `-` `0`                                        | Zoom in, zoom out and reset.                                                                    |
| `Esc`, the close button, or a tap beside the image | Closes. Focus returns to the thumbnail of the image that was showing.                           |

## API reference

Opening and closing are one spring between the thumbnail's rectangle and the fitted image, so closing mid-open (or clicking the thumbnail mid-close) turns the image around from where it is. The thumbnail is measured on every frame of that travel: if the page scrolls or reflows, the image still lands on it. After paging, it returns to the thumbnail of the image you ended on.

A drag commits to one direction after 8 pixels: sideways pages, up or down dismisses, and a zoomed image pans instead. Each release hands its velocity to the spring that takes over, and the page or dismissal is chosen from where the momentum would carry the image. Springs are critically damped; only a flicked page overshoots slightly.

With reduced motion the viewer cross-fades in place: nothing travels, pages cross-fade, zoom changes are immediate, and the drag to dismiss fades the viewer instead of moving it. The backdrop and controls turn solid for reduced transparency and increased contrast.

### Lightbox

| Prop            | Type                       | Default               | Description                                                                                                 |
| --------------- | -------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `images`        | `readonly LightboxImage[]` | Required              | The images, in paging order.                                                                                |
| `open`          | `boolean`                  | Uncontrolled          | Whether the viewer is open. Controlled usage requires updating it in `onOpenChange`.                        |
| `defaultOpen`   | `boolean`                  | `false`               | Initial uncontrolled open state.                                                                            |
| `onOpenChange`  | `(open: boolean) => void`  | None                  | Called when a thumbnail, Escape, the close button, a tap beside the image, or a drag asks to open or close. |
| `index`         | `number`                   | Uncontrolled          | The image being shown. Controlled usage requires updating it in `onIndexChange`.                            |
| `defaultIndex`  | `number`                   | `0`                   | Initial uncontrolled image.                                                                                 |
| `onIndexChange` | `(index: number) => void`  | None                  | Called when a thumbnail, swipe, arrow key, or arrow button asks for another image.                          |
| `showArrows`    | `boolean`                  | `true`                | Shows previous and next buttons when there is more than one image.                                          |
| `maxZoom`       | `number`                   | `4`                   | Largest zoom factor. `1` turns zooming off.                                                                 |
| `label`         | `string`                   | `"Image viewer"`      | Accessible name of the viewer dialog.                                                                       |
| `closeLabel`    | `string`                   | `"Close"`             | Accessible name of the close button.                                                                        |
| `previousLabel` | `string`                   | `"Previous image"`    | Accessible name of the previous button.                                                                     |
| `nextLabel`     | `string`                   | `"Next image"`        | Accessible name of the next button.                                                                         |
| `className`     | `string`                   | None                  | Classes for the default thumbnail grid. Ignored when you pass children.                                     |
| `children`      | `ReactNode`                | A grid of every image | Your own layout containing `LightboxThumbnail` elements.                                                    |

### LightboxImage

| Field       | Type        | Default  | Description                                                                                               |
| ----------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `src`       | `string`    | Required | The full image.                                                                                           |
| `alt`       | `string`    | Required | Alternative text for the thumbnail and the open image.                                                    |
| `caption`   | `ReactNode` | None     | Shown under the open image.                                                                               |
| `width`     | `number`    | None     | Intrinsic width in pixels. With `height`, sets the shape before the image loads and caps the fitted size. |
| `height`    | `number`    | None     | Intrinsic height in pixels.                                                                               |
| `thumbnail` | `string`    | `src`    | A smaller source for the thumbnail. It also stands in for the full image while that loads.                |

### LightboxThumbnail

A button that opens the viewer at its image and is the rectangle the image grows from and returns to. It accepts every `button` prop.

| Prop        | Type        | Default                     | Description                                                                             |
| ----------- | ----------- | --------------------------- | --------------------------------------------------------------------------------------- |
| `index`     | `number`    | Required                    | Position of its image in `images`.                                                      |
| `className` | `string`    | None                        | Additional classes, such as an aspect ratio or a corner radius. The image follows both. |
| `children`  | `ReactNode` | The image, cropped to cover | Replaces the thumbnail's content.                                                       |
