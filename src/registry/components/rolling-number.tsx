"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

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

export interface RollingNumberProps {
  /** The number to show. Each change rolls the digits that differ. */
  value: number;
  /** BCP 47 locale tag or tags. Pass one explicitly when rendering on a server. */
  locale?: string | string[];
  /** `Intl.NumberFormat` options: grouping, decimals, currency, percent, compact, and so on. */
  format?: Intl.NumberFormatOptions;
  /** Shows a chip with the signed change and an arrow after each update, then fades it. */
  delta?: boolean;
  /** Seconds the delta chip stays before it fades. */
  deltaDuration?: number;
  /** Announces each new value through a polite live region. */
  announce?: boolean;
  /** Roll spring duration in seconds. Zero swaps digits instantly. */
  duration?: number;
  className?: string;
}

type Direction = 1 | 0 | -1;

interface Slot {
  key: string;
  text: string;
  /** 0 to 9 for a rolling digit, -1 for a separator or symbol. */
  digit: number;
}

const mod = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus;

// Critically damped: a value change carries no momentum, so nothing overshoots.
const springOrInstant = (visualDuration: number) =>
  visualDuration > 0 ? ({ type: "spring", visualDuration, bounce: 0 } as const) : { duration: 0 };

/**
 * Splits formatted parts into slots with keys that survive value changes. Integer digits are keyed
 * by place value from the right and fraction digits from the left, so ones stay ones when the
 * number grows from 9 to 10 and only the new column enters.
 */
function toSlots(parts: Intl.NumberFormatPart[], glyphs: string[]): Slot[] {
  const places = parts.reduce(
    (total, part) => (part.type === "integer" ? total + Array.from(part.value).length : total),
    0,
  );
  const seen = new Map<string, number>();
  const slots: Slot[] = [];
  let place = places;
  let fraction = 0;

  for (const part of parts) {
    if (part.type === "integer" || part.type === "fraction") {
      for (const text of Array.from(part.value)) {
        const digit = glyphs.indexOf(text);
        const column = part.type === "integer" ? `i${--place}` : `f${fraction++}`;
        slots.push({ key: digit === -1 ? `${column}:${text}` : column, text, digit });
      }
    } else if (part.type === "group") {
      slots.push({ key: `g${place}`, text: part.value, digit: -1 });
    } else if (part.type === "decimal") {
      slots.push({ key: "decimal", text: part.value, digit: -1 });
    } else {
      // Symbols keep their text in the key, so `K` to `M` or `$` to `€` cross-fades.
      const count = seen.get(part.type) ?? 0;
      seen.set(part.type, count + 1);
      slots.push({ key: `${part.type}${count}:${part.value}`, text: part.value, digit: -1 });
    }
  }
  return slots;
}

/**
 * The wheel position to roll to. Positions are unwrapped, so 9 to 1 on an increase is 9 to 11 and
 * passes through 0. It measures from the live position, with half a step of slack so a digit that
 * is barely past its target turns back instead of going all the way round.
 */
function nextPosition(live: number, digit: number, direction: Direction) {
  if (direction === 0) {
    const forward = mod(digit - live, 10);
    return Math.round(live + (forward <= 5 ? forward : forward - 10));
  }
  const from = live - direction * 0.5;
  // Digits are whole numbers, so rounding only removes floating-point drift.
  return Math.round(direction === 1 ? from + mod(digit - from, 10) : from - mod(from - digit, 10));
}

const slotVariants: Variants = {
  enter: (direction: Direction) => ({ width: 0, opacity: 0, y: `${direction * 50}%` }),
  shown: { width: "auto", opacity: 1, y: "0%" },
  // Leaves the way a slot would enter on the opposite change: down for a decrease, up for an increase.
  exit: (direction: Direction) => ({ width: 0, opacity: 0, y: `${-direction * 50}%` }),
};
// Reduced motion keeps the layout still: slots fade in at full width and leave at once.
const fadeVariants: Variants = {
  enter: { opacity: 0 },
  shown: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
};
const fade = { duration: 0.2, ease: "linear" } as const;

