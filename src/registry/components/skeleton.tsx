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
const EASE = [0.22, 1, 0.36, 1] as const;
const HIDDEN = { opacity: 0, filter: "blur(8px)" };
const SHOWN = { opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } };

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
  /** While true, shows the placeholder. When it turns false, the children blur and fade in. */
  loading?: boolean;
  /** Placeholder layout shown while loading, such as SkeletonText. Without it, one block covers the children. */
  fallback?: ReactNode;
  /** Real content. Without children or a fallback, Skeleton renders a single placeholder shape. */
  children?: ReactNode;
  /** Visually hidden text announced while loading. */
  loadingLabel?: string;
  /** Reveal time in seconds for the blur, fade, and height change. Zero swaps instantly. */
  duration?: number;
}

export function Skeleton({
  loading = true,
  fallback,
  children,
  loadingLabel = "Loading",
  duration = 0.5,
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
      settings={settings}
      className={className}
      style={style}
    >
      {children}
    </Reveal>
  );
}

function Reveal({
  loading,
  fallback,
  children,
  loadingLabel,
  duration,
  settings,
  className = "",
  style,
}: {
  loading: boolean;
  fallback: ReactNode;
  children: ReactNode;
  loadingLabel: string;
  duration: number;
  settings: SkeletonSettings;
  className?: string;
  style?: CSSProperties;
}) {
  const hydrated = useHydrated();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = hydrated && prefersReducedMotion === true;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.5;
  const overlay = fallback === undefined;
  const container = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(loading);
  const loadingHeight = useRef(0);
  const previous = useRef(loading);
  const heightAnimation = useRef<ReturnType<typeof animate> | null>(null);
  // The placeholder stays mounted after loading ends until it has faded out.
  const [placeholderShown, setPlaceholderShown] = useState(loading);
  if (loading && !placeholderShown) setPlaceholderShown(true);
  if (!loading && seconds === 0 && placeholderShown) setPlaceholderShown(false);
  const showPlaceholder = loading || placeholderShown;
  const showContent = !loading || overlay;

  // Remember the loading height, even across resizes, so the reveal can start from it.
  useIsomorphicLayoutEffect(() => {
    loadingRef.current = loading;
    if (loading && container.current) loadingHeight.current = container.current.offsetHeight;
  });
  useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver !== "function") return;
    const resize = new ResizeObserver(() => {
      if (loadingRef.current) loadingHeight.current = element.offsetHeight;
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, []);

  useIsomorphicLayoutEffect(() => {
    const element = container.current;
    const wasLoading = previous.current;
    previous.current = loading;
    if (!element || wasLoading === loading) return;
    heightAnimation.current?.stop();
    heightAnimation.current = null;
    element.style.height = "";
    element.style.overflow = "";
    if (loading || seconds === 0 || !content.current) return;
    // Hold the loading height, then ease to the content's own height.
    const from = loadingHeight.current;
    const to = content.current.offsetHeight;
    if (Math.abs(from - to) < 1) return;
    element.style.overflow = "hidden";
    element.style.height = `${from}px`;
    const controls = animate(
      element,
      { height: [`${from}px`, `${to}px`] },
      { duration: seconds, ease: EASE, delay: to < from ? seconds * 0.3 : 0 },
    );
    heightAnimation.current = controls;
    controls.then(() => {
      if (heightAnimation.current !== controls) return;
      heightAnimation.current = null;
      element.style.height = "";
      element.style.overflow = "";
    });
  }, [loading, seconds]);
  useEffect(() => () => heightAnimation.current?.stop(), []);

  return (
    <SkeletonContext.Provider value={{ ...settings, nested: true }}>
      <div
        ref={container}
        data-slot="skeleton"
        data-state={loading ? "loading" : "loaded"}
        aria-busy={loading || undefined}
        className={`relative ${className}`}
        style={style}
      >
        {loading && <span className="sr-only">{loadingLabel}</span>}
        {showContent && (
          <motion.div
            ref={content}
            data-slot="skeleton-content"
            aria-hidden={loading || undefined}
            inert={loading}
            // Content that mounts during a reveal starts blurred; content there from the start does not.
            initial={placeholderShown ? HIDDEN : false}
            animate={loading ? HIDDEN : SHOWN}
            transition={{ duration: loading ? 0 : seconds, ease: EASE }}
          >
            {children}
          </motion.div>
        )}
        {showPlaceholder && (
          <motion.div
            data-slot="skeleton-placeholder"
            aria-hidden="true"
            className={
              overlay
                ? "pointer-events-none absolute inset-0"
                : loading
                  ? undefined
                  : "pointer-events-none absolute inset-x-0 top-0"
            }
            initial={false}
            animate={{ opacity: loading ? 1 : 0 }}
            transition={{ duration: loading ? 0 : seconds, ease: EASE }}
            onAnimationComplete={() => {
              if (!loadingRef.current) setPlaceholderShown(false);
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
