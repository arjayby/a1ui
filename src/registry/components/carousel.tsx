"use client";

import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";

export type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
export type CarouselOptions = NonNullable<UseCarouselParameters[0]>;
export type CarouselPlugin = NonNullable<UseCarouselParameters[1]>;
type EmblaApi = NonNullable<CarouselApi>;

type Orientation = "horizontal" | "vertical";

type CarouselContextValue = {
  setViewport: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi;
  orientation: Orientation;
  reducedMotion: boolean;
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  parallax: number;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarousel(part: string) {
  const context = useContext(CarouselContext);
  if (!context) throw new Error(`${part} must be used within Carousel.`);
  return context;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const finiteOr = (value: number | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Where the scroll position sits between two snaps, in Embla's 0–1 scroll progress.
 * `t` runs from 0 at `from` to 1 at `to`; `to` wraps to 0 past the last snap when looping.
 */
function snapSegment(api: EmblaApi) {
  const snaps = api.scrollSnapList();
  const count = snaps.length;
  if (count < 2) return { from: 0, to: 0, t: 0, count };
  let progress = api.scrollProgress();
  if (api.internalEngine().options.loop) {
    progress = snaps[0] + ((((progress - snaps[0]) % 1) + 1) % 1);
    if (progress >= snaps[count - 1]) {
      const span = snaps[0] + 1 - snaps[count - 1];
      return { from: count - 1, to: 0, t: span > 0 ? (progress - snaps[count - 1]) / span : 0, count };
    }
  } else {
    progress = clamp(progress, snaps[0], snaps[count - 1]);
  }
  let from = 0;
  while (from < count - 2 && progress > snaps[from + 1]) from++;
  const span = snaps[from + 1] - snaps[from];
  return { from, to: from + 1, t: span > 0 ? clamp((progress - snaps[from]) / span, 0, 1) : 0, count };
}

/**
 * Each slide's distance from the current scroll position, in snaps: 0 on the current slide,
 * 1 on the next, and fractions in between. Measured along the gap between the two nearest
 * snaps so trimmed snaps at the ends still put neighbours exactly one away.
 */
function slideDistances(api: EmblaApi) {
  const { from, t, count } = snapSegment(api);
  const engine = api.internalEngine();
  const position = from + t;
  const distances: number[] = new Array(api.slideNodes().length).fill(0);
  for (let snap = 0; snap < count; snap++) {
    let distance = snap - position;
    // When looping, measure the short way round, which is where Embla places the slide.
    if (engine.options.loop) distance = ((((distance + count / 2) % count) + count) % count) - count / 2;
    engine.slideRegistry[snap]?.forEach((slide) => {
      distances[slide] = distance;
    });
  }
  return distances;
}

export interface CarouselProps extends ComponentProps<"div"> {
  /** Embla options. `align` defaults to `"center"`. */
  opts?: CarouselOptions;
  /** Embla plugins, such as autoplay. */
  plugins?: CarouselPlugin;
  orientation?: Orientation;
  /** Wrap from the last slide to the first. Shorthand for `opts.loop`. */
  loop?: boolean;
  /** Receives the Embla API once the carousel mounts. */
  setApi?: (api: CarouselApi) => void;
  /** Time in seconds for button, key, and dot scrolls to settle. Drags follow the pointer. */
  duration?: number;
  /** Scale of slides one or more snaps away from the current one. `1` turns scaling off. */
  inactiveScale?: number;
  /** Opacity of slides one or more snaps away from the current one. `1` turns fading off. */
  inactiveOpacity?: number;
  /**
   * How far each slide's content lags behind the slide, from 0 (off) to 0.5. Mark an element
   * inside the slide with `data-carousel-parallax` to move only that element, such as an image.
   */
  parallax?: number;
}

export function Carousel({
  opts,
  plugins,
  orientation = "horizontal",
  loop,
  setApi,
  duration = 0.5,
  inactiveScale = 0.88,
  inactiveOpacity = 0.5,
  parallax = 0,
  className,
  children,
  onKeyDown,
  ...props
}: CarouselProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const seconds = Math.max(0, finiteOr(duration, 0.5));
  // Embla's duration is a spring constant, not a time. 50 per second settles visually on time.
  const emblaDuration = reducedMotion ? 0 : Math.round(seconds * 50);
  const [setViewport, api] = useEmblaCarousel(
    {
      align: "center",
      ...opts,
      loop: loop ?? opts?.loop,
      duration: emblaDuration,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const scale = reducedMotion ? 1 : clamp(finiteOr(inactiveScale, 0.88), 0, 1);
  const fade = reducedMotion ? 1 : clamp(finiteOr(inactiveOpacity, 0.5), 0, 1);
  const depth = reducedMotion ? 0 : clamp(finiteOr(parallax, 0), 0, 0.5);

  useEffect(() => {
    if (!api) return;
    setApi?.(api);
  }, [api, setApi]);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);

  // Scale, fade, and parallax follow Embla's scroll progress on every frame it renders,
  // so they track a drag 1:1. Styles are written directly to keep React out of the loop.
  useEffect(() => {
    if (!api) return;
    const vertical = orientation === "vertical";
    let frames: (HTMLElement | null)[] = [];
    let layers: (HTMLElement | null)[] = [];

    const draw = () => {
      const distances = slideDistances(api);
      distances.forEach((distance, index) => {
        const frame = frames[index];
        const layer = layers[index];
        const near = 1 - clamp(Math.abs(distance), 0, 1);
        if (frame) {
          frame.style.transform = scale === 1 ? "" : `scale(${scale + (1 - scale) * near})`;
          frame.style.opacity = fade === 1 ? "" : String(fade + (1 - fade) * near);
        }
        if (layer) {
          // The layer is enlarged by the furthest it can shift, so its edges never show.
          const shift = -clamp(distance, -1, 1) * depth * 100;
          layer.style.transform =
            depth === 0
              ? ""
              : `translate3d(${vertical ? 0 : shift}%,${vertical ? shift : 0}%,0) scale(${1 + depth * 2})`;
        }
      });
    };

    const measure = () => {
      const slides = api.slideNodes();
      frames = slides.map((slide) => slide.querySelector<HTMLElement>('[data-slot="carousel-item-frame"]'));
      // An element marked data-carousel-parallax, such as an image, drifts on its own.
      // Without one, the slide's whole content does.
      layers = slides.map(
        (slide) =>
          slide.querySelector<HTMLElement>("[data-carousel-parallax]") ??
          slide.querySelector<HTMLElement>('[data-slot="carousel-item-layer"]'),
      );
      draw();
    };

    measure();
    api.on("scroll", draw).on("reInit", measure).on("slidesChanged", measure);
    return () => {
      api.off("scroll", draw).off("reInit", measure).off("slidesChanged", measure);
      [...frames, ...layers].forEach((node) => {
        if (!node) return;
        node.style.transform = "";
        node.style.opacity = "";
      });
    };
  }, [api, orientation, scale, fade, depth]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);
  const scrollTo = useCallback((index: number) => api?.scrollTo(index), [api]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return;
    const previous = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const next = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (event.key === previous) {
      event.preventDefault();
      scrollPrev();
    } else if (event.key === next) {
      event.preventDefault();
      scrollNext();
    }
  };

  return (
    <CarouselContext.Provider
      value={{
        setViewport,
        api,
        orientation,
        reducedMotion,
        scrollPrev,
        scrollNext,
        scrollTo,
        canScrollPrev,
        canScrollNext,
        parallax: depth,
      }}
    >
      <div
        {...props}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        data-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={`relative ${className ?? ""}`}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

export type CarouselContentProps = ComponentProps<"div">;

// Default spacing and width sit in :where() so a caller's basis-* or pl-* class always wins.
export function CarouselContent({ className, children, ...props }: CarouselContentProps) {
  const { setViewport, orientation } = useCarousel("CarouselContent");
  const vertical = orientation === "vertical";

  return (
    <div
      ref={setViewport}
      data-slot="carousel-content"
      tabIndex={0}
      className="focus-visible:ring-ring/30 overflow-hidden rounded-xl outline-none focus-visible:ring-3"
    >
      <div
        {...props}
        data-slot="carousel-track"
        className={`flex ${vertical ? "touch-pan-x touch-pinch-zoom flex-col [:where(&)]:-mt-4" : "touch-pan-y touch-pinch-zoom [:where(&)]:-ml-4"} ${className ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}

export type CarouselItemProps = ComponentProps<"div">;

export function CarouselItem({ className, children, ...props }: CarouselItemProps) {
  const carousel = useCarousel("CarouselItem");
  const vertical = carousel.orientation === "vertical";
  const parallax = carousel.parallax > 0;

  return (
    <div
      role="group"
      aria-roledescription="slide"
      {...props}
      data-slot="carousel-item"
      className={`min-w-0 shrink-0 grow-0 [:where(&)]:basis-full ${vertical ? "[:where(&)]:pt-4" : "[:where(&)]:pl-4"} ${className ?? ""}`}
    >
      <div
        data-slot="carousel-item-frame"
        className={`h-full rounded-xl will-change-transform ${parallax ? "overflow-hidden" : ""}`}
      >
        <div data-slot="carousel-item-layer" className="h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

function Arrow({ direction, vertical }: { direction: "previous" | "next"; vertical: boolean }) {
  const rotate = vertical ? (direction === "previous" ? "rotate-90" : "-rotate-90") : "";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 ${rotate}`}
    >
      {direction === "previous" ? <path d="M19 12H5m6-6-6 6 6 6" /> : <path d="M5 12h14m-6-6 6 6-6 6" />}
    </svg>
  );
}

const buttonClass =
  "border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring/30 inline-grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-40";

export type CarouselButtonProps = Omit<ComponentProps<"button">, "type">;

export function CarouselPrevious({ className, children, onClick, ...props }: CarouselButtonProps) {
  const carousel = useCarousel("CarouselPrevious");
  return (
    <button
      aria-label="Previous slide"
      {...props}
      type="button"
      data-slot="carousel-previous"
      disabled={!carousel.canScrollPrev || props.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.scrollPrev();
      }}
      className={`${buttonClass} ${className ?? ""}`}
    >
      {children ?? <Arrow direction="previous" vertical={carousel.orientation === "vertical"} />}
    </button>
  );
}

export function CarouselNext({ className, children, onClick, ...props }: CarouselButtonProps) {
  const carousel = useCarousel("CarouselNext");
  return (
    <button
      aria-label="Next slide"
      {...props}
      type="button"
      data-slot="carousel-next"
      disabled={!carousel.canScrollNext || props.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.scrollNext();
      }}
      className={`${buttonClass} ${className ?? ""}`}
    >
      {children ?? <Arrow direction="next" vertical={carousel.orientation === "vertical"} />}
    </button>
  );
}

export interface CarouselDotsProps extends Omit<ComponentProps<"div">, "children"> {
  /** Accessible name for the group of dots. */
  "aria-label"?: string;
}

export function CarouselDots({
  className,
  "aria-label": ariaLabel = "Choose slide",
  ...props
}: CarouselDotsProps) {
  const carousel = useCarousel("CarouselDots");
  const { api, reducedMotion } = carousel;
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState(0);
  const dotsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCount(api.scrollSnapList().length);
      setSelected(api.selectedScrollSnap());
    };
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);

  // The indicator stretches from the dot it leaves to the dot it heads for, then
  // releases its trailing edge, in step with the scroll so a drag moves it 1:1.
  useEffect(() => {
    if (!api || count < 1) return;
    const draw = () => {
      const indicator = indicatorRef.current;
      if (!indicator) return;
      const { from, to, t } = snapSegment(api);
      const dots = dotsRef.current;
      const a = dots[from];
      const b = dots[to] ?? a;
      if (!a || !b) return;
      const size = a.offsetWidth;
      const wrapping = to < from;
      let start = a.offsetLeft;
      let end = a.offsetLeft + size;
      let opacity = 1;
      if (reducedMotion || wrapping) {
        const target = t < 0.5 ? a : b;
        start = target.offsetLeft;
        end = start + size;
        // Looping from the last dot back to the first fades out and in rather than sweeping the row.
        if (wrapping && !reducedMotion) opacity = Math.abs(1 - t * 2);
      } else {
        const gap = b.offsetLeft - a.offsetLeft;
        start = a.offsetLeft + gap * clamp(t * 2 - 1, 0, 1);
        end = a.offsetLeft + size + gap * clamp(t * 2, 0, 1);
      }
      indicator.style.transform = `translate3d(${start}px,0,0)`;
      indicator.style.width = `${end - start}px`;
      indicator.style.opacity = String(opacity);
    };
    draw();
    api.on("scroll", draw).on("reInit", draw).on("select", draw).on("resize", draw);
    return () => {
      api.off("scroll", draw).off("reInit", draw).off("select", draw).off("resize", draw);
    };
  }, [api, count, reducedMotion]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      {...props}
      data-slot="carousel-dots"
      className={`relative inline-flex items-center gap-2 ${className ?? ""}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          ref={(node) => {
            dotsRef.current[index] = node;
          }}
          type="button"
          data-slot="carousel-dot"
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === selected ? "true" : undefined}
          onClick={() => carousel.scrollTo(index)}
          className="bg-muted-foreground/30 hover:bg-muted-foreground/50 focus-visible:ring-ring/30 relative size-2 cursor-pointer rounded-full transition-colors outline-none before:absolute before:-inset-2 focus-visible:ring-3"
        />
      ))}
      {count > 0 && (
        <span
          ref={indicatorRef}
          aria-hidden="true"
          data-slot="carousel-dots-indicator"
          className="bg-foreground pointer-events-none absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full will-change-transform"
        />
      )}
    </div>
  );
}
