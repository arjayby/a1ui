"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { RollingNumber } from "./rolling-number";

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
  default: "bg-primary text-primary-foreground border-transparent",
  secondary: "bg-muted text-foreground border-transparent",
  outline: "bg-background text-foreground border-input",
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

// Critically damped: discrete count changes settle without overshoot. This is the spring Motion
// resolves `visualDuration` to, written as stiffness and damping because Motion drops velocity on
// time-defined springs, and a count that changes again mid-pop reverses the badge in flight.
function springOrInstant(visualDuration: number) {
  if (!(visualDuration > 0)) return { duration: 0 };
  const omega = (2 * Math.PI) / (visualDuration * 1.2);
  return { type: "spring", stiffness: omega * omega, damping: 2 * omega } as const;
}

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
  const capped = value !== undefined && cap !== undefined && value > cap;
  const shown = capped ? cap : value;
  const display = shown === undefined ? "" : `${shown}${capped ? "+" : ""}`;
  const visible = value !== 0 || showZero;

  // A rise from zero pops the badge.
  const [previous, setPrevious] = useState(value);
  const [pops, setPops] = useState(0);
  if (value !== previous) {
    setPrevious(value);
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
      {shown !== undefined && (
        <>
          <Count value={shown} capped={capped} seconds={seconds} />
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

/** The count rolls digit by digit through RollingNumber; the `+` of a capped count slides in beside it. */
function Count({ value, capped, seconds }: { value: number; capped: boolean; seconds: number }) {
  const slide = springOrInstant(seconds);
  return (
    <span
      data-slot="badge-count"
      aria-hidden="true"
      className="-my-px inline-flex shrink-0 items-baseline leading-4"
    >
      {/* A fixed locale keeps the server and client digits identical, as plain ASCII numerals. */}
      <RollingNumber value={value} locale="en-US" format={{ useGrouping: false }} duration={seconds} />
      <AnimatePresence initial={false}>
        {capped && (
          <motion.span
            key="plus"
            data-slot="badge-plus"
            className="inline-block overflow-hidden"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={slide}
          >
            +
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
