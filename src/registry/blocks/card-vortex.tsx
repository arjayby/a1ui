"use client";

import { animate, motionValue } from "motion";
import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
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
} as CSSProperties;

const CLOSE_DELAY = 140;
const MIN_FIT = 0.35;

interface Geometry {
  angle: number;
  radius: number;
  fromAngle: number;
  fit: number;
  reducedMotion: boolean;
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
  const { angle, radius, fromAngle, fit, reducedMotion } = geometry;

  // Each card leaves the center heading for a neighbouring position and curves
  // round to its own, growing from a dot and fading in as it goes. The spring writes straight to the element.
  const paint = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const { angle, radius, fromAngle, fit, reducedMotion } = geometryRef.current;
    const p = progress.get();
    const shown = Math.max(0, p);
    const travel = reducedMotion ? 1 : p;
    const theta = ((angle + fromAngle * (1 - travel)) * Math.PI) / 180;
    const distance = radius * fit * travel;
    // A card is a single pixel wide at the center and full size on the ring.
    const dot = 1 / Math.max(1, element.offsetWidth);
    const scale = reducedMotion ? fit : Math.max(dot, fit * Math.min(1, shown));
    element.style.transform = `translate(-50%,-50%) translate3d(${(Math.cos(theta) * distance).toFixed(2)}px,${(Math.sin(theta) * distance).toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
    element.style.opacity = Math.min(1, shown).toFixed(3);
    element.style.visibility = shown > 0.005 ? "visible" : "hidden";
    // Titles sit at the top of each card, so lower cards stack above higher ones.
    element.style.zIndex = String(Math.round((Math.sin((angle * Math.PI) / 180) + 1) * 10) + 1);
  }, [progress]);

  useLayoutEffect(() => {
    geometryRef.current = { angle, radius, fromAngle, fit, reducedMotion };
    paint();
  }, [angle, radius, fromAngle, fit, reducedMotion, paint]);

  useEffect(() => progress.on("change", paint), [progress, paint]);

  useEffect(() => {
    // Cards enter one after another and leave in reverse order. Both springs are
    // critically damped, and starting from the current value keeps a reversal smooth.
    const controls = reducedMotion
      ? animate(progress, open ? 1 : 0, { duration: 0.15, ease: "linear" })
      : open
        ? animate(progress, 1, { type: "spring", stiffness: 560, damping: 48, delay: index * 0.02 })
        : animate(progress, 0, {
            type: "spring",
            stiffness: 760,
            damping: 56,
            delay: (count - 1 - index) * 0.01,
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
      <span className="block rounded-[calc(var(--radius,0.5rem)+2px)] border border-[var(--card-vortex-border)] bg-[var(--card-vortex-card)] p-1 text-[var(--card-vortex-foreground)] transition-transform duration-200 ease-out group-hover/card:scale-[1.05] group-focus-visible/card:scale-[1.05] group-focus-visible/card:outline-2 group-focus-visible/card:outline-offset-2 group-focus-visible/card:outline-[var(--card-vortex-accent)] group-active/card:scale-[0.98] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100 motion-reduce:group-focus-visible/card:scale-100">
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
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [layout, setLayout] = useState({ fit: 1, reach: 0 });
  const reducedMotion = useReducedMotion() ?? false;
  const open = controlledOpen ?? uncontrolledOpen;

  // Shrink the ring when the trigger sits too close to an edge for it to fit:
  // the viewport's sides, or every side of a [data-card-vortex-boundary] ancestor.
  const measure = useCallback(() => {
    const root = rootRef.current;
    const card = root?.querySelector<HTMLElement>("[data-card-vortex-card]");
    if (!root || !card) return;
    const bounds = root.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const boundary = root.closest("[data-card-vortex-boundary]")?.getBoundingClientRect();
    const halfWidth = card.offsetWidth / 2;
    const halfHeight = card.offsetHeight / 2;
    const side = boundary
      ? Math.min(x - boundary.left, boundary.right - x)
      : Math.min(x, window.innerWidth - x);
    let fit = (side - 8) / (radius + halfWidth);
    if (boundary) {
      fit = Math.min(fit, (Math.min(y - boundary.top, boundary.bottom - y) - 8) / (radius + halfHeight));
    }
    fit = Math.max(MIN_FIT, Math.min(1, fit));
    const reach = Math.round(fit * (radius + Math.hypot(halfWidth, halfHeight)));
    setLayout((current) =>
      Math.abs(current.fit - fit) < 0.001 && current.reach === reach ? current : { fit, reach },
    );
  }, [radius]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      if (next) measure();
      setUncontrolledOpen(next);
      if (next !== open) onOpenChange?.(next);
    },
    [measure, onOpenChange, open],
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

  useEffect(() => {
    if (!open) return;
    measure();
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
          triggerRef.current
            ?.querySelector<HTMLElement>("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])")
            ?.focus();
          skipFocusOpen.current = false;
        }
        setOpen(false);
      }}
    >
      {/* Covers the ring while it is open so the pointer can cross the gaps between cards. */}
      <span
        aria-hidden="true"
        className={[
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
          open ? "" : "pointer-events-none",
        ].join(" ")}
        style={{ width: layout.reach * 2, height: layout.reach * 2 }}
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
        onClick={() => {
          // A tap toggles. Focus from the same tap may already have opened it.
          if (touchWasOpen.current !== null) setOpen(!touchWasOpen.current);
          touchWasOpen.current = null;
        }}
      >
        {children}
      </div>
      <nav aria-label={ariaLabel} className="absolute top-1/2 left-1/2 size-0">
        {items.map((item, index) => (
          <VortexCard
            key={item.id}
            item={item}
            index={index}
            count={items.length}
            open={open}
            geometry={{
              angle: startAngle + (index * 360) / items.length,
              radius,
              fromAngle,
              fit: layout.fit,
              reducedMotion,
            }}
          />
        ))}
      </nav>
    </div>
  );
}
