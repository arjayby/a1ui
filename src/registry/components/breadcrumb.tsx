"use client";

import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

export interface BreadcrumbSegment {
  /** Visible text for the segment. */
  label: ReactNode;
  /** Destination. Segments without one render as plain text. The last segment is always the current page. */
  href?: string;
  /** Stable identity used to animate the segment. Defaults to its position and label text. */
  key?: string;
}

export interface BreadcrumbLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  "data-slot": "breadcrumb-link";
}

export interface BreadcrumbProps {
  /** The trail from the root to the current page. */
  items: BreadcrumbSegment[];
  /** Collapse the middle segments once the trail is longer than this. */
  maxItems?: number;
  /** Segments kept before the "…" button when collapsed. @default 1 */
  itemsBeforeCollapse?: number;
  /** Segments kept after the "…" button when collapsed, including the current page. @default 2 */
  itemsAfterCollapse?: number;
  /**
   * Also collapse when the trail does not fit on one line. Measures the nav's own width, which
   * fills its container by default. @default true
   */
  collapseToFit?: boolean;
  /** Whether the collapsed segments are shown, when controlled by the caller. */
  expanded?: boolean;
  /** Initial expanded state when uncontrolled. @default false */
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Renders each link, for example with Next.js `Link`. Defaults to an `<a>`. */
  renderLink?: (props: BreadcrumbLinkProps, item: BreadcrumbSegment) => ReactNode;
  /** Replaces the chevron between segments. */
  separator?: ReactNode;
  /** Slide and reflow time in seconds. Zero, or reduced motion, swaps segments instantly. */
  duration?: number;
  /** @default "Breadcrumb" */
  "aria-label"?: string;
  className?: string;
}

type Range = { before: number; after: number };
type Custom = { reveal: boolean; delay: number };

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const subscribeNever = () => () => {};
// The hidden measuring copy only renders where it can be observed, so servers and test DOMs see one trail.
const useCanMeasure = () =>
  useSyncExternalStore(
    subscribeNever,
    () => typeof ResizeObserver !== "undefined",
    () => false,
  );

const listClass = "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground";
const itemClass = "inline-flex min-w-0 items-center gap-1.5";
const linkClass =
  "truncate rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30";
const pageClass = "truncate font-semibold text-foreground";

function clampRange(count: number, before: number, after: number): Range | null {
  if (count < 2) return null;
  const kept = Math.min(Math.max(1, Math.floor(after)), count - 1);
  return { before: Math.min(Math.max(0, Math.floor(before)), count - kept - 1), after: kept };
}

/** Collapses from the middle outward until the kept segments and the "…" button fit. */
function fitRange(
  widths: number[],
  ellipsis: number,
  gap: number,
  available: number,
  before: number,
  after: number,
): Range | null {
  const count = widths.length;
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, count - 1);
  if (available <= 0 || total <= available - 1) return null;
  let range = clampRange(count, before, after);
  while (range) {
    const kept = [...widths.slice(0, range.before), ...widths.slice(count - range.after)];
    const width = kept.reduce((sum, value) => sum + value, 0) + ellipsis + gap * kept.length;
    if (width <= available - 1) return range;
    if (range.after > 1) range = { ...range, after: range.after - 1 };
    else if (range.before > 0) range = { ...range, before: range.before - 1 };
    else return range;
  }
  return null;
}

function mergeRanges(a: Range | null, b: Range | null): Range | null {
  if (!a || !b) return a ?? b;
  return { before: Math.min(a.before, b.before), after: Math.min(a.after, b.after) };
}

function ChevronSeparator() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3.5" aria-hidden="true">
      <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Segments on their way out stay visible while they animate, but leave the accessibility tree and tab order.
function Segment({ ref, ...props }: HTMLMotionProps<"li"> & { ref?: Ref<HTMLLIElement> }) {
  const present = useIsPresent();
  return <motion.li ref={ref} {...props} aria-hidden={present ? undefined : true} inert={!present} />;
}

function defaultRenderLink(props: BreadcrumbLinkProps) {
  return <a {...props} />;
}

