"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

// Motion's useReducedMotion reads the media query on the first client render, which the server
// cannot know. Applying it only after hydration keeps the client's first render identical to the
// server HTML; React re-renders with the real preference right after hydrating.
const subscribeNever = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

export type SkeletonAnimation = "shimmer" | "pulse" | "none";
export type SkeletonDirection = "right" | "left" | "down" | "up";

interface SkeletonSettings {
  animation: SkeletonAnimation;
  direction: SkeletonDirection;
  cycle: number;
}

interface SkeletonContextValue extends SkeletonSettings {
  /** True inside a loading Skeleton, which already announces the busy state. */
  nested: boolean;
}

const SkeletonContext = createContext<SkeletonContextValue | null>(null);

// Shimmer bands repeat every SPAN pixels of page space, so one band crosses a card at a time.
const SPAN = 1000;
// Longest loop, in seconds. Slower sweeps and pulses drift toward the 0.2 Hz sway that is most
// likely to cause motion discomfort, so longer cycles are capped here.
const MAX_CYCLE = 2.5;
// The two layers swap on one spring. Content settles in from a slight blur and scale while the
// placeholder softens out, so the handover reads as one surface coming into focus.
const CONTENT_HIDDEN = { opacity: 0, scale: 0.99, filter: "blur(4px)" };
const CONTENT_SHOWN = { opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } };
const PLACEHOLDER_WAITING = { opacity: 0, filter: "blur(0px)" };
const PLACEHOLDER_SHOWN = { opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } };
const PLACEHOLDER_GONE = { opacity: 0, filter: "blur(3px)" };
const LEAVING = "pointer-events-none absolute inset-x-0 top-0";

type Layer = "placeholder" | "content";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface Placeholder {
  shape: HTMLElement;
  band: HTMLElement | null;
  settings: SkeletonSettings;
  animation?: Animation;
}

// Every placeholder on the page is measured in the same frame and runs on the document timeline
// from time zero, so neighbors share one clock and one band instead of starting their own loops.
const placeholders = new Set<Placeholder>();
let frame = 0;
let observer: ResizeObserver | undefined;

function syncAll() {
  frame = 0;
  for (const placeholder of placeholders) sync(placeholder);
}

function scheduleSync() {
  if (!frame) frame = requestAnimationFrame(syncAll);
}

function sync(placeholder: Placeholder) {
  const { shape, band, settings } = placeholder;
  placeholder.animation?.cancel();
  placeholder.animation = undefined;
  if (typeof shape.animate !== "function") return;
  const period = Math.min(settings.cycle, MAX_CYCLE) * 1000;

  let animation: Animation;
  if (settings.animation === "pulse") {
    animation = shape.animate([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], {
      duration: period,
      iterations: Infinity,
      easing: "ease-in-out",
    });
  } else {
    if (!band) return;
    const horizontal = settings.direction === "right" || settings.direction === "left";
    const box = shape.getBoundingClientRect();
    const page = horizontal ? box.left + window.scrollX : box.top + window.scrollY;
    // The band layer is a strip of SPAN-sized tiles. Offsetting it by the page position lines its
    // tiles up with every other placeholder's, and one tile of travel per cycle loops seamlessly.
    const start = -(((page % SPAN) + SPAN) % SPAN) - SPAN;
    const forward = settings.direction === "right" || settings.direction === "down";
    const axis = horizontal ? "X" : "Y";
    const from = forward ? start : start + SPAN;
    const to = forward ? start + SPAN : start;
    animation = band.animate(
      [{ transform: `translate${axis}(${from}px)` }, { transform: `translate${axis}(${to}px)` }],
      { duration: period, iterations: Infinity, easing: "linear" },
    );
  }
  animation.startTime = 0;
  placeholder.animation = animation;
}

function register(placeholder: Placeholder) {
  if (placeholders.size === 0) {
    window.addEventListener("resize", scheduleSync);
    if (typeof ResizeObserver === "function") observer = new ResizeObserver(() => scheduleSync());
  }
  placeholders.add(placeholder);
  observer?.observe(placeholder.shape);
  scheduleSync();
  return () => {
    placeholder.animation?.cancel();
    placeholders.delete(placeholder);
    observer?.unobserve(placeholder.shape);
    if (placeholders.size === 0) {
      window.removeEventListener("resize", scheduleSync);
      observer?.disconnect();
      observer = undefined;
    }
  };
}

