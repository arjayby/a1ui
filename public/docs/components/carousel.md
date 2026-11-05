# Carousel

A carousel whose slides scale, fade, and drift with the drag, with dots that stretch from one slide to the next.

See [agent setup instructions](http://localhost:3000/llms.txt) before installation. Import paths in examples assume the @/components/animated path; adapt them to the target project's components.json.

## Demo

[Interactive preview](http://localhost:3000/components/carousel)

## Installation

Choose the command for the target project's package manager. Run it from that project's directory.

```text
npm: npx shadcn@latest add http://localhost:3000/r/carousel.json --yes
pnpm: pnpm dlx shadcn@latest add http://localhost:3000/r/carousel.json --yes
yarn: yarn dlx shadcn@latest add http://localhost:3000/r/carousel.json --yes
bun: bunx --bun shadcn@latest add http://localhost:3000/r/carousel.json --yes
```

## Dependencies

- `embla-carousel-react`
- `motion`

## Code


### Usage

```tsx
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/animated/carousel";

const slides = [
  { src: "/images/mist.webp", alt: "A city avenue in morning mist" },
  { src: "/images/station.webp", alt: "Rails curving through a covered station" },
  { src: "/images/ocean.webp", alt: "A whale gliding through deep water" },
];

export function CarouselExample() {
  return (
    <Carousel aria-label="Scenes" parallax={0.12} className="w-full max-w-md">
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem key={slide.src} className="basis-4/5" aria-label={`${index + 1} of ${slides.length}`}>
            <div className="bg-muted aspect-[4/3] overflow-hidden rounded-xl">
              <img
                src={slide.src}
                alt={slide.alt}
                data-carousel-parallax
                className="size-full object-cover"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-4 flex items-center justify-between">
        <CarouselPrevious />
        <CarouselDots />
        <CarouselNext />
      </div>
    </Carousel>
  );
}
```


### Source
[Complete source and dependencies](http://localhost:3000/r/carousel.json). Each file's content is embedded in the registry JSON.



## API reference

### Carousel

| Prop              | Type                         | Default         | Description                                                                                                                        |
| ----------------- | ---------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `aria-label`      | `string`                     | None            | Names the carousel region for assistive technology.                                                                                |
| `opts`            | `CarouselOptions`            | `align: center` | Embla options, such as `align`, `startIndex`, or `slidesToScroll`.                                                                 |
| `plugins`         | `CarouselPlugin`             | None            | Embla plugins, such as autoplay.                                                                                                   |
| `orientation`     | `"horizontal" \| "vertical"` | `"horizontal"`  | Scroll axis. The arrow keys follow it. Give a vertical `CarouselContent` a fixed height.                                           |
| `loop`            | `boolean`                    | `false`         | Wraps from the last slide to the first, so previous and next never disable.                                                        |
| `setApi`          | `(api: CarouselApi) => void` | None            | Receives the Embla API after mount, for listening to `select` or scrolling from outside.                                           |
| `duration`        | `number`                     | `0.5`           | Seconds for button, key, and dot scrolls to settle. Zero jumps. Drags always follow the pointer.                                   |
| `inactiveScale`   | `number`                     | `0.88`          | Scale of slides one snap or more from the current one. `1` turns scaling off.                                                      |
| `inactiveOpacity` | `number`                     | `0.5`           | Opacity of slides one snap or more from the current one. `1` turns fading off.                                                     |
| `parallax`        | `number`                     | `0`             | How far slide content lags behind its slide, from `0` (off) to `0.5`. Mark an image with `data-carousel-parallax` to move only it. |
| `className`       | `string`                     | None            | Additional root classes.                                                                                                           |

### CarouselContent and CarouselItem

| Prop         | Type     | Default | Description                                                                                         |
| ------------ | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `className`  | `string` | None    | On CarouselItem, set the slide width with a basis class such as `basis-4/5`. Full width by default. |
| `aria-label` | `string` | None    | CarouselItem only. Labels the slide, such as "2 of 6".                                              |

### CarouselPrevious and CarouselNext

| Prop         | Type        | Default                            | Description                                                        |
| ------------ | ----------- | ---------------------------------- | ------------------------------------------------------------------ |
| `aria-label` | `string`    | `"Previous slide"`, `"Next slide"` | Accessible name. Buttons disable at the ends unless `loop` is set. |
| `children`   | `ReactNode` | Arrow icon                         | Replaces the arrow.                                                |
| `className`  | `string`    | None                               | Additional classes, such as absolute positioning over the slides.  |

### CarouselDots

| Prop         | Type     | Default          | Description                                                                                    |
| ------------ | -------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `aria-label` | `string` | `"Choose slide"` | Names the group of dots. Each dot is a button labelled "Go to slide n".                        |
| `className`  | `string` | None             | Additional classes. The indicator stretches between dots as the carousel scrolls between them. |
