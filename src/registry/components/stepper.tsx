"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

// Critically damped (about a 0.3s response), so the value settles without overshoot.
// Written as stiffness and damping because Motion drops `velocity` on duration-based springs,
// and every new step hands the spring the roll's live velocity.
const SETTLE = { type: "spring", stiffness: 420, damping: 41 } as const;
/** How far a value travels as it rolls in or out, in ems. */
const TRAVEL = 0.75;
/** Blur in pixels at the far end of the roll, which reads as speed while the value spins. */
const BLUR = 2;
/** Rows kept on either side of the newest one while the roll catches up. */
const TRAIL = 6;
// Hold to repeat: a pause, then steps that quicken from 5 to 20 a second.
const HOLD_DELAY = 400;
const REPEAT_SLOWEST = 200;
const REPEAT_FASTEST = 50;
const REPEAT_QUICKENING = 0.88;
// A press at a limit throws the value about 8px into a rubber band, which shows as roughly 3px.
const NUDGE_VELOCITY = 440;
const NUDGE_RANGE = 16;

/** Apple's rubber band: the further past the limit, the less the value follows. */
function rubberBand(overshoot: number, dimension: number) {
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
}

function decimals(value: number) {
  return String(value).split(".")[1]?.length ?? 0;
}

/** The values on screen, one per row. A step up adds a row below, a step down a row above. */
interface Tape {
  value: number;
  target: number;
  rows: { row: number; value: number }[];
}

function advance(tape: Tape, value: number): Tape {
  const direction = value > tape.value ? 1 : -1;
  const target = tape.target + direction;
  return {
    value,
    target,
    rows: [
      // Rows the roll has not reached are dropped, so the new value is always next in line.
      ...tape.rows.filter(
        ({ row }) => (direction > 0 ? row < target : row > target) && Math.abs(row - target) <= TRAIL,
      ),
      { row: target, value },
    ],
  };
}

/**
 * Marks the characters two neighbouring values share, so only the digits that change roll.
 * Anything but a digit swapping for a digit can change width, and then the whole value rolls.
 */
function shared(from: string[], to: string | undefined) {
  if (to === undefined) return null;
  const other = Array.from(to);
  if (other.length !== from.length) return null;
  const same = from.map((char, index) => char === other[index]);
  return from.every((char, index) => same[index] || (/\d/.test(char) && /\d/.test(other[index])))
    ? same
    : null;
}

