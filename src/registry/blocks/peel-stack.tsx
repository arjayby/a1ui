"use client";

import { clsx as cn } from "clsx";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface PeelStackItem {
  /** Stable, unique identifier. */
  id: string;
  title: string;
  description?: string;
  label?: string;
  /** Decorative artwork behind the card's text. */
  artwork?: ReactNode;
  /** Optional links or other content below the description. */
  content?: ReactNode;
}

export interface PeelStackProps {
  items: PeelStackItem[];
  activeId?: string;
  defaultActiveId?: string;
  onActiveChange?: (id: string) => void;
  ariaLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  showControls?: boolean;
  className?: string;
  style?: CSSProperties;
}

const theme = {
  "--peel-stack-background": "var(--background, #f7f7f5)",
  "--peel-stack-paper": "var(--card, var(--peel-stack-background))",
  "--peel-stack-foreground": "var(--foreground, #222320)",
  "--peel-stack-muted": "var(--muted-foreground, #70716b)",
  "--peel-stack-border": "var(--border, #d6d7d1)",
  "--peel-stack-shade": "color-mix(in oklab, var(--peel-stack-paper) 94%, var(--peel-stack-foreground))",
} as CSSProperties;

const interactiveSelector =
  "a,button,input,select,textarea,[contenteditable]:not([contenteditable='false']),[role='button'],[role='slider']";

type Gesture = {
  kind: "pending" | "swiping";
  pointerId: number;
  x: number;
  y: number;
  /** The card under the pointer and its drag offset when it was grabbed. */
  id: string;
  origin: number;
  samples: { x: number; time: number }[];
};

type Offset = { x: number; velocity: number; frame: number };

/** Degrees of tilt per pixel of horizontal drag, so the card leans the way it is pulled. */
const tilt = 0.04;
/** Where a release would come to rest, using Apple's scroll deceleration rate (0.998). */
const project = (velocity: number) => ((velocity / 1000) * 0.998) / (1 - 0.998);
// The released card settles on a spring with a 0.35s response and a little
// bounce (damping ratio 0.85). It only ever runs after a drag hands it momentum.
const stiffness = ((2 * Math.PI) / (0.35 * 1.2)) ** 2;
const damping = 2 * 0.85 * Math.sqrt(stiffness);

function releaseVelocity(samples: Gesture["samples"]) {
  const last = samples[samples.length - 1];
  const first = samples.find((sample) => last.time - sample.time <= 100) ?? last;
  const elapsed = last.time - first.time;
  return elapsed > 0 ? ((last.x - first.x) / elapsed) * 1000 : 0;
}

