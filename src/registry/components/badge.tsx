"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

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

const variantClasses = {
  default: "bg-foreground text-background border-transparent",
  secondary: "bg-muted text-foreground border-transparent",
  outline: "bg-background text-foreground border-border",
  destructive: "bg-destructive text-background border-transparent",
} as const;

export interface BadgeProps {
  /** Color scheme. */
  variant?: keyof typeof variantClasses;
  /** Text or icons before the count. */
  children?: ReactNode;
  /** Number that rolls between values like an odometer. Negative and fractional values round down to whole numbers. */
  count?: number;
  /** Largest count shown before the badge reads, for example, `99+`. */
  max?: number;
  /** Keeps the badge visible when `count` is 0. Otherwise it pops out. */
  showZero?: boolean;
  /** Words screen readers hear after the count, such as `unread messages`. */
  countLabel?: string;
  /** Shows a status dot before the content. */
  dot?: boolean;
  /** Pulses an expanding ring around the dot. */
  live?: boolean;
  /** Roll, resize, and pop spring duration in seconds. */
  duration?: number;
  className?: string;
}

// Critically damped: discrete count changes settle without overshoot.
const springOrInstant = (visualDuration: number) =>
  visualDuration > 0 ? ({ type: "spring", visualDuration, bounce: 0 } as const) : { duration: 0 };

const toCount = (count: number | undefined) =>
  count === undefined || !Number.isFinite(count) ? undefined : Math.max(0, Math.floor(count));

export function Badge({
  variant = "default",
  children,
  count,
  max,
  showZero = false,
  countLabel,
  dot = false,
  live = false,
  duration = 0.4,
  className,
}: BadgeProps) {
  const hydrated = useHydrated();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = hydrated && prefersReducedMotion === true;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.4;
  const value = toCount(count);
  const cap = max === undefined || !Number.isFinite(max) ? undefined : Math.max(0, Math.floor(max));
  const display = value === undefined ? "" : cap !== undefined && value > cap ? `${cap}+` : `${value}`;
  const visible = value !== 0 || showZero;

  // Digits slide up as the count rises and down as it falls; a rise from zero pops the badge.
  const [previous, setPrevious] = useState(value);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pops, setPops] = useState(0);
  if (value !== previous) {
    setPrevious(value);
    if (value !== undefined && previous !== undefined) setDirection(value > previous ? 1 : -1);
    if (previous === 0 && value !== undefined && value > 0) setPops((total) => total + 1);
  }

  const badge = visible && (
    <BadgeBody
      key="badge"
      variant={variant}
      className={className}
      seconds={seconds}
      pops={pops}
      dot={dot}
      pulse={live && seconds > 0}
    >
      {children}
      {value !== undefined && (
        <>
          <Counter display={display} direction={direction} seconds={seconds} />
          <span className="sr-only">{countLabel ? `${display} ${countLabel}` : display}</span>
        </>
      )}
    </BadgeBody>
  );

  if (value === undefined) return badge;

  return (
    <span data-slot="badge-live" aria-live="polite" aria-atomic="true" className="inline-flex">
      <AnimatePresence>{badge}</AnimatePresence>
    </span>
  );
}

function BadgeBody({
  variant,
  className,
  seconds,
  pops,
  dot,
  pulse,
  children,
}: {
  variant: keyof typeof variantClasses;
  className?: string;
  seconds: number;
  pops: number;
  dot: boolean;
  pulse: boolean;
  children: ReactNode;
}) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const played = useRef(pops);
  const pop = springOrInstant(seconds * 0.75);

  useEffect(() => {
    // Mounting already pops in, so only a later rise from zero replays it.
    if (pops === played.current) return;
    played.current = pops;
    if (seconds === 0 || !scope.current) return;
    const controls = animate(
      scope.current,
      { scale: [0.6, 1], opacity: [0, 1] },
      springOrInstant(seconds * 0.75),
    );
    return () => controls.stop();
  }, [animate, pops, scope, seconds]);

  return (
    <motion.span
      ref={scope}
      data-slot="badge"
      data-variant={variant}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      transition={pop}
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1.5 rounded-full border px-1.5 text-xs leading-none font-medium whitespace-nowrap tabular-nums select-none [&_svg]:size-3 [&_svg]:shrink-0 ${variantClasses[variant]} ${className ?? ""}`}
    >
      {dot && (
        <span
          data-slot="badge-dot"
          aria-hidden="true"
          className="relative ml-0.5 size-1.5 shrink-0 rounded-full bg-current"
        >
          {pulse && (
            <motion.span
              data-slot="badge-pulse"
              className="absolute inset-0 rounded-full bg-current"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.8, opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", repeat: Infinity, repeatDelay: 0.2 }}
            />
          )}
        </span>
      )}
      {children}
    </motion.span>
  );
}

function Counter({ display, direction, seconds }: { display: string; direction: 1 | -1; seconds: number }) {
  const row = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | "auto">("auto");
  const roll = springOrInstant(seconds);

  useLayoutEffect(() => {
    const element = row.current;
    if (!element) return;
    const measure = () => setWidth(element.offsetWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const characters = display.split("");

  return (
    <motion.span
      data-slot="badge-count"
      aria-hidden="true"
      className="relative -my-px inline-flex h-4 shrink-0 justify-end overflow-hidden leading-4"
      initial={false}
      animate={{ width }}
      transition={roll}
    >
      <span ref={row} data-slot="badge-digits" className="relative inline-flex shrink-0">
        <AnimatePresence initial={false} mode="popLayout" anchorX="right" custom={direction}>
          {characters.map((character, index) => {
            // Keys count from the right so ones, tens, and hundreds keep their columns as the count grows.
            const column = characters.length - index;
            return (
              <motion.span
                key={`${column}-${character}`}
                data-slot="badge-digit"
                className="inline-block"
                custom={direction}
                variants={{
                  enter: (rise: number) => ({ y: rise > 0 ? "100%" : "-100%", opacity: 0 }),
                  center: { y: "0%", opacity: 1 },
                  exit: (rise: number) => ({ y: rise > 0 ? "-100%" : "100%", opacity: 0 }),
                }}
                initial={seconds ? "enter" : false}
                animate="center"
                exit={seconds ? "exit" : undefined}
                transition={roll}
              >
                {character}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </span>
    </motion.span>
  );
}
