"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, type ReactNode } from "react";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export interface ProgressProps {
  /** Current value. `null` shows an indeterminate sweep. */
  value?: number | null;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** `bar` is a track, `ring` is a circular stroke, `steps` is a row of segments. */
  variant?: "bar" | "ring" | "steps";
  /** Number of segments for the `steps` variant. */
  steps?: number;
  /** Visible label, wired to the progress bar as its accessible name. */
  label?: ReactNode;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  /** Shows the rolling value text. */
  showValue?: boolean;
  /** Formats the value text and `aria-valuetext`. Receives the clamped value and its percentage. */
  formatValue?: (value: number, percent: number) => string;
  /** Moves a highlight across the fill while it is below 100%. */
  shimmer?: boolean;
  /** Ring diameter in pixels. */
  size?: number;
  /** Fill spring duration in seconds. */
  duration?: number;
  className?: string;
}

function defaultFormat(_value: number, percent: number) {
  return `${Math.round(percent)}%`;
}

export function Progress({
  value = 0,
  min = 0,
  max = 100,
  variant = "bar",
  steps = 5,
  label,
  "aria-label": ariaLabel,
  showValue = true,
  formatValue = defaultFormat,
  shimmer = false,
  size = 64,
  duration = 0.6,
  className,
}: ProgressProps) {
  const reducedMotion = useReducedMotion();
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.6;
  const indeterminate = value === null || !Number.isFinite(value);
  const range = max - min;
  const clamped = indeterminate ? min : clamp(value, Math.min(min, max), Math.max(min, max));
  const percent = indeterminate || range === 0 ? 0 : clamp(((clamped - min) / range) * 100, 0, 100);
  const text = indeterminate ? "" : formatValue(clamped, percent);
  const segments = Math.max(1, Math.round(steps));

  // One spring drives every variant, so steps fill one after another and the ring follows the bar.
  const fill = useMotionValue(percent);
  useEffect(() => {
    if (seconds === 0) {
      fill.jump(percent);
      return;
    }
    const controls = animate(fill, percent, { type: "spring", visualDuration: seconds, bounce: 0 });
    return () => controls.stop();
  }, [fill, percent, seconds]);

  const valueText = showValue && !indeterminate && (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      data-value={text}
      aria-hidden="true"
      className="text-foreground inline-flex text-sm leading-none font-medium tabular-nums"
    >
      {() => <RollingText text={text} seconds={seconds} />}
    </ProgressPrimitive.Value>
  );
  const labelText = label && (
    <ProgressPrimitive.Label data-slot="progress-label" className="text-sm leading-none font-medium">
      {label}
    </ProgressPrimitive.Label>
  );
  // Loops last 1 to 2.5 seconds, so a long duration never slows them toward the 0.2 Hz sway
  // that is most likely to cause motion discomfort.
  const sweep = seconds > 0 ? Math.min(Math.max(seconds, 0.4) * 2.5, 2.5) : 0;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-variant={variant}
      value={indeterminate ? null : clamped}
      min={min}
      max={max}
      aria-label={label ? undefined : ariaLabel}
      getAriaValueText={() => (indeterminate ? "indeterminate progress" : text)}
      className={
        variant === "ring"
          ? `inline-flex flex-col items-center gap-2 ${className ?? ""}`
          : `grid w-full gap-2 ${className ?? ""}`
      }
    >
      {variant === "ring" ? (
        <>
          <Ring
            fill={fill}
            size={size}
            indeterminate={indeterminate}
            sweep={sweep}
            shimmer={shimmer && percent < 100}
          >
            {valueText}
          </Ring>
          {labelText}
        </>
      ) : (
        <>
          {(labelText || valueText) && (
            <div className="flex items-center justify-between gap-3">
              {labelText || <span />}
              {valueText}
            </div>
          )}
          {variant === "steps" ? (
            <div data-slot="progress-track" className="flex h-2 w-full gap-1">
              {Array.from({ length: segments }, (_, index) => (
                <Segment
                  key={index}
                  fill={fill}
                  index={index}
                  count={segments}
                  indeterminate={indeterminate}
                  sweep={sweep}
                />
              ))}
            </div>
          ) : (
            <Bar fill={fill} indeterminate={indeterminate} sweep={sweep} shimmer={shimmer && percent < 100} />
          )}
        </>
      )}
    </ProgressPrimitive.Root>
  );
}

function Shimmer({ sweep }: { sweep: number }) {
  return (
    <motion.span
      aria-hidden="true"
      data-slot="progress-shimmer"
      className="via-background/40 pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent to-transparent"
      initial={{ x: "-100%" }}
      animate={{ x: "200%" }}
      transition={{ duration: sweep * 0.6, ease: "linear", repeat: Infinity, repeatDelay: sweep * 0.2 }}
    />
  );
}