export function PeelStack({
  items,
  activeId,
  defaultActiveId,
  onActiveChange,
  ariaLabel = "Peel Stack",
  previousLabel = "Previous card",
  nextLabel = "Next card",
  showControls = true,
  className,
  style,
}: PeelStackProps) {
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const cardsRef = useRef(new Map<string, HTMLDivElement>());
  const offsetsRef = useRef(new Map<string, Offset>());
  const [selectedId, setSelectedId] = useState(defaultActiveId ?? items[0]?.id);
  const controlled = activeId !== undefined;
  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.id === (activeId ?? selectedId)),
  );
  const current = items[currentIndex];
  const resetGesture = useCallback(() => {
    gestureRef.current = null;
    viewportRef.current?.removeAttribute("data-swiping");
  }, []);

  // Keep the selection attached to its item when the list is reordered. Once
  // an uncontrolled selection is removed, start from the new first item.
  if (!controlled && selectedId !== current?.id) setSelectedId(current?.id);

  // The drag offset lives in the card's `translate` and `rotate` properties, on
  // top of the stacked `transform`, so the finger and the stack never fight.
  const paintOffset = useCallback((id: string, x: number) => {
    const card = cardsRef.current.get(id);
    if (!card) return;
    card.style.translate = x ? `${x}px 0` : "";
    card.style.rotate = x ? `${x * tilt}deg` : "";
  }, []);

  const holdOffset = useCallback(
    (id: string, x: number) => {
      const offset = offsetsRef.current.get(id);
      if (offset?.frame) cancelAnimationFrame(offset.frame);
      offsetsRef.current.set(id, { x, velocity: 0, frame: 0 });
      paintOffset(id, x);
    },
    [paintOffset],
  );

  const settleOffset = useCallback(
    (id: string, velocity: number) => {
      const offset = offsetsRef.current.get(id);
      if (!offset) return;
      if (offset.frame) cancelAnimationFrame(offset.frame);
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        offsetsRef.current.delete(id);
        paintOffset(id, 0);
        return;
      }
      offset.velocity = velocity;
      let previous: number | null = null;
      const step = (time: number) => {
        const elapsed = previous === null ? 0 : Math.min((time - previous) / 1000, 0.064);
        previous = time;
        for (let remaining = elapsed; remaining > 0; remaining -= 1 / 240) {
          const delta = Math.min(remaining, 1 / 240);
          offset.velocity += (-stiffness * offset.x - damping * offset.velocity) * delta;
          offset.x += offset.velocity * delta;
        }
        if (Math.abs(offset.x) < 0.5 && Math.abs(offset.velocity) < 20) {
          offsetsRef.current.delete(id);
          paintOffset(id, 0);
          return;
        }
        paintOffset(id, offset.x);
        offset.frame = requestAnimationFrame(step);
      };
      offset.frame = requestAnimationFrame(step);
    },
    [paintOffset],
  );

  useEffect(() => {
    const offsets = offsetsRef.current;
    return () => offsets.forEach((offset) => cancelAnimationFrame(offset.frame));
  }, []);

  const cancelGesture = useCallback(() => {
    const gesture = gestureRef.current;
    resetGesture();
    if (gesture) settleOffset(gesture.id, 0);
  }, [resetGesture, settleOffset]);

  useEffect(() => {
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      viewportRef.current?.contains(focused) &&
      focused.closest("[data-peel-stack-card]")?.getAttribute("aria-hidden") === "true"
    ) {
      viewportRef.current.focus({ preventScroll: true });
    }
    resetGesture();
  }, [current?.id, resetGesture]);

  function select(index: number) {
    if (items.length < 2) return;
    const next = items[(index + items.length) % items.length];
    if (next.id === current.id) return;
    if (!controlled) setSelectedId(next.id);
    onActiveChange?.(next.id);
  }

  if (!current) return null;

  return (
    <section
      data-slot="peel-stack"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={cn(
        "[container-type:inline-size] relative isolate w-full overflow-hidden bg-[var(--peel-stack-background)] font-sans text-[var(--peel-stack-foreground)]",
        className,
      )}
      style={{ ...theme, ...style }}
    >
      <div
        id={viewportId}
        ref={viewportRef}
        role="group"
        aria-label="Stack cards. Use the left and right arrow keys to browse."
        tabIndex={0}
        data-slot="peel-stack-viewport"
        className="relative grid h-[var(--peel-stack-stage-height,22rem)] touch-pan-y place-items-center outline-none focus-visible:ring-1 focus-visible:ring-[var(--peel-stack-foreground)] focus-visible:ring-inset data-[swiping=true]:cursor-grabbing data-[swiping=true]:select-none"
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
          const destinations: Record<string, number> = {
            ArrowLeft: currentIndex - 1,
            ArrowRight: currentIndex + 1,
            Home: 0,
            End: items.length - 1,
          };
          if (!(event.key in destinations)) return;
          event.preventDefault();
          select(destinations[event.key]);
        }}
        onPointerDown={(event) => {
          if (
            items.length < 2 ||
            !event.isPrimary ||
            event.button !== 0 ||
            (event.target instanceof Element && event.target.closest(interactiveSelector))
          )
            return;
          // Catch a card that is still settling exactly where it is on screen.
          const origin = offsetsRef.current.get(current.id)?.x ?? 0;
          if (origin) holdOffset(current.id, origin);
          gestureRef.current = {
            kind: "pending",
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            id: current.id,
            origin,
            samples: [{ x: event.clientX, time: event.timeStamp }],
          };
        }}
        onPointerMove={(event) => {
          const gesture = gestureRef.current;
          if (!gesture || event.pointerId !== gesture.pointerId) return;
          const x = Math.abs(event.clientX - gesture.x);
          const y = Math.abs(event.clientY - gesture.y);
          gesture.samples = [
            ...gesture.samples.filter((sample) => event.timeStamp - sample.time <= 100),
            { x: event.clientX, time: event.timeStamp },
          ];
          if (gesture.kind === "pending") {
            if (y >= 8 && y > x * 1.25) {
              cancelGesture();
              return;
            }
            if (x < 8 || x <= y * 1.25) return;
            gesture.kind = "swiping";
            event.currentTarget.dataset.swiping = "true";
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          event.preventDefault();
          // Track the finger 1:1 from the grab point once the swipe is committed.
          holdOffset(gesture.id, gesture.origin + event.clientX - gesture.x);
          const selection = event.currentTarget.ownerDocument.getSelection();
          if (selection?.anchorNode && event.currentTarget.contains(selection.anchorNode)) {
            selection.removeAllRanges();
          }
        }}
        onPointerUp={(event) => {
          const gesture = gestureRef.current;
          if (!gesture || event.pointerId !== gesture.pointerId) return;
          resetGesture();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          const x = event.clientX - gesture.x;
          const y = event.clientY - gesture.y;
          // Only a committed swipe carries momentum, so a jittery tap cannot flick.
          const velocity =
            gesture.kind === "swiping"
              ? releaseVelocity([...gesture.samples, { x: event.clientX, time: event.timeStamp }])
              : 0;
          // Choose from where the release is heading, not where it stopped, and
          // let a flick back toward the start cancel the swipe.
          const projected = x + project(velocity);
          const reversing = Math.abs(velocity) > 150 && Math.sign(velocity) !== Math.sign(x);
          settleOffset(gesture.id, velocity);
          if (!reversing && Math.abs(projected) >= 36 && Math.abs(x) > Math.abs(y) * 1.25) {
            select(currentIndex + (projected < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={(event) => {
          if (event.target === event.currentTarget) cancelGesture();
        }}
        onDragStart={(event) => {
          if (!(event.target instanceof Element && event.target.closest(interactiveSelector))) {
            event.preventDefault();
          }
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--peel-stack-border)_0.65px,transparent_0.65px)] [background-size:16px_16px] opacity-55"
        />
        {items.map((item, index) => {
          const order = (index - currentIndex + items.length) % items.length;
          const active = order === 0;
          const layer = Math.min(2, Math.ceil(order / 2));
          const side = order % 2 === 1 ? 1 : -1;
          const transform = active
            ? "translate(0, -6px) rotate(-2deg)"
            : `translate(${side * layer * 5}%, ${layer * 10 + side * -2}px) rotate(calc(var(--peel-stack-spread, var(--peel-stack-default-spread, 8deg)) * ${side * layer}))`;

          return (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${item.title}, ${index + 1} of ${items.length}`}
              aria-hidden={active ? undefined : true}
              inert={active ? undefined : true}
              ref={(card) => {
                if (card) cardsRef.current.set(item.id, card);
                else cardsRef.current.delete(item.id);
              }}
              data-peel-stack-card={item.id}
              data-active={active}
              className={cn(
                "absolute flex h-[var(--peel-stack-card-height,13.5rem)] w-[min(70%,var(--peel-stack-card-width,20rem))] origin-[50%_90%] flex-col overflow-hidden rounded-[var(--peel-stack-radius,12px)] border border-[var(--peel-stack-border)] p-[clamp(0.875rem,4cqw,1.25rem)] shadow-[0_5px_16px_color-mix(in_oklab,var(--peel-stack-foreground)_8%,transparent)] transition-[transform,opacity,background-color] duration-500 ease-[cubic-bezier(0.22,0.8,0.22,1)] motion-reduce:transition-none @max-[32rem]:[--peel-stack-default-spread:3deg]",
                active ? "bg-[var(--peel-stack-paper)]" : "pointer-events-none bg-[var(--peel-stack-shade)]",
              )}
              style={{ transform, zIndex: items.length - order, opacity: order < 5 ? 1 : 0 }}
            >
              <div className="relative z-10 font-mono text-[length:var(--peel-stack-label-size,0.75rem)] leading-4 tracking-[0.08em] text-[var(--peel-stack-muted)]">
                <span className="block truncate uppercase">{item.label ?? "Collection"}</span>
              </div>
              {item.artwork ? (
                <div
                  aria-hidden="true"
                  inert
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                  {item.artwork}
                </div>
              ) : null}
              <div
                className={cn(
                  "relative mt-auto flex flex-col gap-1 pt-3",
                  active ? "bg-[var(--peel-stack-paper)]" : "bg-[var(--peel-stack-shade)]",
                )}
              >
                <span className="font-[family-name:var(--font-heading,inherit)] text-[length:var(--peel-stack-title-size,clamp(1.25rem,3.5cqw,1.5rem))] leading-tight font-normal tracking-[-0.025em] [overflow-wrap:anywhere]">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="text-[length:var(--peel-stack-label-size,0.75rem)] leading-relaxed [overflow-wrap:anywhere] text-[var(--peel-stack-muted)]">
                    {item.description}
                  </span>
                ) : null}
                {item.content ? <div className="mt-2 text-xs">{item.content}</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div role="status" aria-atomic="true" className="sr-only">
        {current.title}, {currentIndex + 1} of {items.length}
      </div>
      {showControls ? (
        <div className="relative flex min-h-16 items-center justify-end gap-1 border-t border-[var(--peel-stack-border)] px-[clamp(0.75rem,4cqw,1.25rem)]">
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={direction === -1 ? previousLabel : nextLabel}
              aria-controls={viewportId}
              disabled={items.length < 2}
              onClick={() => select(currentIndex + direction)}
              className="grid size-11 cursor-pointer place-items-center rounded-md border border-[var(--peel-stack-border)] bg-[var(--peel-stack-paper)] transition-[background-color,scale] duration-150 ease-out hover:bg-[var(--peel-stack-shade)] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--peel-stack-foreground)] enabled:active:bg-[var(--peel-stack-shade)] disabled:cursor-default disabled:opacity-30 motion-safe:enabled:active:scale-[0.96] motion-reduce:transition-none"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className="size-4"
              >
                <path d={direction === -1 ? "M20 12H4m7-7-7 7 7 7" : "M4 12h16m-7-7 7 7-7 7"} />
              </svg>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