export interface StepperProps {
  /** Accessible name for the value, such as "Guests". The buttons are named after it. */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** Distance Page Up and Page Down move, in value units. */
  largeStep?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Formats the visible value and the accessible value text, such as "$25". */
  format?: (value: number) => string;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function Stepper({
  label,
  min = 0,
  max = 100,
  step = 1,
  largeStep = step * 10,
  value,
  defaultValue = min,
  onValueChange,
  format,
  disabled = false,
  name,
  className,
}: StepperProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const reducedMotion = useReducedMotion();
  const current = value ?? internalValue;
  const position = Number.isFinite(current) ? Math.min(max, Math.max(min, current)) : min;

  const [storedTape, setStoredTape] = useState<Tape>(() => ({
    value: position,
    target: 0,
    rows: [{ row: 0, value: position }],
  }));
  let tape = storedTape;
  // The roll follows the rendered value, so controlled updates and resets roll the same way.
  if (tape.value !== position) {
    tape = advance(tape, position);
    setStoredTape(tape);
  }
  const target = tape.target;
  const roll = useMotionValue(target);
  const nudge = useMotionValue(0);
  const nudgeY = useTransform(nudge, (push) => rubberBand(push, NUDGE_RANGE));
  const spinbutton = useRef<HTMLSpanElement>(null);
  const live = useRef(position);
  const endHold = useRef<(() => void) | null>(null);

  useEffect(() => {
    live.current = position;
  }, [position]);
  useEffect(() => () => endHold.current?.(), []);
  useEffect(() => {
    if (disabled) endHold.current?.();
  }, [disabled]);

  // One spring carries every step. A step mid-roll moves its target, and it continues from the
  // position and velocity on screen instead of restarting.
  useEffect(() => {
    if (roll.get() === target) return;
    const controls = animate(roll, target, {
      ...(reducedMotion
        ? { duration: 0.2, ease: "linear" as const }
        : { ...SETTLE, velocity: roll.getVelocity() }),
      onComplete: () =>
        setStoredTape((settled) =>
          settled.target === target && settled.rows.length > 1
            ? { ...settled, rows: settled.rows.filter(({ row }) => row === target) }
            : settled,
        ),
    });
    return () => controls.stop();
  }, [roll, target, reducedMotion]);

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    throw new Error("Stepper requires finite min and max values with max greater than min.");
  }
  if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(largeStep) || largeStep <= 0) {
    throw new Error("Stepper requires positive finite step and largeStep values.");
  }

  const precision = Math.min(10, Math.max(decimals(step), decimals(min)));
  const settle = (next: number) => Math.min(max, Math.max(min, Number(next.toFixed(precision))));
  const text = (shown: number) => format?.(shown) ?? String(shown);
  // Hidden copies of the longest values reserve the width, so the control keeps its footprint as
  // the number changes. The rolling rows sit on top and take no space of their own: their
  // characters are separate boxes whose widths round differently from one value to the next.
  const sizers = [
    ...new Set([...[min, max, min + step, max - step].map((edge) => text(settle(edge))), text(position)]),
  ];

  /** Commits a value and reports whether anything changed. */
  function commit(next: number, direction: 1 | -1) {
    if (next === live.current) {
      // Nothing left that way: the value pushes into the limit and springs back.
      if (!reducedMotion) {
        animate(nudge, 0, { ...SETTLE, velocity: nudge.getVelocity() - direction * NUDGE_VELOCITY });
      }
      return false;
    }
    if (value === undefined) {
      live.current = next;
      setInternalValue(next);
    }
    onValueChange?.(next);
    return true;
  }

  function stepBy(direction: 1 | -1, amount = step) {
    const count = Math.max(1, Math.round(amount / step));
    const index = (live.current - min) / step;
    // A value off the grid, such as a max that is not a whole number of steps from min, moves to
    // the next grid line instead of carrying its offset along.
    const line = direction > 0 ? Math.floor(index + 1e-9) + count : Math.ceil(index - 1e-9) - count;
    return commit(settle(min + line * step), direction);
  }

  // A held button keeps stepping across renders, so each repeat calls the newest closure.
  const latestStep = useRef(stepBy);
  useEffect(() => {
    latestStep.current = stepBy;
  });

  const release = () => endHold.current?.();

  function press(event: ReactPointerEvent<HTMLButtonElement>, direction: 1 | -1) {
    if (disabled || event.button !== 0) return;
    const button = event.currentTarget;
    // Touch captures the pointer by default, which would hide the finger sliding off the button.
    if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
    // Focus goes to the value, so the arrow keys carry on from where the press left off.
    spinbutton.current?.focus({ preventScroll: true });
    endHold.current?.();
    if (!stepBy(direction)) return;
    const view = button.ownerDocument.defaultView;
    let repeats = 0;
    let timer = setTimeout(repeat, HOLD_DELAY);
    function repeat() {
      // Reaching a limit ends the hold with the same nudge as a press there.
      if (!latestStep.current(direction)) return stop();
      timer = setTimeout(repeat, Math.max(REPEAT_FASTEST, REPEAT_SLOWEST * REPEAT_QUICKENING ** repeats));
      repeats += 1;
    }
    function stop() {
      clearTimeout(timer);
      view?.removeEventListener("blur", stop);
      endHold.current = null;
    }
    view?.addEventListener("blur", stop);
    endHold.current = stop;
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLSpanElement>) {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    // Right-to-left layouts mirror the buttons, and the horizontal arrows follow them.
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const { key } = event;
    if (key === "ArrowUp" || key === (rtl ? "ArrowLeft" : "ArrowRight")) stepBy(1);
    else if (key === "ArrowDown" || key === (rtl ? "ArrowRight" : "ArrowLeft")) stepBy(-1);
    else if (key === "PageUp") stepBy(1, largeStep);
    else if (key === "PageDown") stepBy(-1, largeStep);
    else if (key === "Home") commit(min, -1);
    else if (key === "End") commit(max, 1);
    else return;
    event.preventDefault();
  }

  const button = (direction: 1 | -1) => {
    const atLimit = direction > 0 ? position >= max : position <= min;
    const Icon = direction > 0 ? PlusIcon : MinusIcon;
    return (
      <button
        type="button"
        // The value is the one tab stop; its arrow keys do what these buttons do.
        tabIndex={-1}
        data-slot={direction > 0 ? "stepper-increment" : "stepper-decrement"}
        aria-label={`${direction > 0 ? "Increase" : "Decrease"} ${label}`}
        // Dimmed at a limit but still pressable, so a press there can answer with a nudge.
        aria-disabled={atLimit || undefined}
        disabled={disabled}
        className="hover:bg-muted active:bg-muted relative grid aspect-square h-full cursor-pointer touch-none place-items-center rounded-md transition-[background-color,opacity,scale] duration-150 ease-out outline-none before:absolute before:-inset-1.5 before:content-[''] disabled:cursor-not-allowed aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent aria-disabled:active:bg-transparent motion-safe:active:scale-[0.92] motion-safe:aria-disabled:active:scale-100"
        onPointerDown={(event) => press(event, direction)}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        onContextMenu={release}
        // Keeps focus off the button and stops a fast double press from selecting the value.
        onMouseDown={(event) => event.preventDefault()}
        // Pointers step on the way down. A click without one comes from assistive technology.
        onClick={(event) => {
          if (event.detail === 0) stepBy(direction);
        }}
      >
        <Icon aria-hidden="true" weight="bold" className="size-3.5" />
      </button>
    );
  };

  return (
    <div
      data-slot="stepper"
      data-disabled={disabled || undefined}
      className={`border-border bg-background text-foreground has-focus-visible:ring-ring/30 contrast-more:border-foreground inline-flex h-10 items-stretch rounded-lg border p-[3px] shadow-xs select-none has-focus-visible:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 ${className ?? ""}`}
      onBlur={release}
    >
      {button(-1)}
      <span
        ref={spinbutton}
        role="spinbutton"
        data-slot="stepper-value"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={position}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={format ? format(position) : undefined}
        aria-disabled={disabled || undefined}
        className="grid min-w-10 place-items-center px-2 text-sm font-medium whitespace-pre tabular-nums outline-none"
        onKeyDown={onKeyDown}
      >
        {sizers.map((sizer) => (
          <span key={sizer} aria-hidden="true" className="invisible col-start-1 row-start-1">
            {sizer}
          </span>
        ))}
        <motion.span
          aria-hidden="true"
          data-slot="stepper-roll"
          className="relative col-start-1 row-start-1 place-self-stretch"
          style={{ y: nudgeY }}
        >
          {tape.rows.map(({ row, value: shown }) => (
            <RollRow
              key={row}
              row={row}
              roll={roll}
              still={Boolean(reducedMotion)}
              text={text(shown)}
              before={tape.rows.find((other) => other.row === row - 1)}
              after={tape.rows.find((other) => other.row === row + 1)}
              format={text}
            />
          ))}
        </motion.span>
      </span>
      {button(1)}
      {name !== undefined && <input type="hidden" name={name} value={position} disabled={disabled} />}
    </div>
  );
}