function useSyncedAnimation(
  shape: RefObject<HTMLElement | null>,
  band: RefObject<HTMLElement | null>,
  { animation, direction, cycle }: SkeletonSettings,
) {
  useEffect(() => {
    if (!shape.current || animation === "none") return;
    return register({ shape: shape.current, band: band.current, settings: { animation, direction, cycle } });
  }, [shape, band, animation, direction, cycle]);
}

function useSettings({ animation, direction, cycle }: Partial<SkeletonSettings>) {
  const parent = useContext(SkeletonContext);
  const hydrated = useHydrated();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = hydrated && prefersReducedMotion === true;
  const settings: SkeletonSettings = {
    animation: animation ?? parent?.animation ?? "shimmer",
    direction: direction ?? parent?.direction ?? "right",
    cycle: cycle ?? parent?.cycle ?? 1.6,
  };
  if (reducedMotion || !Number.isFinite(settings.cycle) || settings.cycle <= 0) settings.animation = "none";
  return { settings, nested: parent?.nested ?? false };
}

interface ShapeProps extends Partial<SkeletonSettings> {
  className?: string;
  style?: CSSProperties;
}

function Shape({
  settings,
  label,
  className = "",
  style,
}: {
  settings: SkeletonSettings;
  /** Announced while busy. Shapes inside a loading Skeleton pass none and stay hidden. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const shape = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLSpanElement>(null);
  useSyncedAnimation(shape, band, settings);
  const horizontal = settings.direction === "right" || settings.direction === "left";
  const radius = /(^|\s)rounded(-|\s|$)/.test(className) ? "" : "rounded-md";

  return (
    <div
      ref={shape}
      aria-hidden={label === undefined || undefined}
      aria-busy={label !== undefined || undefined}
      data-slot="skeleton-shape"
      data-animation={settings.animation}
      className={`bg-muted relative overflow-hidden ${radius} ${className}`}
      style={style}
    >
      {label !== undefined && <span className="sr-only">{label}</span>}
      {settings.animation === "shimmer" && (
        <span
          ref={band}
          aria-hidden="true"
          data-slot="skeleton-shimmer"
          className={
            horizontal
              ? "via-background/70 dark:via-foreground/10 pointer-events-none absolute inset-y-0 left-0 w-[calc(100%+2000px)] bg-linear-to-r from-transparent from-38% via-50% to-transparent to-62% bg-size-[1000px_100%] bg-repeat-x"
              : "via-background/70 dark:via-foreground/10 pointer-events-none absolute inset-x-0 top-0 h-[calc(100%+2000px)] bg-linear-to-b from-transparent from-38% via-50% to-transparent to-62% bg-size-[100%_1000px] bg-repeat-y"
          }
          style={{ transform: `translate${horizontal ? "X" : "Y"}(-${SPAN}px)` }}
        />
      )}
    </div>
  );
}

export interface SkeletonProps extends ShapeProps {
  /** While true, the placeholder stands in for the children. When it turns false, the two swap. */
  loading?: boolean;
  /** Placeholder layout shown while loading, such as SkeletonText. Without it, one block covers the children. */
  fallback?: ReactNode;
  /** Real content. Without children or a fallback, Skeleton renders a single placeholder shape. */
  children?: ReactNode;
  /** Visually hidden text announced while loading. */
  loadingLabel?: string;
  /** Seconds the swap spring takes to settle, for the crossfade and the height change. Zero swaps instantly. */
  duration?: number;
  /** Seconds to wait before the placeholder appears. A load that finishes sooner never shows it. */
  delay?: number;
  /** Shortest time in seconds the placeholder stays up once it has appeared, so it cannot flicker. */
  minVisible?: number;
}

export function Skeleton({
  loading = true,
  fallback,
  children,
  loadingLabel = "Loading",
  duration = 0.4,
  delay = 0.12,
  minVisible = 0.38,
  animation,
  direction,
  cycle,
  className,
  style,
}: SkeletonProps) {
  const { settings, nested } = useSettings({ animation, direction, cycle });

  if (children === undefined && fallback === undefined) {
    return (
      <Shape
        settings={settings}
        label={nested ? undefined : loadingLabel}
        className={className}
        style={style}
      />
    );
  }

  return (
    <Reveal
      loading={loading}
      fallback={fallback}
      loadingLabel={loadingLabel}
      duration={duration}
      delay={delay}
      minVisible={minVisible}
      settings={settings}
      className={className}
      style={style}
    >
      {children}
    </Reveal>
  );
}

function toMilliseconds(seconds: number, fallback: number) {
  return (Number.isFinite(seconds) ? Math.max(0, seconds) : fallback) * 1000;
}

// Whether the placeholder should be painted. It waits out `delay` before appearing, so a fast load
// never flashes it, and once up it stays for at least `minVisible`, so a load that ends just after
// it appears does not flicker.
function usePlaceholderTiming(loading: boolean, delay: number, minVisible: number) {
  const hydrated = useHydrated();
  const wait = toMilliseconds(delay, 0.12);
  const hold = toMilliseconds(minVisible, 0.38);
  // Server-rendered placeholders are already on screen when React hydrates, so they skip the wait.
  const [visible, setVisible] = useState(() => loading && (!hydrated || wait === 0));
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) shownAt.current = null;
    else if (shownAt.current === null) shownAt.current = performance.now();
    if (loading === visible) return;
    const timer = window.setTimeout(
      () => setVisible(loading),
      loading ? wait : Math.max(0, hold - (performance.now() - (shownAt.current ?? 0))),
    );
    return () => window.clearTimeout(timer);
  }, [loading, visible, wait, hold]);

  return visible;
}

