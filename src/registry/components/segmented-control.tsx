"use client";

import { animate, motion, useMotionValue, useReducedMotion, type MotionStyle } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type SegmentedControlSize = "sm" | "md" | "lg";

// Gap between the track and the thumb in pixels. The track's p-[3px] must match it.
const INSET = 3;
// How far each edge of the thumb pulls in while it is held, in pixels.
const PRESS = 1.5;
// About a 0.3s response. Written as stiffness and damping because Motion drops `velocity` on
// duration-based springs, and a release hands the spring the pointer's velocity.
const STIFFNESS = 440;
// Critically damped, so a click or a key press slides the thumb over without overshoot.
const DAMPING = 42;
// A damping ratio of 0.8: the thumb overshoots a little, but only after it was thrown.
const FLICK_DAMPING = 33;
// Segments per second above which a release counts as a throw.
const FLICK_SPEED = 1.5;
const MAX_SPEED = 14;
// How far past either end the thumb can be pulled, as a share of one segment.
const STRETCH = 0.2;

const sizes: Record<SegmentedControlSize, { track: string; cell: string }> = {
  sm: { track: "h-8 text-xs", cell: "px-2.5" },
  md: { track: "h-9 text-sm", cell: "px-3" },
  lg: { track: "h-11 text-sm", cell: "px-4" },
};

/** Apple's rubber band: the further past the end, the less the thumb follows. */
function rubberBand(overshoot: number, limit: number) {
  return (overshoot * limit * 0.55) / (limit + 0.55 * Math.abs(overshoot));
}

/** Where a release at this velocity would coast to, in segments, like scroll deceleration. */
function project(velocity: number, decelerationRate = 0.99) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  /** Drawn twice, once in each colour, so keep it to text and icons. */
  label: ReactNode;
  disabled?: boolean;
  /** Required when the label is only an icon. */
  "aria-label"?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: readonly SegmentedControlOption<T>[];
  /** The selected value when controlled by the caller. */
  value?: T;
  /** The initially selected value when uncontrolled. */
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  size?: SegmentedControlSize;
  /** Field name for form submission. */
  name?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

type Drag = {
  pointerId: number;
  /** Distance from the thumb's leading edge to the pointer, in segments. */
  grab: number;
  startX: number;
  moved: boolean;
  samples: { time: number; at: number }[];
};