function Bar({
  fill,
  indeterminate,
  sweep,
  shimmer,
}: {
  fill: MotionValue<number>;
  indeterminate: boolean;
  sweep: number;
  shimmer: boolean;
}) {
  // Translating a full-width fill keeps its rounded end intact, unlike scaling.
  const x = useTransform(fill, (percent) => `${clamp(percent, 0, 100) - 100}%`);
  // Antialiasing leaves a hairline at the track edge, so hide an empty fill.
  const opacity = useTransform(fill, (percent) => (percent > 0 ? 1 : 0));

  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className="bg-muted relative h-2 w-full overflow-hidden rounded-full"
    >
      {indeterminate ? (
        <motion.span
          data-slot="progress-sweep"
          className="bg-foreground absolute inset-y-0 left-0 w-2/5 rounded-full"
          initial={{ x: sweep ? "-100%" : "75%" }}
          animate={sweep ? { x: "250%" } : undefined}
          transition={sweep ? { duration: sweep, ease: [0.65, 0, 0.35, 1], repeat: Infinity } : undefined}
        />
      ) : (
        <motion.span
          data-slot="progress-fill"
          className="bg-foreground absolute inset-0 overflow-hidden rounded-full"
          style={{ x, opacity }}
        >
          {shimmer && sweep > 0 && <Shimmer sweep={sweep} />}
        </motion.span>
      )}
    </ProgressPrimitive.Track>
  );
}

function Segment({
  fill,
  index,
  count,
  indeterminate,
  sweep,
}: {
  fill: MotionValue<number>;
  index: number;
  count: number;
  indeterminate: boolean;
  sweep: number;
}) {
  const amount = useTransform(fill, (percent) => clamp((percent * count) / 100 - index, 0, 1));
  const x = useTransform(amount, (filled) => `${Math.round((filled - 1) * 1000) / 10}%`);
  const opacity = useTransform(amount, (filled) => (filled > 0 ? 1 : 0));

  return (
    <span
      data-slot="progress-segment"
      className="bg-muted relative h-full flex-1 overflow-hidden rounded-full"
    >
      {indeterminate ? (
        <motion.span
          data-slot="progress-sweep"
          className="bg-foreground absolute inset-0 rounded-full"
          initial={{ opacity: sweep ? 0.15 : 0.4 }}
          animate={sweep ? { opacity: [0.15, 1, 0.15] } : undefined}
          transition={
            sweep
              ? {
                  duration: sweep * 0.6,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: sweep * 0.4,
                  delay: (index / count) * sweep * 0.4,
                }
              : undefined
          }
        />
      ) : (
        <motion.span
          data-slot="progress-fill"
          className="bg-foreground absolute inset-0"
          style={{ x, opacity }}
        />
      )}
    </span>
  );
}

function Ring({
  fill,
  size,
  indeterminate,
  sweep,
  shimmer,
  children,
}: {
  fill: MotionValue<number>;
  size: number;
  indeterminate: boolean;
  sweep: number;
  shimmer: boolean;
  children: ReactNode;
}) {
  const pathLength = useTransform(fill, (percent) => clamp(percent, 0, 100) / 100);
  // A round cap would still draw a dot at zero, so hide the stroke until it has length.
  const opacity = useTransform(fill, (percent) => (percent > 0 ? 1 : 0));
  const stroke = Math.max(2, Math.round(size / 12));
  const radius = (size - stroke) / 2;
  const center = size / 2;

  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <motion.svg
        aria-hidden="true"
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        // Start at twelve o'clock; the indeterminate arc spins from there.
        initial={{ rotate: -90 }}
        animate={{ rotate: indeterminate && sweep ? [-90, 270] : -90 }}
        transition={
          indeterminate && sweep
            ? { duration: sweep * 0.6, ease: "linear", repeat: Infinity }
            : { duration: 0 }
        }
      >
        <circle cx={center} cy={center} r={radius} className="stroke-muted" />
        {indeterminate ? (
          <circle
            data-slot="progress-sweep"
            cx={center}
            cy={center}
            r={radius}
            pathLength={1}
            strokeDasharray="0.25 0.75"
            className="stroke-foreground"
          />
        ) : (
          <motion.circle
            data-slot="progress-fill"
            cx={center}
            cy={center}
            r={radius}
            className="stroke-foreground"
            style={{ pathLength, opacity }}
          />
        )}
        {!indeterminate && shimmer && sweep > 0 && (
          <motion.circle
            data-slot="progress-shimmer"
            cx={center}
            cy={center}
            r={radius}
            className="stroke-background/40"
            style={{ opacity }}
            initial={{ pathLength: 0.08, pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ duration: sweep, ease: "linear", repeat: Infinity }}
          />
        )}
      </motion.svg>
      {children}
    </ProgressPrimitive.Track>
  );
}

function RollingText({ text, seconds }: { text: string; seconds: number }) {
  const characters = text.split("");

  // Keys count from the right so ones, tens, and hundreds keep their columns as the text grows.
  return characters.map((character, index) => {
    const key = characters.length - index;
    const digit = DIGITS.indexOf(character);
    if (digit === -1) return <span key={`c${key}`}>{character}</span>;
    return (
      <span key={`d${key}`} data-slot="progress-digit" className="inline-block h-[1em] overflow-hidden">
        <motion.span
          className="flex flex-col"
          initial={false}
          animate={{ y: `${-digit}em` }}
          transition={
            seconds ? { type: "spring", visualDuration: seconds * 0.8, bounce: 0 } : { duration: 0 }
          }
        >
          {DIGITS.map((option) => (
            <span key={option} className="h-[1em] leading-none">
              {option}
            </span>
          ))}
        </motion.span>
      </span>
    );
  });
}