function Reveal({
  loading,
  fallback,
  children,
  loadingLabel,
  duration,
  delay,
  minVisible,
  settings,
  className = "",
  style,
}: {
  loading: boolean;
  fallback: ReactNode;
  children: ReactNode;
  loadingLabel: string;
  duration: number;
  delay: number;
  minVisible: number;
  settings: SkeletonSettings;
  className?: string;
  style?: CSSProperties;
}) {
  const hydrated = useHydrated();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = hydrated && prefersReducedMotion === true;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.4;
  const transition =
    seconds === 0 ? { duration: 0 } : { type: "spring" as const, visualDuration: seconds, bounce: 0 };
  const visible = usePlaceholderTiming(loading, delay, minVisible);
  const overlay = fallback === undefined;
  const container = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const placeholder = useRef<HTMLDivElement>(null);
  const restHeight = useRef(0);
  const swapping = useRef(false);
  const heightAnimation = useRef<ReturnType<typeof animate> | null>(null);

  // `layer` is the one in the layout; `leaving` is the other, kept mounted until it has faded out.
  // While a reload waits out its delay the content stays put, so `layer` only changes on a swap.
  const [swap, setSwap] = useState<{ layer: Layer; leaving: Layer | null }>({
    layer: loading ? "placeholder" : "content",
    leaving: null,
  });
  const layer: Layer = visible ? "placeholder" : loading ? swap.layer : "content";
  if (layer !== swap.layer) setSwap({ layer, leaving: seconds > 0 ? swap.layer : null });
  const leaving = layer === swap.layer ? swap.leaving : null;
  const previous = useRef(layer);
  const busy = loading || layer === "placeholder";
  const showContent = overlay || layer === "content" || leaving === "content";
  const showPlaceholder = layer === "placeholder" || leaving === "placeholder";

  function settle(done: Layer) {
    setSwap((current) => (current.leaving === done ? { ...current, leaving: null } : current));
  }

  // Remember the height at rest, even across resizes, so a swap can start from it.
  useIsomorphicLayoutEffect(() => {
    swapping.current = leaving !== null;
    if (!swapping.current && !heightAnimation.current && container.current) {
      restHeight.current = container.current.offsetHeight;
    }
  });
  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver !== "function") return;
    const resize = new ResizeObserver(() => {
      if (!swapping.current && !heightAnimation.current) restHeight.current = element.offsetHeight;
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, []);

  useIsomorphicLayoutEffect(() => {
    const element = container.current;
    const before = previous.current;
    previous.current = layer;
    if (!element || before === layer) return;
    // A swap that interrupts another starts from wherever the height had reached.
    const from = heightAnimation.current ? element.offsetHeight : restHeight.current;
    heightAnimation.current?.stop();
    heightAnimation.current = null;
    element.style.height = "";
    element.style.overflow = "";
    const incoming = layer === "content" ? content.current : placeholder.current;
    if (seconds === 0 || overlay || !incoming) return;
    // Hold the outgoing height, then spring to the incoming layer's own height.
    const to = incoming.offsetHeight;
    if (Math.abs(from - to) < 1) return;
    element.style.overflow = "hidden";
    element.style.height = `${from}px`;
    const controls = animate(
      element,
      { height: [`${from}px`, `${to}px`] },
      { type: "spring", visualDuration: seconds, bounce: 0, delay: to < from ? seconds * 0.3 : 0 },
    );
    heightAnimation.current = controls;
    controls.then(() => {
      if (heightAnimation.current !== controls) return;
      heightAnimation.current = null;
      element.style.height = "";
      element.style.overflow = "";
      restHeight.current = element.offsetHeight;
    });
  }, [layer, seconds, overlay]);
  useEffect(() => () => heightAnimation.current?.stop(), []);

  return (
    <SkeletonContext.Provider value={{ ...settings, nested: true }}>
      <div
        ref={container}
        data-slot="skeleton"
        data-state={busy ? "loading" : "loaded"}
        aria-busy={busy || undefined}
        className={`relative ${className}`}
        style={style}
      >
        {busy && <span className="sr-only">{loadingLabel}</span>}
        {showContent && (
          <motion.div
            ref={content}
            data-slot="skeleton-content"
            aria-hidden={layer !== "content" || undefined}
            inert={layer !== "content"}
            className={`origin-top-left ${!overlay && layer !== "content" ? LEAVING : ""}`}
            // Content that mounts during a swap starts hidden; content there from the start does not.
            initial={leaving === "placeholder" ? CONTENT_HIDDEN : false}
            animate={layer === "content" ? CONTENT_SHOWN : CONTENT_HIDDEN}
            transition={transition}
            onAnimationComplete={(target) => {
              if (target === CONTENT_HIDDEN) settle("content");
            }}
          >
            {children}
          </motion.div>
        )}
        {showPlaceholder && (
          <motion.div
            ref={placeholder}
            data-slot="skeleton-placeholder"
            aria-hidden="true"
            className={
              overlay ? "pointer-events-none absolute inset-0" : layer === "placeholder" ? undefined : LEAVING
            }
            initial={leaving === "content" ? PLACEHOLDER_WAITING : false}
            animate={
              layer !== "placeholder" ? PLACEHOLDER_GONE : visible ? PLACEHOLDER_SHOWN : PLACEHOLDER_WAITING
            }
            transition={transition}
            onAnimationComplete={(target) => {
              if (target === PLACEHOLDER_GONE) settle("placeholder");
            }}
          >
            {overlay ? <Shape settings={settings} className="size-full" /> : fallback}
          </motion.div>
        )}
      </div>
    </SkeletonContext.Provider>
  );
}

