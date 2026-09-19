"use client";

import { clsx as cn } from "clsx";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

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

export function PeelStack({
  items,
  activeId,
  defaultActiveId,
  onActiveChange,
  ariaLabel = "Peel Stack",
  previousLabel = "Previous card",
  nextLabel = "Next card",
  className,
  style,
}: PeelStackProps) {
  const viewportId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState(defaultActiveId ?? items[0]?.id);
  const controlled = activeId !== undefined;
  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.id === (activeId ?? selectedId)),
  );
  const current = items[currentIndex];

  // Keep the selection attached to its item when the list is reordered. Once
  // an uncontrolled selection is removed, start from the new first item.
  if (!controlled && selectedId !== current?.id) setSelectedId(current?.id);

  useEffect(() => {
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      viewportRef.current?.contains(focused) &&
      focused.closest("[data-peel-stack-card]")?.getAttribute("aria-hidden") === "true"
    ) {
      viewportRef.current.focus({ preventScroll: true });
    }
    gestureRef.current = null;
  }, [current?.id]);

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
        "[container-type:inline-size] relative isolate w-full overflow-hidden bg-[var(--peel-stack-background)] font-mono text-[var(--peel-stack-foreground)]",
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
        className="relative grid h-[var(--peel-stack-stage-height,21rem)] touch-pan-y place-items-center outline-none focus-visible:ring-1 focus-visible:ring-[var(--peel-stack-foreground)] focus-visible:ring-inset"
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
          gestureRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const gesture = gestureRef.current;
          if (!gesture || event.pointerId !== gesture.pointerId) return;
          gestureRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          const x = event.clientX - gesture.x;
          const y = event.clientY - gesture.y;
          if (Math.abs(x) >= 36 && Math.abs(x) > Math.abs(y) * 1.25) {
            select(currentIndex + (x < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => {
          gestureRef.current = null;
        }}
        onLostPointerCapture={() => {
          gestureRef.current = null;
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
          const transform = active
            ? "translate(0, -6px) rotate(-2deg)"
            : order === 1
              ? "translate(7%, 10px) rotate(var(--peel-stack-spread, 8deg))"
              : "translate(-7%, 16px) rotate(calc(var(--peel-stack-spread, 8deg) * -1))";

          return (
            <div
              key={item.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${item.title}, ${index + 1} of ${items.length}`}
              aria-hidden={active ? undefined : true}
              inert={active ? undefined : true}
              data-peel-stack-card={item.id}
              data-active={active}
              className={cn(
                "absolute flex h-[var(--peel-stack-card-height,13.5rem)] w-[min(70%,var(--peel-stack-card-width,20rem))] origin-[50%_90%] flex-col overflow-hidden rounded-[var(--peel-stack-radius,var(--radius,0.25rem))] border border-[var(--peel-stack-border)] p-[clamp(0.875rem,4cqw,1.25rem)] shadow-[0_5px_16px_color-mix(in_oklab,var(--peel-stack-foreground)_8%,transparent)] transition-[transform,opacity,background-color] duration-500 ease-[cubic-bezier(0.22,0.8,0.22,1)] motion-reduce:transition-none",
                active ? "bg-[var(--peel-stack-paper)]" : "pointer-events-none bg-[var(--peel-stack-shade)]",
              )}
              style={{ transform, zIndex: items.length - order, opacity: order < 3 ? 1 : 0 }}
            >
              <div className="relative z-10 flex items-start justify-between gap-3 text-[length:var(--peel-stack-label-size,0.625rem)] leading-tight text-[var(--peel-stack-muted)]">
                <span className="min-w-0 truncate uppercase">{item.label ?? "Collection"}</span>
                <span aria-hidden="true" className="shrink-0 tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
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
                <span className="text-[length:var(--peel-stack-title-size,clamp(0.9375rem,3.5cqw,1.1875rem))] leading-tight tracking-tight [overflow-wrap:anywhere]">
                  {item.title}
                </span>
                {item.description ? (
                  <span className="text-[length:var(--peel-stack-label-size,0.625rem)] leading-relaxed [overflow-wrap:anywhere] text-[var(--peel-stack-muted)]">
                    {item.description}
                  </span>
                ) : null}
                {item.content ? <div className="mt-2 text-xs">{item.content}</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative flex min-h-16 items-center justify-between gap-2 border-t border-[var(--peel-stack-border)] px-[clamp(0.75rem,4cqw,1.25rem)]">
        <div
          role="status"
          aria-atomic="true"
          className="flex min-w-0 flex-col gap-1 py-3 text-[length:var(--peel-stack-label-size,0.625rem)] leading-snug text-[var(--peel-stack-muted)]"
        >
          <span className="tabular-nums">
            {String(currentIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </span>
          <span className="truncate">{current.title}</span>
        </div>
        <div className="flex shrink-0 gap-1">
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={direction === -1 ? previousLabel : nextLabel}
              aria-controls={viewportId}
              disabled={items.length < 2}
              onClick={() => select(currentIndex + direction)}
              className="grid size-11 cursor-pointer place-items-center rounded-sm border border-[var(--peel-stack-border)] bg-[var(--peel-stack-paper)] transition-colors hover:bg-[var(--peel-stack-shade)] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--peel-stack-foreground)] disabled:cursor-default disabled:opacity-30 motion-reduce:transition-none"
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
      </div>
    </section>
  );
}