export function SegmentedControl<T extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  name,
  disabled = false,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue);
  const current = value ?? internalValue;
  const count = options.length;
  const selectedIndex = options.findIndex((option) => option.value === current);

  // The thumb's leading edge in segments: 0 sits on the first option, 1 on the second.
  const position = useMotionValue(Math.max(selectedIndex, 0));
  const press = useMotionValue(0);
  const drag = useRef<Drag | null>(null);
  // Release velocity waiting for the spring, or null when the thumb keeps the velocity it has.
  const handoff = useRef<number | null>(null);
  const shownIndex = useRef(selectedIndex);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [released, setReleased] = useState(0);
  // With reduced motion a drag steps through the options instead of sliding the thumb.
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  useEffect(() => {
    if (drag.current) return;
    const velocity = handoff.current;
    handoff.current = null;
    const from = shownIndex.current;
    shownIndex.current = selectedIndex;
    if (selectedIndex < 0) return;
    if (reducedMotion || from < 0) {
      position.jump(selectedIndex);
      return;
    }
    // The spring starts from wherever the thumb is now. Without a release velocity it keeps the
    // velocity it already has, so retargeting mid-flight never stalls.
    animate(position, selectedIndex, {
      type: "spring",
      stiffness: STIFFNESS,
      damping: velocity !== null && Math.abs(velocity) > FLICK_SPEED ? FLICK_DAMPING : DAMPING,
      restDelta: 0.001,
      restSpeed: 0.01,
      ...(velocity === null ? {} : { velocity }),
    });
  }, [selectedIndex, released, reducedMotion, position]);

  useEffect(
    () => () => {
      position.stop();
      press.stop();
    },
    [position, press],
  );

  function select(index: number) {
    const option = options[index];
    if (!option || option.disabled || disabled || index === selectedIndex) return;
    if (value === undefined) setInternalValue(option.value);
    onValueChange?.(option.value);
  }

  function nearestEnabled(at: number) {
    return options.reduce(
      (nearest, option, index) =>
        !option.disabled && (nearest < 0 || Math.abs(index - at) < Math.abs(nearest - at)) ? index : nearest,
      -1,
    );
  }

  /** The pointer's place along the track in segments, measured from the first option's edge. */
  function locate(track: HTMLElement, clientX: number) {
    const rect = track.getBoundingClientRect();
    const segment = (rect.width - INSET * 2) / count;
    if (!(segment > 0)) return null;
    const rtl = getComputedStyle(track).direction === "rtl";
    return (rtl ? rect.right - INSET - clientX : clientX - rect.left - INSET) / segment;
  }

  function grab(event: ReactPointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    if (disabled || event.button !== 0 || selectedIndex < 0 || drag.current) return;
    const at = locate(event.currentTarget, event.clientX);
    if (at === null) return;
    // Only the thumb can be picked up. It is hit where it is on screen, not where it is heading,
    // so it can be caught while it is still settling.
    const live = position.get();
    if (at < live || at > live + 1) return;
    // Capture keeps the drag alive outside the track; without it the thumb still drags inside.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    position.stop();
    drag.current = {
      pointerId: event.pointerId,
      grab: at - live,
      startX: event.clientX,
      moved: false,
      samples: [{ time: event.timeStamp, at }],
    };
    setDragging(true);
    if (!reducedMotion) animate(press, PRESS, { type: "spring", visualDuration: 0.15, bounce: 0 });
  }

  function follow(event: ReactPointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const at = locate(event.currentTarget, event.clientX);
    if (at === null) return;
    if (Math.abs(event.clientX - active.startX) > 3) active.moved = true;
    active.samples.push({ time: event.timeStamp, at });
    while (active.samples.length > 2 && event.timeStamp - active.samples[0].time > 100) {
      active.samples.shift();
    }
    // The thumb stays under the point where it was grabbed, and resists past either end.
    const free = at - active.grab;
    const held = clamp(free, 0, count - 1);
    if (reducedMotion) {
      if (active.moved) setScrubIndex(nearestEnabled(held));
      return;
    }
    position.set(held + rubberBand(free - held, STRETCH));
  }

  function release(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId) return;
    drag.current = null;
    suppressClick.current = true;
    setDragging(false);
    animate(press, 0, { type: "spring", visualDuration: 0.2, bounce: 0 });
    let target = selectedIndex;
    let velocity = 0;
    if (active.moved && !cancelled) {
      if (reducedMotion) {
        target = scrubIndex ?? selectedIndex;
      } else {
        const [first] = active.samples;
        const last = active.samples[active.samples.length - 1];
        const seconds = (last.time - first.time) / 1000;
        // A pointer that paused before letting go throws nothing.
        if (seconds > 0 && event.timeStamp - last.time < 80) {
          velocity = clamp((last.at - first.at) / seconds, -MAX_SPEED, MAX_SPEED);
        }
        // Land on the option nearest to where the throw would coast to, not where it was let go.
        target = nearestEnabled(clamp(position.get() + project(velocity), 0, count - 1));
      }
    }
    setScrubIndex(null);
    handoff.current = velocity;
    // Settle even when the value stays the same, such as a controlled parent ignoring the change.
    setReleased((tick) => tick + 1);
    if (target < 0 || target === selectedIndex) return;
    select(target);
    // The press focused the option the thumb was picked up from; keep focus on the one it chose.
    const items = event.currentTarget.querySelectorAll<HTMLElement>('[data-slot="segmented-control-item"]');
    if (event.currentTarget.contains(document.activeElement)) items[target]?.focus();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const enabled = options.flatMap((option, at) => (option.disabled ? [] : [at]));
    if (enabled.length === 0) return;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const here = enabled.indexOf(index);
    const step = (by: number) => enabled[(here + by + enabled.length) % enabled.length];
    let target: number;
    if (event.key === "ArrowRight") target = step(rtl ? -1 : 1);
    else if (event.key === "ArrowLeft") target = step(rtl ? 1 : -1);
    else if (event.key === "ArrowDown") target = step(1);
    else if (event.key === "ArrowUp") target = step(-1);
    else if (event.key === "Home") target = enabled[0];
    else if (event.key === "End") target = enabled[enabled.length - 1];
    else return;
    event.preventDefault();
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLElement>('[data-slot="segmented-control-item"]')
      [target]?.focus();
    select(target);
  }

  const tabStop =
    selectedIndex >= 0 && !options[selectedIndex].disabled
      ? selectedIndex
      : options.findIndex((option) => !option.disabled);
  const shown = scrubIndex ?? selectedIndex;
  const columns = `repeat(${count}, minmax(0, 1fr))`;
  const cell = `flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0 ${sizes[size].cell}`;
  const travel = `(100% - ${INSET * 2}px)`;
  // Motion writes the two numbers; CSS turns them into the thumb's edges, so the thumb is in
  // place on the server render and the label clip can never drift from it.
  const style = {
    gridTemplateColumns: columns,
    "--segment-position": position,
    "--segment-press": press,
    "--segment-edge": `calc(${INSET}px + var(--segment-press) * 1px)`,
    "--segment-from": `calc(var(--segment-edge) + ${travel} * max(0, var(--segment-position)) / ${count})`,
    "--segment-to": `calc(var(--segment-edge) + ${travel} * (${count} - min(${count}, var(--segment-position) + 1)) / ${count})`,
  } as MotionStyle;

  return (
    <motion.div
      {...props}
      role="radiogroup"
      aria-disabled={disabled || undefined}
      data-slot="segmented-control"
      data-size={size}
      data-disabled={disabled || undefined}
      data-dragging={dragging || undefined}
      style={style}
      onPointerDown={grab}
      onPointerMove={follow}
      onPointerUp={(event) => release(event)}
      onPointerCancel={(event) => release(event, true)}
      className={`group/segmented bg-muted text-muted-foreground contrast-more:outline-foreground relative isolate inline-grid touch-pan-y items-stretch rounded-lg p-[3px] select-none data-disabled:opacity-50 contrast-more:outline forced-colors:outline ${sizes[size].track} ${className ?? ""}`}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={index === selectedIndex}
          aria-label={option["aria-label"]}
          disabled={disabled || option.disabled}
          tabIndex={index === tabStop ? 0 : -1}
          data-slot="segmented-control-item"
          onClick={(event) => {
            // A drag already chose where the thumb lands; only keyboard clicks have no detail.
            if (suppressClick.current && event.detail !== 0) return;
            select(index);
          }}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={`${cell} hover:text-foreground focus-visible:ring-ring/50 contrast-more:text-foreground cursor-pointer transition-[color,opacity] duration-150 outline-none group-data-dragging/segmented:cursor-grabbing focus-visible:ring-3 active:opacity-60 disabled:pointer-events-none disabled:opacity-50 aria-checked:cursor-grab aria-checked:active:opacity-100`}
        >
          {option.label}
        </button>
      ))}
      {!reducedMotion && (
        <span
          aria-hidden="true"
          data-slot="segmented-control-thumb"
          data-empty={selectedIndex < 0 || undefined}
          className="bg-primary pointer-events-none absolute inset-y-(--segment-edge) start-(--segment-from) end-(--segment-to) rounded-md transition-opacity duration-150 data-empty:opacity-0 forced-colors:bg-[Highlight]"
        />
      )}
      {/* The same labels in the thumb's text colour, shown only where the thumb is. */}
      <div
        aria-hidden="true"
        data-slot="segmented-control-inverse"
        data-empty={selectedIndex < 0 || undefined}
        style={{ gridTemplateColumns: columns }}
        className={`text-primary-foreground pointer-events-none absolute inset-0 grid items-stretch p-[3px] forced-colors:text-[HighlightText] ${
          reducedMotion
            ? ""
            : "transition-opacity duration-150 [clip-path:inset(var(--segment-edge)_var(--segment-to)_var(--segment-edge)_var(--segment-from))] data-empty:opacity-0 rtl:[clip-path:inset(var(--segment-edge)_var(--segment-from)_var(--segment-edge)_var(--segment-to))]"
        }`}
      >
        {options.map((option, index) => (
          <span
            key={option.value}
            data-active={(reducedMotion && index === shown) || undefined}
            className={`${cell} ${
              // Reduced motion: each option has its own fill, and they cross-fade in place.
              reducedMotion
                ? "bg-primary opacity-0 transition-opacity duration-200 data-active:opacity-100 forced-colors:bg-[Highlight]"
                : ""
            }`}
          >
            {option.label}
          </span>
        ))}
      </div>
      {name && selectedIndex >= 0 && (
        <input type="hidden" name={name} value={options[selectedIndex].value} disabled={disabled} />
      )}
    </motion.div>
  );
}