export function Breadcrumb({
  items,
  maxItems,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 2,
  collapseToFit = true,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  renderLink = defaultRenderLink,
  separator = <ChevronSeparator />,
  duration = 0.3,
  "aria-label": ariaLabel = "Breadcrumb",
  className,
}: BreadcrumbProps) {
  const reducedMotion = useReducedMotion();
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;
  const [expandedState, setExpandedState] = useState(defaultExpanded);
  const expanded = expandedProp ?? expandedState;
  const [fit, setFit] = useState<Range | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLOListElement>(null);
  // Where focus goes after the next commit: the first revealed segment, or the "…" button.
  const measuring = useCanMeasure() && collapseToFit;
  const pendingFocus = useRef<number | "ellipsis" | null>(null);

  const count = items.length;
  const byCount =
    maxItems !== undefined && count > Math.max(1, maxItems)
      ? clampRange(count, itemsBeforeCollapse, itemsAfterCollapse)
      : null;
  const collapsible = mergeRanges(byCount, measuring ? fit : null);
  const range = expanded ? null : collapsible;

  const setExpanded = (next: boolean) => {
    if (next === expanded) return;
    if (expandedProp === undefined) setExpandedState(next);
    onExpandedChange?.(next);
  };

  // The hidden copy below always holds the whole trail, so measuring it never feeds back into
  // what is shown. It is re-read whenever the container or the trail changes size.
  useIsomorphicLayoutEffect(() => {
    const nav = navRef.current;
    const list = measureRef.current;
    if (!measuring || !nav || !list) return;
    const measure = () => {
      const children = [...list.children] as HTMLElement[];
      const ellipsis = children.pop();
      const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
      const next = fitRange(
        children.map((child) => child.getBoundingClientRect().width),
        ellipsis?.getBoundingClientRect().width ?? 0,
        gap,
        nav.clientWidth,
        itemsBeforeCollapse,
        itemsAfterCollapse,
      );
      setFit((previous) =>
        previous?.before === next?.before && previous?.after === next?.after ? previous : next,
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measuring, itemsBeforeCollapse, itemsAfterCollapse, items]);

  useEffect(() => {
    const target = pendingFocus.current;
    const nav = navRef.current;
    if (target === null || !nav) return;
    pendingFocus.current = null;
    const scope =
      target === "ellipsis"
        ? nav.querySelector<HTMLElement>('[data-slot="breadcrumb-ellipsis"]')
        : nav.querySelector<HTMLElement>(
            `[data-index="${target}"] :is(a[href], button, [tabindex]:not([tabindex="-1"]))`,
          );
    (scope ?? nav.querySelector<HTMLElement>('[data-slot="breadcrumb-list"]'))?.focus();
  }, [expanded]);

  const spring: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.15 };
  const stagger = seconds * 0.15;
  const segmentVariants: Variants = {
    hidden: ({ reveal }: Custom) => ({ opacity: 0, x: reveal ? -8 : 16 }),
    shown: ({ delay }: Custom) => ({ opacity: 1, x: 0, transition: { ...spring, delay } }),
    exit: ({ reveal }: Custom) => ({
      opacity: 0,
      x: reveal ? -8 : 16,
      transition: seconds === 0 ? { duration: 0 } : { duration: seconds * 0.6, ease: "easeIn" },
    }),
  };
  const fade: Transition = seconds === 0 ? { duration: 0 } : { duration: seconds, delay: seconds * 0.3 };

  // Position plus label text, so a page keeps its identity when it gains an href on the way deeper.
  const keyOf = (item: BreadcrumbSegment, index: number) =>
    item.key ??
    `${index}:${typeof item.label === "string" || typeof item.label === "number" ? item.label : ""}`;
  const visible: (number | "ellipsis")[] = range
    ? [
        ...items.slice(0, range.before).map((_, index) => index),
        "ellipsis",
        ...items.slice(count - range.after).map((_, index) => count - range.after + index),
      ]
    : items.map((_, index) => index);
  const hiddenCount = range ? count - range.before - range.after : 0;

  const separatorNode = (
    <motion.span
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      className="text-muted-foreground/70 inline-flex shrink-0"
      initial={seconds > 0 ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={fade}
    >
      {separator}
    </motion.span>
  );

  const renderLabel = (item: BreadcrumbSegment, index: number) => {
    if (index === count - 1) {
      return (
        <span aria-current="page" data-slot="breadcrumb-page" className={pageClass}>
          {item.label}
        </span>
      );
    }
    if (item.href === undefined) {
      return (
        <span data-slot="breadcrumb-text" className="truncate">
          {item.label}
        </span>
      );
    }
    return renderLink(
      { href: item.href, className: linkClass, children: item.label, "data-slot": "breadcrumb-link" },
      item,
    );
  };

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      data-slot="breadcrumb"
      data-collapsed={range ? "" : undefined}
      className={`relative w-full min-w-0 ${className ?? ""}`}
      onBlur={(event: FocusEvent<HTMLElement>) => {
        if (expanded && !event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Escape" || !expanded || !collapsible) return;
        event.preventDefault();
        event.stopPropagation();
        pendingFocus.current = "ellipsis";
        setExpanded(false);
      }}
    >
      <ol data-slot="breadcrumb-list" tabIndex={-1} className={`relative outline-none ${listClass}`}>
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((entry, position) => {
            if (entry === "ellipsis") {
              return (
                <Segment
                  key="breadcrumb-ellipsis"
                  layout={seconds > 0 ? "position" : false}
                  className={itemClass}
                  initial={seconds > 0 ? { opacity: 0, scale: 0.8 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    transition: seconds === 0 ? { duration: 0 } : { duration: seconds * 0.5 },
                  }}
                  transition={spring}
                >
                  {position > 0 && separatorNode}
                  <button
                    type="button"
                    data-slot="breadcrumb-ellipsis"
                    aria-label={`Show ${hiddenCount} hidden ${hiddenCount === 1 ? "page" : "pages"}`}
                    className="hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 inline-flex h-6 min-w-6 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3"
                    onClick={() => {
                      if (collapsible) pendingFocus.current = collapsible.before;
                      setExpanded(true);
                    }}
                  >
                    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
                      <circle cx="3.5" cy="8" r="1.25" />
                      <circle cx="8" cy="8" r="1.25" />
                      <circle cx="12.5" cy="8" r="1.25" />
                    </svg>
                  </button>
                </Segment>
              );
            }
            const item = items[entry];
            const revealed =
              collapsible !== null && entry >= collapsible.before && entry < count - collapsible.after;
            const custom: Custom = {
              reveal: revealed,
              delay: revealed && collapsible ? (entry - collapsible.before) * stagger : 0,
            };
            return (
              <Segment
                key={keyOf(item, entry)}
                data-slot="breadcrumb-item"
                data-index={entry}
                layout={seconds > 0 ? "position" : false}
                className={itemClass}
                custom={custom}
                variants={segmentVariants}
                initial={seconds > 0 ? "hidden" : false}
                animate="shown"
                exit="exit"
                transition={spring}
              >
                {position > 0 && separatorNode}
                {renderLabel(item, entry)}
              </Segment>
            );
          })}
        </AnimatePresence>
      </ol>
      {measuring && (
        <div aria-hidden="true" className="pointer-events-none invisible absolute inset-0 overflow-hidden">
          <ol ref={measureRef} className={`absolute top-0 left-0 w-max flex-nowrap! ${listClass}`}>
            {items.map((item, index) => (
              <li key={keyOf(item, index)} className={itemClass}>
                {index > 0 && <span className="inline-flex shrink-0">{separator}</span>}
                <span className={index === count - 1 ? pageClass : undefined}>{item.label}</span>
              </li>
            ))}
            <li className={itemClass}>
              <span className="inline-flex shrink-0">{separator}</span>
              <span className="inline-flex h-6 min-w-6" />
            </li>
          </ol>
        </div>
      )}
    </nav>
  );
}