export function RollingNumber({
  value,
  locale,
  format,
  delta = false,
  deltaDuration = 2,
  announce = false,
  duration = 0.5,
  className,
}: RollingNumberProps) {
  const hydrated = useHydrated();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = hydrated && prefersReducedMotion === true;
  const seconds = Number.isFinite(duration) ? Math.max(0, duration) : 0.5;

  // Inline `format` objects change identity every render, so the formatter is keyed by content.
  const formatKey = JSON.stringify([locale ?? null, format ?? null]);
  const { formatter, signed, glyphs } = useMemo(() => {
    const [tags, options] = JSON.parse(formatKey) as [
      string | string[] | null,
      Intl.NumberFormatOptions | null,
    ];
    const formatter = new Intl.NumberFormat(tags ?? undefined, options ?? undefined);
    const { numberingSystem } = formatter.resolvedOptions();
    const plain = new Intl.NumberFormat(tags ?? undefined, { numberingSystem, useGrouping: false });
    return {
      formatter,
      signed: new Intl.NumberFormat(tags ?? undefined, { ...options, signDisplay: "exceptZero" }),
      // The locale's own digits, so Arabic-Indic or Devanagari numerals roll too.
      glyphs: Array.from({ length: 10 }, (_, digit) => plain.format(digit)),
    };
  }, [formatKey]);

  const text = formatter.format(value);
  const slots = toSlots(formatter.formatToParts(value), glyphs);

  // Derived during render so the direction is known in the same pass that changes the digits.
  const [previous, setPrevious] = useState(value);
  const [direction, setDirection] = useState<Direction>(0);
  const [change, setChange] = useState<{ id: number; amount: number } | null>(null);
  if (!Object.is(value, previous)) {
    setPrevious(value);
    const amount = value - previous;
    setDirection(amount > 0 ? 1 : amount < 0 ? -1 : 0);
    if (delta) setChange((last) => (Number.isFinite(amount) ? { id: (last?.id ?? 0) + 1, amount } : null));
  }

  const changeId = change?.id;
  const hold = Number.isFinite(deltaDuration) ? Math.max(0, deltaDuration) : 2;
  useEffect(() => {
    if (changeId === undefined) return;
    const timer = setTimeout(() => setChange(null), hold * 1000);
    return () => clearTimeout(timer);
  }, [changeId, hold]);

  const rise = change !== null && change.amount > 0;
  // A change too small to show at this precision gets no chip, since it would read as zero.
  const deltaText = change ? signed.format(change.amount) : "";
  const showDelta = delta && change !== null && deltaText !== signed.format(0);
  // The chip arrives from the side the digits came from and returns the same way.
  const chipOffset = reducedMotion || seconds === 0 || !change ? 0 : rise ? 4 : -4;

  return (
    <span
      data-slot="rolling-number"
      className={`relative inline-flex items-baseline whitespace-nowrap tabular-nums ${className ?? ""}`}
    >
      {/* Assistive tech reads this once; the rolling columns below are hidden from it. */}
      <span
        data-slot="rolling-number-text"
        className="sr-only"
        aria-live={announce ? "polite" : undefined}
        aria-atomic={announce ? "true" : undefined}
      >
        {text}
      </span>
      <span
        aria-hidden="true"
        dir="ltr"
        data-slot="rolling-number-value"
        data-value={text}
        data-direction={direction === 1 ? "up" : direction === -1 ? "down" : undefined}
        className="inline-flex overflow-x-visible overflow-y-clip [mask-image:linear-gradient(to_bottom,transparent,black_0.12em,black_calc(100%_-_0.12em),transparent)] select-none contrast-more:[mask-image:none]"
      >
        <AnimatePresence initial={false} custom={direction}>
          {slots.map((slot) => (
            <motion.span
              key={slot.key}
              data-slot={slot.digit === -1 ? "rolling-number-symbol" : "rolling-number-digit"}
              custom={direction}
              variants={reducedMotion ? fadeVariants : slotVariants}
              initial="enter"
              animate="shown"
              exit="exit"
              transition={reducedMotion ? fade : springOrInstant(seconds)}
              className="inline-block h-lh shrink-0 overflow-x-clip whitespace-pre"
            >
              {slot.digit === -1 ? (
                slot.text
              ) : reducedMotion ? (
                <FadingDigit text={slot.text} />
              ) : (
                <Wheel digit={slot.digit} direction={direction} seconds={seconds} glyphs={glyphs} />
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
      <AnimatePresence>
        {showDelta && (
          <motion.span
            key="delta"
            aria-hidden="true"
            data-slot="rolling-number-delta"
            data-direction={rise ? "up" : "down"}
            initial={{ opacity: 0, y: chipOffset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: chipOffset }}
            transition={reducedMotion ? fade : springOrInstant(seconds * 0.6)}
            className={`pointer-events-none absolute start-full top-1/2 ms-2 -mt-2.5 inline-flex h-5 items-center gap-0.5 rounded-full border border-transparent px-1.5 font-sans text-xs leading-none font-medium tracking-normal select-none contrast-more:border-current ${
              rise
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/15 text-red-700 dark:text-red-400"
            }`}
          >
            <svg viewBox="0 0 12 12" fill="none" className="size-3 shrink-0" aria-hidden="true">
              <path
                d={rise ? "M6 9.5v-7M2.75 5.75 6 2.5l3.25 3.25" : "M6 2.5v7M2.75 6.25 6 9.5l3.25-3.25"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {deltaText}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/** One column of 0 to 9 (and 0 again, so 9 to 0 has no seam) that translates to its digit. */
function Wheel({
  digit,
  direction,
  seconds,
  glyphs,
}: {
  digit: number;
  direction: Direction;
  seconds: number;
  glyphs: string[];
}) {
  const position = useMotionValue(digit);
  const target = useRef(digit);
  // The column is eleven cells tall, so one digit is an eleventh of its own height.
  const y = useTransform(position, (current) => `${Math.round((-mod(current, 10) * 1e5) / 11) / 1e3}%`);

  useEffect(() => {
    // An unchanged digit keeps rolling to where it was already going.
    if (mod(target.current, 10) === digit) return;
    // Retarget from the on-screen position. Motion carries the current velocity into the new
    // spring, so reversing mid-roll has no stall and no jump.
    const next = nextPosition(position.get(), digit, direction);
    target.current = next;
    if (seconds === 0) {
      position.jump(next);
      return;
    }
    // Positions are in digits, not pixels, so the spring needs a finer rest threshold than
    // Motion's default or it would snap the last quarter of a digit.
    animate(position, next, {
      type: "spring",
      visualDuration: seconds,
      bounce: 0,
      restDelta: 0.002,
      restSpeed: 0.02,
    });
  }, [digit, direction, seconds, position]);

  useEffect(() => () => position.stop(), [position]);

  return (
    <motion.span data-digit={digit} className="flex flex-col" style={{ y }}>
      {[...glyphs, glyphs[0]].map((glyph, index) => (
        <span key={index} className="h-lh">
          {glyph}
        </span>
      ))}
    </motion.span>
  );
}

/** Reduced motion: the old digit fades out in place while the new one fades in. */
function FadingDigit({ text }: { text: string }) {
  return (
    <span className="inline-grid">
      <AnimatePresence initial={false}>
        <motion.span
          key={text}
          className="col-start-1 row-start-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
