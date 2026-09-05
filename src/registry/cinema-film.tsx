"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface CinemaFilmItem {
  id: string;
  name: string;
  logo?: ReactNode;
  artwork?: ReactNode;
}

export interface CinemaFilmProps {
  items: CinemaFilmItem[];
  initialIndex?: number;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const motionQuery = "(prefers-reduced-motion: reduce)";

const filmTheme = {
  "--film-background": "var(--background)",
  "--film-frame": "var(--card, var(--background))",
  "--film-image": "color-mix(in oklab, var(--background) 96%, var(--foreground))",
  "--film-border": "var(--border)",
  "--film-foreground": "var(--foreground)",
  "--film-muted": "var(--muted-foreground)",
  "--film-accent": "var(--foreground)",
} as CSSProperties;

export function CinemaFilm({
  items,
  initialIndex = 0,
  ariaLabel = "Cinema film",
  className,
  style,
}: CinemaFilmProps) {
  const viewportId = useId();
  const startIndex = Math.max(0, Math.min(items.length - 1, Math.floor(initialIndex) || 0));
  const [viewportRef, api] = useEmblaCarousel({
    align: "center",
    containScroll: false,
    startIndex,
    dragFree: true,
    duration: 45,
    breakpoints: { [motionQuery]: { duration: 0 } },
  });
  const markerRef = useRef<HTMLSpanElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const sliderTargetRef = useRef<number | null>(null);
  const [position, setPosition] = useState({
    index: startIndex,
    atStart: startIndex === 0,
    atEnd: startIndex === items.length - 1,
  });
  const currentIndex = Math.min(position.index, Math.max(0, items.length - 1));

  useEffect(() => {
    if (!api) return;

    let frames: (HTMLElement | null)[] = [];
    let snaps: number[] = [];
    let travel = 0;
    let radius = 1;
    let perspective = 1;
    let previousIndex = -1;
    let previouslyAtStart = false;
    let previouslyAtEnd = false;

    const draw = () => {
      const rawProgress = api.scrollProgress();
      const progress = Math.max(0, Math.min(1, rawProgress));
      const index = Math.round(progress * Math.max(0, snaps.length - 1));
      const atStart = progress <= 0.001;
      const atEnd = progress >= 0.999 || snaps.length < 2;

      // Embla emits scroll updates on its animation frame. Keep the moving
      // geometry out of React and only render again when the nearest card changes.
      frames.forEach((frame, frameIndex) => {
        if (!frame) return;
        const distance = (snaps[frameIndex] - rawProgress) * travel;
        const angle = distance / radius;
        const edge = Math.max(0, Math.min(1, (1.2 - Math.abs(angle)) / 0.15));
        frame.style.visibility = edge > 0 ? "visible" : "hidden";
        if (edge === 0) return;

        // View the sphere's inner wall from its center. Side cards move toward
        // the camera and face inward. Cull behind the field of view before a
        // card's corners can cross the camera plane.
        const depth = radius * (1 - Math.cos(angle));
        const x = radius * Math.sin(angle);
        const y = -depth * 0.08;
        frame.style.transform = `translate3d(${-distance}px,0,0) perspective(${perspective}px) translate3d(${x}px,${y}px,${depth}px) rotateY(${(-angle * 180) / Math.PI}deg)`;
        frame.style.opacity = String(edge * edge * (3 - 2 * edge));
        frame.style.zIndex = String(Math.round((1 - Math.cos(angle)) * 100));
      });

      if (markerRef.current) markerRef.current.style.transform = `translate3d(${progress * 400}%,0,0)`;
      if (sliderRef.current) {
        // Preserve the requested value until settling so key repeat and an
        // ongoing scrub aren't pulled backward by the animated scroll position.
        const sliderIndex = Math.min(sliderTargetRef.current ?? index, items.length - 1);
        sliderRef.current.value = String(sliderIndex);
        sliderRef.current.setAttribute(
          "aria-valuetext",
          `${items[sliderIndex]?.name ?? ""}, ${sliderIndex + 1} of ${items.length}`,
        );
      }
      if (index !== previousIndex || atStart !== previouslyAtStart || atEnd !== previouslyAtEnd) {
        previousIndex = index;
        previouslyAtStart = atStart;
        previouslyAtEnd = atEnd;
        setPosition({ index, atStart, atEnd });
      }
    };

    const measure = () => {
      const slides = api.slideNodes();
      frames = slides.map((slide) => slide.querySelector<HTMLElement>("[data-film-frame]"));
      snaps = api.scrollSnapList();
      travel = (slides.at(-1)?.offsetLeft ?? 0) - (slides[0]?.offsetLeft ?? 0);
      radius = Math.max(api.rootNode().clientWidth * 0.62, (slides[0]?.offsetWidth ?? 1) * 2.1);
      perspective = radius;
      draw();
    };

    const finishReducedMotionDrag = () => {
      if (window.matchMedia(motionQuery).matches) api.scrollTo(api.selectedScrollSnap(), true);
    };

    const syncControls = () => {
      sliderTargetRef.current = null;
      draw();
    };

    measure();
    api
      .on("scroll", draw)
      .on("settle", syncControls)
      .on("pointerDown", syncControls)
      .on("reInit", measure)
      .on("pointerUp", finishReducedMotionDrag);

    return () => {
      api
        .off("scroll", draw)
        .off("settle", syncControls)
        .off("pointerDown", syncControls)
        .off("reInit", measure)
        .off("pointerUp", finishReducedMotionDrag);
    };
  }, [api, items]);

  const goTo = (index: number, fromSlider = false) => {
    sliderTargetRef.current = fromSlider ? index : null;
    api?.scrollTo(index, window.matchMedia(motionQuery).matches);
  };

  if (items.length === 0) return null;

  return (
    <section
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={[
        "[container-type:inline-size] relative isolate w-full overflow-hidden bg-[var(--film-background)] text-[var(--film-foreground)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...filmTheme, ...style }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--film-muted)_0.65px,transparent_0.65px)] [background-size:16px_16px] opacity-20"
      />

      <div
        ref={viewportRef}
        id={viewportId}
        role="group"
        aria-label="Film cards. Use the left and right arrow keys to browse."
        tabIndex={0}
        className="relative cursor-grab touch-pan-y overflow-hidden px-0 py-[var(--film-stage-padding,3.75rem)] outline-none select-none focus-visible:ring-1 focus-visible:ring-[var(--film-accent)] focus-visible:ring-inset active:cursor-grabbing"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !api) return;
          const index = api.selectedScrollSnap();
          const destinations: Record<string, number> = {
            ArrowLeft: Math.max(0, index - 1),
            ArrowRight: Math.min(items.length - 1, index + 1),
            Home: 0,
            End: items.length - 1,
          };
          if (!(event.key in destinations)) return;
          event.preventDefault();
          goTo(destinations[event.key]);
        }}
      >
        <div className="flex items-center gap-[var(--film-gap,1.75rem)] will-change-transform">
          {items.map((item, index) => (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${item.name}, ${index + 1} of ${items.length}`}
              aria-current={currentIndex === index ? "true" : undefined}
              className="min-w-0 flex-[0_0_var(--film-card-width,clamp(10rem,26cqw,15.5rem))]"
            >
              <div
                data-film-frame=""
                className="relative rounded-[var(--radius,0.25rem)] border border-[var(--film-border)] bg-[var(--film-frame)] p-2 will-change-transform backface-hidden"
              >
                <div aria-hidden="true" className="flex h-7 items-start justify-between px-0.5 pt-0.5">
                  <span className="font-mono text-[0.5625rem] leading-none text-[var(--film-muted)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex gap-0.5 pt-1 text-[var(--film-muted)]">
                    <span className="size-0.5 rounded-full bg-current" />
                    <span className="size-0.5 rounded-full bg-current" />
                    <span className="size-0.5 rounded-full bg-current" />
                  </span>
                </div>
                <div
                  className="relative grid aspect-square place-items-center overflow-hidden rounded-[1px] border border-[var(--film-border)] bg-[var(--film-image)]"
                  onDragStart={(event) => event.preventDefault()}
                >
                  {item.artwork ? <div className="absolute inset-0 size-full">{item.artwork}</div> : null}
                  <span className="relative flex max-w-full items-center justify-center gap-2 px-3 text-center font-mono text-[length:var(--film-name-size,clamp(0.6875rem,1.5cqw,0.8125rem))] leading-tight font-bold tracking-normal uppercase">
                    {item.logo ?? item.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-center gap-5 pb-[var(--film-controls-padding,1.75rem)]">
        <button
          type="button"
          aria-label="Previous provider"
          aria-controls={viewportId}
          disabled={position.atStart || items.length < 2}
          onClick={() => goTo((api?.selectedScrollSnap() ?? currentIndex) - 1)}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm transition-colors hover:bg-[var(--film-image)] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--film-accent)] disabled:cursor-default disabled:opacity-25 motion-reduce:transition-none"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M20 12H4m7-7-7 7 7 7" />
          </svg>
        </button>

        <div className="relative flex h-11 w-36 items-center rounded-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--film-accent)]">
          <span aria-hidden="true" className="h-px w-full bg-[var(--film-border)]">
            <span
              ref={markerRef}
              className="block h-px w-1/5 bg-[var(--film-accent)] will-change-transform"
            />
          </span>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={Math.max(1, items.length - 1)}
            step={1}
            defaultValue={startIndex}
            disabled={items.length < 2}
            aria-label="Choose provider"
            aria-controls={viewportId}
            aria-valuetext={`${items[startIndex].name}, ${startIndex + 1} of ${items.length}`}
            onChange={(event) => goTo(Number(event.currentTarget.value), true)}
            className="absolute inset-0 m-0 h-full w-full cursor-ew-resize opacity-0 disabled:cursor-default"
          />
        </div>

        <button
          type="button"
          aria-label="Next provider"
          aria-controls={viewportId}
          disabled={position.atEnd || items.length < 2}
          onClick={() => goTo((api?.selectedScrollSnap() ?? currentIndex) + 1)}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm transition-colors hover:bg-[var(--film-image)] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--film-accent)] disabled:cursor-default disabled:opacity-25 motion-reduce:transition-none"
        >
          <svg
            aria-hidden="true"
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M4 12h16m-7-7 7 7-7 7" />
          </svg>
        </button>
      </div>
      <span role="status" className="sr-only">
        {items[currentIndex].name}, {currentIndex + 1} of {items.length}
      </span>
    </section>
  );
}
