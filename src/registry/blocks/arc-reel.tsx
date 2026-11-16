"use client";

import useEmblaCarousel from "embla-carousel-react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface ArcReelItem {
  id: string;
  name: string;
  logo?: ReactNode;
  artwork?: ReactNode;
}

export interface ArcReelProps {
  items: ArcReelItem[];
  initialIndex?: number;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

// Embla owns the reel: 1:1 dragging, release momentum and the settle onto a card. It watches this
// query itself and jumps instead of sliding while it matches, so the reel follows a change of
// preference straight away. Motion animates everything else.
const motionQuery = "(prefers-reduced-motion: reduce)";

// Critically damped with about a 0.2s response, so a pressed arrow gives and returns without
// overshooting. Written as stiffness and damping because Motion drops velocity on duration-based
// springs, and a quick second tap catches the button while it is still moving.
const PRESS: Transition = { type: "spring", stiffness: 900, damping: 60 };
const PRESSED: Variants = { pressed: { scale: 0.96 } };
// Reduced motion: the arrow dims under the pointer instead of the button giving.
const PRESSED_DIM: Variants = { pressed: { opacity: 0.5 } };
const DIM: Transition = { duration: 0.1, ease: "easeOut" };

// Reduced motion: the reel dims where Embla cuts to the new card and fades back, so the change
// reads as a cross-fade. The slow start keeps key repeat and scrubbing from flickering.
const CUT_OPACITY = 0.4;
const CUT_FADE: Transition = { duration: 0.25, ease: "easeInOut" };

const arcReelTheme = {
  "--arc-reel-background": "var(--background)",
  "--arc-reel-frame": "var(--card, var(--background))",
  "--arc-reel-image": "color-mix(in oklab, var(--background) 96%, var(--foreground))",
  "--arc-reel-border": "var(--border)",
  "--arc-reel-foreground": "var(--foreground)",
  "--arc-reel-muted": "var(--muted-foreground)",
  "--arc-reel-accent": "var(--foreground)",
} as CSSProperties;

export function ArcReel({ items, initialIndex = 0, ariaLabel = "Arc Reel", className, style }: ArcReelProps) {
  const viewportId = useId();
  const [copies, setCopies] = useState(1);
  const copyCount = items.length > 1 ? copies : 1;
  const slideCount = items.length * copyCount;
  const startIndex = Math.max(0, Math.min(items.length - 1, Math.floor(initialIndex) || 0));
  const [viewportRef, api] = useEmblaCarousel({
    align: "center",
    containScroll: false,
    loop: items.length > 1,
    startIndex,
    dragFree: true,
    duration: 45,
    breakpoints: { [motionQuery]: { duration: 0 } },
  });
  const markerRef = useRef<HTMLSpanElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const sliderTargetRef = useRef<number | null>(null);
  const [position, setPosition] = useState(startIndex);
  const currentIndex = items.length ? position % items.length : 0;
  const reducedMotion = useReducedMotion() ?? false;
  const reelOpacity = useMotionValue(1);

  useEffect(() => () => reelOpacity.stop(), [reelOpacity]);

  useEffect(() => {
    if (!api) return;

    // Refresh immediately when React adds or removes repeated cards. Keep the
    // same provider when a resize changes the number of copies needed to loop.
    if (api.slideNodes().length !== slideCount) {
      api.reInit({ startIndex: api.selectedScrollSnap() % Math.max(1, items.length) });
    }
    let frames: (HTMLElement | null)[] = [];
    let engine = api.internalEngine();
    let radius = 1;
    let perspective = 1;
    let previousIndex = -1;

    const draw = () => {
      const location = engine.offsetLocation.get();
      const distances = engine.scrollSnaps.map((snap) => location - snap);
      if (engine.options.loop) {
        engine.slideLooper.loopPoints.forEach(({ index, target }) => {
          distances[index] += target();
        });
      }
      const index = distances.reduce(
        (nearest, distance, candidate) =>
          Math.abs(distance) < Math.abs(distances[nearest]) ? candidate : nearest,
        0,
      );
      const logicalIndex = index % Math.max(1, items.length);
      const cycleProgress = (((api.scrollProgress() * copyCount) % 1) + 1) % 1;
      const progress =
        cycleProgress > 1 - 0.00001
          ? 0
          : Math.min(1, (cycleProgress * items.length) / Math.max(1, items.length - 1));

      // Embla emits scroll updates inside its own animation frame, right after
      // it moves the track. Write the projection here, in that same frame: a
      // motion value would hand it to Motion's frame loop, which renders one
      // frame later, and the cards would trail the track they ride on. React
      // only renders again when the nearest card changes.
      frames.forEach((frame, frameIndex) => {
        if (!frame) return;
        // Include Embla's slide relocation so the projection stays continuous
        // when a card crosses from one end of the track to the other.
        const distance = distances[frameIndex];
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
        const sliderIndex = Math.min(sliderTargetRef.current ?? logicalIndex, items.length - 1);
        sliderRef.current.value = String(sliderIndex);
        sliderRef.current.setAttribute(
          "aria-valuetext",
          `${items[sliderIndex]?.name ?? ""}, ${sliderIndex + 1} of ${items.length}`,
        );
      }
      if (index !== previousIndex) {
        previousIndex = index;
        setPosition(index);
      }
    };

    const measure = () => {
      const slides = api.slideNodes();
      engine = api.internalEngine();
      frames = slides.map((slide) => slide.querySelector<HTMLElement>("[data-arc-reel-frame]"));
      const spacing = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : 0;
      if (items.length > 1 && spacing > 0) {
        // Embla needs more than a viewport of cards to loop. Repeat short lists
        // only as much as needed, including room for cards entering at the sides.
        const needed = Math.max(
          1,
          Math.ceil((api.rootNode().clientWidth + spacing * 2) / (spacing * items.length)),
        );
        setCopies((current) => (current === needed ? current : needed));
      }
      radius = Math.max(api.rootNode().clientWidth * 0.62, (slides[0]?.offsetWidth ?? 1) * 2.1);
      perspective = radius;
      draw();
    };

    const softenCut = () => {
      if (engine.options.duration !== 0) return;
      reelOpacity.jump(CUT_OPACITY);
      animate(reelOpacity, 1, CUT_FADE);
    };

    const finishDrag = () => {
      if (engine.options.duration === 0) {
        // Reduced motion: no glide after the release. Cut to the card nearest
        // the projected landing point, unless the reel never left its card.
        const released = engine.location.get();
        api.scrollTo(api.selectedScrollSnap());
        if (Math.abs(engine.location.get() - released) > 1) softenCut();
        return;
      }
      // Free dragging has already projected the release momentum into the
      // scroll target. Settle on the card nearest that projected landing point
      // so a flick chooses its card without stopping between two of them. The
      // scroll body keeps the release velocity through the re-target.
      engine.scrollTo.distance(0, true);
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
      .on("select", softenCut)
      .on("pointerUp", finishDrag);

    return () => {
      api
        .off("scroll", draw)
        .off("settle", syncControls)
        .off("pointerDown", syncControls)
        .off("reInit", measure)
        .off("select", softenCut)
        .off("pointerUp", finishDrag);
    };
  }, [api, items, copyCount, slideCount, reelOpacity]);

  const goTo = (index: number, fromSlider = false) => {
    sliderTargetRef.current = fromSlider ? index : null;
    if (!api) return;
    const selected = api.selectedScrollSnap();
    const delta = index - (selected % items.length);
    const shortest =
      delta > items.length / 2
        ? delta - items.length
        : delta < -items.length / 2
          ? delta + items.length
          : delta;
    api.scrollTo(selected + shortest);
  };

  // Embla moves its target by one card and keeps the reel's velocity, so a tap
  // during a glide bends the motion toward the new card instead of restarting it.
  const step = (direction: "previous" | "next") => {
    sliderTargetRef.current = null;
    if (direction === "previous") api?.scrollPrev();
    else api?.scrollNext();
  };

  if (items.length === 0) return null;

  return (
    <section
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={[
        "[container-type:inline-size] relative isolate w-full overflow-hidden bg-[var(--arc-reel-background)] text-[var(--arc-reel-foreground)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...arcReelTheme, ...style }}
    >
      <div
        ref={viewportRef}
        id={viewportId}
        role="group"
        aria-label="Reel cards. Use the left and right arrow keys to browse."
        tabIndex={0}
        className="relative cursor-grab touch-pan-y overflow-hidden px-0 py-[var(--arc-reel-stage-padding,3.75rem)] outline-none select-none focus-visible:ring-1 focus-visible:ring-[var(--arc-reel-accent)] focus-visible:ring-inset active:cursor-grabbing"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !api) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            step(event.key === "ArrowLeft" ? "previous" : "next");
            return;
          }
          const destinations: Record<string, number> = {
            Home: 0,
            End: items.length - 1,
          };
          if (!(event.key in destinations)) return;
          event.preventDefault();
          goTo(destinations[event.key]);
        }}
      >
        <motion.div className="flex items-center will-change-transform" style={{ opacity: reelOpacity }}>
          {Array.from({ length: slideCount }, (_, slideIndex) => {
            const index = slideIndex % items.length;
            const item = items[index];
            const offset =
              ((index - currentIndex + items.length + Math.floor(items.length / 2)) % items.length) -
              Math.floor(items.length / 2);
            const accessibleSlide = (position + offset + slideCount) % slideCount;
            const duplicate = slideIndex !== accessibleSlide;
            return (
              <div
                key={`${Math.floor(slideIndex / items.length)}:${item.id}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${item.name}, ${index + 1} of ${items.length}`}
                aria-current={position === slideIndex ? "true" : undefined}
                aria-hidden={duplicate ? true : undefined}
                inert={duplicate ? true : undefined}
                className="mr-[var(--arc-reel-gap,1.75rem)] min-w-0 flex-[0_0_var(--arc-reel-card-width,clamp(10rem,26cqw,15.5rem))]"
              >
                <div
                  data-arc-reel-frame=""
                  className="relative rounded-[var(--radius,0.25rem)] border border-[var(--arc-reel-border)] bg-[var(--arc-reel-frame)] p-2 will-change-transform backface-hidden"
                >
                  <div aria-hidden="true" className="flex h-7 items-start justify-between px-0.5 pt-0.5">
                    <span className="font-mono text-[0.5625rem] leading-none text-[var(--arc-reel-muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex gap-0.5 pt-1 text-[var(--arc-reel-muted)]">
                      <span className="size-0.5 rounded-full bg-current" />
                      <span className="size-0.5 rounded-full bg-current" />
                      <span className="size-0.5 rounded-full bg-current" />
                    </span>
                  </div>
                  <div
                    className="relative grid aspect-square place-items-center overflow-hidden rounded-[1px] border border-[var(--arc-reel-border)] bg-[var(--arc-reel-image)]"
                    onDragStart={(event) => event.preventDefault()}
                  >
                    {item.artwork ? <div className="absolute inset-0 size-full">{item.artwork}</div> : null}
                    <span className="relative flex max-w-full items-center justify-center gap-2 px-3 text-center font-mono text-[length:var(--arc-reel-name-size,clamp(0.6875rem,1.5cqw,0.8125rem))] leading-tight font-bold tracking-normal uppercase">
                      {item.logo ?? item.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      <div className="relative flex items-center justify-center gap-5 pb-[var(--arc-reel-controls-padding,1.75rem)]">
        <ReelButton
          direction="previous"
          controls={viewportId}
          disabled={items.length < 2}
          reducedMotion={reducedMotion}
          onClick={() => step("previous")}
        />

        <div className="relative flex h-11 w-36 items-center rounded-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--arc-reel-accent)]">
          <span aria-hidden="true" className="h-px w-full bg-[var(--arc-reel-border)]">
            <span
              ref={markerRef}
              className="block h-px w-1/5 bg-[var(--arc-reel-accent)] will-change-transform"
            />
          </span>
          <input
            ref={sliderRef}
            id={`${viewportId}-scrubber`}
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

        <ReelButton
          direction="next"
          controls={viewportId}
          disabled={items.length < 2}
          reducedMotion={reducedMotion}
          onClick={() => step("next")}
        />
      </div>
      <span role="status" className="sr-only">
        {items[currentIndex].name}, {currentIndex + 1} of {items.length}
      </span>
    </section>
  );
}

function ReelButton({
  direction,
  controls,
  disabled,
  reducedMotion,
  onClick,
}: {
  direction: "previous" | "next";
  controls: string;
  disabled: boolean;
  reducedMotion: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={direction === "previous" ? "Previous provider" : "Next provider"}
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      // Feedback lands on pointer-down, or on Enter, and springs back from wherever the button is
      // on release. The click still commits on release over the button.
      whileTap={disabled ? undefined : "pressed"}
      variants={reducedMotion ? undefined : PRESSED}
      transition={PRESS}
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm transition-[background-color] duration-150 ease-out hover:bg-[var(--arc-reel-image)] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--arc-reel-accent)] disabled:cursor-default disabled:opacity-25 motion-reduce:transition-none"
    >
      <motion.svg
        aria-hidden="true"
        variants={reducedMotion ? PRESSED_DIM : undefined}
        transition={DIM}
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <path d={direction === "previous" ? "M20 12H4m7-7-7 7 7 7" : "M4 12h16m-7-7 7 7-7 7"} />
      </motion.svg>
    </motion.button>
  );
}
