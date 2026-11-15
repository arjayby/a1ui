"use client";

import { animate, motionValue } from "motion";
import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributeAnchorTarget,
  type ReactNode,
} from "react";

export interface CardVortexItem {
  id: string;
  title: string;
  href: string;
  image?: ReactNode;
  target?: HTMLAttributeAnchorTarget;
  rel?: string;
}

export interface CardVortexProps {
  /** The trigger. Any element works; use a button or link so the keyboard can reach it. */
  children: ReactNode;
  items: CardVortexItem[];
  /** Distance from the trigger's center to each card's center, in pixels. */
  radius?: number;
  /** Angle of the first card in degrees. -90 is straight up; cards continue clockwise. */
  startAngle?: number;
  /** The direction each card first heads in, in degrees clockwise of its final position. */
  fromAngle?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const cardVortexTheme = {
  "--card-vortex-card": "var(--muted, var(--background))",
  "--card-vortex-image": "color-mix(in oklab, var(--background) 92%, var(--foreground))",
  "--card-vortex-border": "var(--border)",
  "--card-vortex-foreground": "var(--foreground)",
  "--card-vortex-accent": "var(--ring, var(--foreground))",
  "--card-vortex-shadow": "0 1px 2px rgb(0 0 0 / 0.06), 0 12px 28px -10px rgb(0 0 0 / 0.28)",
} as CSSProperties;

const CLOSE_DELAY = 140;
/** Below this the titles get too small to read and the cards too small to tap. */
const MIN_FIT = 0.75;
/** Room kept between the ring and the edge it fits inside, in pixels. */
const EDGE = 8;
const FOCUSABLE = "a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])";

interface Layout {
  fit: number;
  reach: number;
  offsetX: number;
  offsetY: number;
  cardWidth: number;
}

interface Geometry extends Omit<Layout, "reach"> {
  angle: number;
  radius: number;
  fromAngle: number;
  reducedMotion: boolean;
}

/** How far to move a ring centered at `center` so `extent` either side of it stays between `start` and `end`. */
function shiftInto(center: number, extent: number, start: number, end: number) {
  if (end - start <= extent * 2) return (start + end) / 2 - center;
  return Math.min(Math.max(center, start + extent), end - extent) - center;
}

function VortexCard({
  item,
  index,
  count,
  open,
  geometry,
}: {
  item: CardVortexItem;
  index: number;
  count: number;
  open: boolean;
  geometry: Geometry;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [progress] = useState(() => motionValue(0));
  const geometryRef = useRef(geometry);
  const { angle, radius, fromAngle, fit, offsetX, offsetY, cardWidth, reducedMotion } = geometry;

  // Each card leaves the trigger's center heading for a neighbouring position and curves
  // round to its own, growing from a dot and fading in as it goes. The spring writes straight to the element.
  const paint = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const { angle, radius, fromAngle, fit, offsetX, offsetY, cardWidth, reducedMotion } = geometryRef.current;
    const p = progress.get();
    const shown = Math.max(0, p);
    const travel = reducedMotion ? 1 : p;
    const theta = ((angle + fromAngle * (1 - travel)) * Math.PI) / 180;
    const distance = radius * fit * travel;
    // When the ring is moved away from an edge, its center slides there from the trigger.
    const x = offsetX * travel + Math.cos(theta) * distance;
    const y = offsetY * travel + Math.sin(theta) * distance;
    // A card is a single pixel wide at the center and full size on the ring.
    const dot = 1 / Math.max(1, cardWidth);
    const scale = reducedMotion ? fit : Math.max(dot, fit * Math.min(1, shown));
    element.style.transform = `translate(-50%,-50%) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
    element.style.opacity = Math.min(1, shown).toFixed(3);
    element.style.visibility = shown > 0.005 ? "visible" : "hidden";
  }, [progress]);

  useLayoutEffect(() => {
    geometryRef.current = {
      angle,
      radius,
      fromAngle,
      fit,
      offsetX,
      offsetY,
      cardWidth,
      reducedMotion,
    };
    // Titles sit at the top of each card, so lower cards stack above higher ones.
    if (ref.current) {
      ref.current.style.zIndex = String(Math.round((Math.sin((angle * Math.PI) / 180) + 1) * 10) + 1);
    }
    paint();
  }, [angle, radius, fromAngle, fit, offsetX, offsetY, cardWidth, reducedMotion, paint]);

  useEffect(() => progress.on("change", paint), [progress, paint]);

  useEffect(() => {
    // Cards enter one after another and leave in reverse order. Both springs are
    // critically damped and start from the current value. Only a card at rest waits
    // its turn: one that is already moving turns round at once, so it never stalls.
    const p = progress.get();
    const fromRest = open ? p <= 0.001 : p >= 0.999;
    const controls = reducedMotion
      ? animate(progress, open ? 1 : 0, { duration: 0.15, ease: "linear" })
      : open
        ? animate(progress, 1, {
            type: "spring",
            stiffness: 560,
            damping: 48,
            delay: fromRest ? index * 0.02 : 0,
          })
        : animate(progress, 0, {
            type: "spring",
            stiffness: 760,
            damping: 56,
            delay: fromRest ? (count - 1 - index) * 0.01 : 0,
          });
    return () => controls.stop();
  }, [open, index, count, reducedMotion, progress]);

  return (
    <a
      ref={ref}
      href={item.href}
      target={item.target}
      rel={item.rel}
      data-card-vortex-card=""
      className={[
        "group/card invisible absolute top-1/2 left-1/2 block w-[var(--card-vortex-card-width,9.5rem)] opacity-0 will-change-transform outline-none hover:z-30! focus-visible:z-30!",
        open ? "" : "pointer-events-none",
      ].join(" ")}
      draggable={false}
    >
      <span className="block rounded-[calc(var(--radius,0.5rem)+2px)] border border-[var(--card-vortex-border)] bg-[var(--card-vortex-card)] p-1 text-[var(--card-vortex-foreground)] [box-shadow:var(--card-vortex-shadow)] transition-transform duration-200 ease-out group-hover/card:scale-[1.05] group-focus-visible/card:scale-[1.05] group-focus-visible/card:outline-2 group-focus-visible/card:outline-offset-2 group-focus-visible/card:outline-[var(--card-vortex-accent)] group-active/card:scale-[0.98] group-active/card:duration-100 motion-reduce:transition-none motion-reduce:group-hover/card:scale-100 motion-reduce:group-focus-visible/card:scale-100">
        <span className="flex h-6 items-center justify-between gap-2 px-1.5">
          <span className="truncate text-xs leading-none font-medium">{item.title}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-3 shrink-0 transition-transform duration-200 ease-out group-hover/card:scale-110 motion-reduce:transition-none"
          >
            <path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9" />
          </svg>
        </span>
        <span className="relative mt-1 block h-[var(--card-vortex-image-height,5rem)] overflow-hidden rounded-[var(--radius,0.5rem)] bg-[var(--card-vortex-image)]">
          {item.image}
        </span>
      </span>
    </a>
  );
}

export function CardVortex({
  children,
  items,
  radius = 165,
  startAngle = -90,
  fromAngle = 45,
  open: controlledOpen,
  onOpenChange,
  ariaLabel = "Related pages",
  className,
  style,
}: CardVortexProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchWasOpen = useRef<boolean | null>(null);
  const skipFocusOpen = useRef(false);
  const navId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [layout, setLayout] = useState<Layout>({
    fit: 1,
    reach: 0,
    offsetX: 0,
    offsetY: 0,
    cardWidth: 0,
  });
  const reducedMotion = useReducedMotion() ?? false;
  const open = controlledOpen ?? uncontrolledOpen;

  // Fit the ring inside the viewport, or inside a [data-card-vortex-boundary] ancestor.
  // It scales down only as far as it must to fit at all, then moves its center away
  // from any edge it would still cross, so the cards stay readable near an edge.
  const measure = useCallback(() => {
    const root = rootRef.current;
    const card = root?.querySelector<HTMLElement>("[data-card-vortex-card]");
    if (!root || !card) return;
    const bounds = root.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const area = root.closest("[data-card-vortex-boundary]")?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + EDGE;
    const bottom = area.bottom - EDGE;
    const cardWidth = card.offsetWidth;
    const halfWidth = cardWidth / 2;
    const halfHeight = card.offsetHeight / 2;
    const fit = Math.max(
      MIN_FIT,
      Math.min(1, (right - left) / (2 * (radius + halfWidth)), (bottom - top) / (2 * (radius + halfHeight))),
    );
    const next: Layout = {
      fit,
      reach: Math.round(fit * (radius + Math.hypot(halfWidth, halfHeight))),
      offsetX: Math.round(shiftInto(x, fit * (radius + halfWidth), left, right)),
      offsetY: Math.round(shiftInto(y, fit * (radius + halfHeight), top, bottom)),
      cardWidth,
    };
    setLayout((current) =>
      Math.abs(current.fit - next.fit) < 0.001 &&
      current.reach === next.reach &&
      current.offsetX === next.offsetX &&
      current.offsetY === next.offsetY &&
      current.cardWidth === next.cardWidth
        ? current
        : next,
    );
  }, [radius]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      setUncontrolledOpen(next);
      if (next !== open) onOpenChange?.(next);
    },
    [onOpenChange, open],
  );

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  // Measure before the browser paints, so the first frame of the cards already uses it.
  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("resize", measure);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open, measure, setOpen]);

  // Tell assistive technology that the trigger opens the cards' nav.
  useEffect(() => {
    const control = triggerRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    if (!control) return;
    control.setAttribute("aria-expanded", String(open));
    control.setAttribute("aria-controls", navId);
    return () => {
      control.removeAttribute("aria-expanded");
      control.removeAttribute("aria-controls");
    };
  }, [open, navId]);

  if (items.length === 0) return <>{children}</>;

  return (
    <div
      ref={rootRef}
      data-card-vortex=""
      data-state={open ? "open" : "closed"}
      className={["relative inline-flex", open ? "z-[var(--card-vortex-z,40)]" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ ...cardVortexTheme, ...style }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") cancelClose();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") scheduleClose();
      }}
      onFocus={(event) => {
        if (skipFocusOpen.current) return;
        let keyboard = true;
        try {
          keyboard = event.target.matches(":focus-visible");
        } catch {
          // Older engines without :focus-visible open on any focus.
        }
        if (keyboard) setOpen(true);
      }}
      onBlur={(event) => {
        const root = event.currentTarget;
        if (root.contains(event.relatedTarget)) return;
        if (!root.matches(":hover")) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        // Return focus to the trigger without that focus opening the ring again.
        if (!triggerRef.current?.contains(document.activeElement)) {
          skipFocusOpen.current = true;
          triggerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
          skipFocusOpen.current = false;
        }
        setOpen(false);
      }}
    >
      {/* Covers the ring while it is open so the pointer can cross the gaps between
          cards. A press on it, between the cards, closes the ring. */}
      <span
        aria-hidden="true"
        data-card-vortex-area=""
        className={["absolute top-1/2 left-1/2 rounded-full", open ? "" : "pointer-events-none"].join(" ")}
        style={{
          width: layout.reach * 2,
          height: layout.reach * 2,
          transform: `translate(-50%,-50%) translate(${layout.offsetX}px,${layout.offsetY}px)`,
        }}
        onPointerDown={() => setOpen(false)}
      />
      <div
        ref={triggerRef}
        data-card-vortex-trigger=""
        className="relative inline-flex"
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") setOpen(true);
        }}
        onPointerDown={(event) => {
          touchWasOpen.current = event.pointerType === "touch" ? open : null;
        }}
        onClick={(event) => {
          // A tap toggles. Focus from the same tap may already have opened it.
          const wasOpen = touchWasOpen.current;
          touchWasOpen.current = null;
          if (wasOpen === null) return;
          // The first tap on a link trigger opens the ring; the next one follows the link.
          if (!wasOpen) event.preventDefault();
          setOpen(!wasOpen);
        }}
      >
        {children}
      </div>
      <nav id={navId} aria-label={ariaLabel} className="absolute top-1/2 left-1/2 size-0">
        {items.map((item, index) => (
          <VortexCard
            key={item.id}
            item={item}
            index={index}
            count={items.length}
            open={open}
            geometry={{
              fit: layout.fit,
              offsetX: layout.offsetX,
              offsetY: layout.offsetY,
              cardWidth: layout.cardWidth,
              angle: startAngle + (index * 360) / items.length,
              radius,
              fromAngle,
              reducedMotion,
            }}
          />
        ))}
      </nav>
    </div>
  );
}