function RollRow({
  row,
  roll,
  still,
  text,
  before,
  after,
  format,
}: {
  row: number;
  roll: MotionValue<number>;
  still: boolean;
  text: string;
  before: Tape["rows"][number] | undefined;
  after: Tape["rows"][number] | undefined;
  format: (value: number) => string;
}) {
  const chars = Array.from(text);
  const heldBefore = shared(chars, before && format(before.value));
  const heldAfter = shared(chars, after && format(after.value));
  return (
    <span data-slot="stepper-row" className="absolute inset-0 flex items-center justify-center">
      {chars.map((char, index) => (
        <RollChar
          key={index}
          row={row}
          roll={roll}
          still={still}
          heldBefore={heldBefore?.[index] ?? false}
          heldAfter={heldAfter?.[index] ?? false}
        >
          {char}
        </RollChar>
      ))}
    </span>
  );
}

/**
 * One character of one row. It rests when the roll is on its row, leaves upward as the roll moves
 * on, and waits below until the roll arrives. A character the neighbouring row shares stays put:
 * the earlier row shows it until the roll lands on the later one.
 */
function RollChar({
  row,
  roll,
  still,
  heldBefore,
  heldAfter,
  children,
}: {
  row: number;
  roll: MotionValue<number>;
  still: boolean;
  heldBefore: boolean;
  heldAfter: boolean;
  children: string;
}) {
  const opacity = useTransform(roll, (at) => {
    const distance = row - at;
    if (distance > 0 ? heldBefore : heldAfter) return distance > -1 && distance <= 0 ? 1 : 0;
    return Math.max(0, 1 - Math.abs(distance));
  });
  // Reduced motion keeps every character in place, which leaves the cross-fade above.
  const shift = useTransform(roll, (at) => {
    const distance = Math.min(1, Math.max(-1, row - at));
    return still || (distance > 0 ? heldBefore : heldAfter) ? 0 : distance;
  });
  const y = useTransform(shift, (distance) => (distance === 0 ? 0 : `${distance * TRAVEL}em`));
  const filter = useTransform(shift, (distance) =>
    distance === 0 ? "none" : `blur(${Math.abs(distance) * BLUR}px)`,
  );
  return (
    <motion.span className="inline-block" style={{ y, opacity, filter }}>
      {children}
    </motion.span>
  );
}