export interface SkeletonTextProps extends ShapeProps {
  /** Number of lines. */
  lines?: number;
  /** Width of the last line, as any CSS width. */
  lastLineWidth?: string;
  /** Visually hidden text announced when used outside a loading Skeleton. */
  loadingLabel?: string;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  loadingLabel = "Loading",
  className = "",
  style,
  ...rest
}: SkeletonTextProps) {
  const { settings, nested } = useSettings(rest);
  const count = Math.max(1, Math.round(lines));

  return (
    <div
      data-slot="skeleton-text"
      aria-hidden={nested || undefined}
      aria-busy={!nested || undefined}
      className={`grid gap-2 ${className}`}
      style={style}
    >
      {!nested && <span className="sr-only">{loadingLabel}</span>}
      {Array.from({ length: count }, (_, index) => (
        <Shape
          key={index}
          settings={settings}
          className="h-3.5"
          style={{ width: count > 1 && index === count - 1 ? lastLineWidth : "100%" }}
        />
      ))}
    </div>
  );
}

export interface SkeletonAvatarProps extends ShapeProps {
  /** Width and height in pixels. */
  size?: number;
  /** A `circle` or a rounded `square`. */
  shape?: "circle" | "square";
  /** Visually hidden text announced when used outside a loading Skeleton. */
  loadingLabel?: string;
}

export function SkeletonAvatar({
  size = 40,
  shape = "circle",
  loadingLabel = "Loading",
  className = "",
  style,
  ...rest
}: SkeletonAvatarProps) {
  const { settings, nested } = useSettings(rest);

  return (
    <Shape
      settings={settings}
      label={nested ? undefined : loadingLabel}
      className={`shrink-0 ${shape === "circle" ? "rounded-full" : "rounded-lg"} ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
}
