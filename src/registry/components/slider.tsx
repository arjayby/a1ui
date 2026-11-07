"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

// Critically damped (about a 0.3s response), so the knob and track settle without wobbling.
// Written as stiffness and damping because Motion drops `velocity` on duration-based springs,
// and both the stretch release and the stop catch hand the spring a velocity.
const SETTLE: Transition = { type: "spring", stiffness: 305, damping: 35 };
// Scale velocity handed to the knob when it catches a stop: it swells about 20% and settles back.
const CATCH_VELOCITY = 9;

/** Apple's rubber band: the further past the end, the less the track follows. */
function rubberBand(overshoot: number, dimension: number) {
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
}

export interface SliderProps {
  label: string;
  /** Stop values must align with step, relative to min. */
  stops?: readonly number[];
  showStopLabels?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** Distance in value units within which the thumb catches a stop. */
  snapDistance?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function Slider({
  label,
  stops = [],
  showStopLabels = false,
  min = 0,
  max = 100,
  step = 1,
  snapDistance = (max - min) * 0.03,
  value,
  defaultValue = min,
  onValueChange,
  formatValue,
  disabled = false,
  name,
  className,
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const reducedMotion = useReducedMotion();
  // Past either end the track stretches toward the pointer instead of stopping dead.
  const stretch = useMotionValue(0);
  const trackWidth = useMotionValue(1);
  const trackScale = useTransform(() => 1 + Math.abs(stretch.get()) / trackWidth.get());
  const trackOrigin = useTransform(() => (stretch.get() < 0 ? 1 : 0));
  const knobScale = useMotionValue(1);
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDrag.current?.(), []);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    throw new Error("Slider requires finite min and max values with max greater than min.");
  }
  if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(snapDistance) || snapDistance < 0) {
    throw new Error("Slider requires a positive finite step and a non-negative finite snapDistance.");
  }
  const current = value ?? internalValue;
  const position = Number.isFinite(current) ? Math.min(max, Math.max(min, current)) : min;
  const markers = [...new Set(stops)]
    .filter((stop) => Number.isFinite(stop) && stop >= min && stop <= max)
    .sort((a, b) => a - b);
  const activeStop = markers.find((stop) => stop === position);

  function trackOvershoot(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || reducedMotion || event.button !== 0) return;
    const control = event.currentTarget;
    const doc = control.ownerDocument;
    const pointerId = event.pointerId;
    // Base UI keeps the thumb under the point where it was grabbed, so the stretch does too.
    const thumb = (event.target as Element).closest('[data-slot="slider-thumb"]')?.getBoundingClientRect();
    const grabOffset = thumb ? event.clientX - (thumb.left + thumb.width / 2) : 0;
    stopDrag.current?.();
    stretch.stop();
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const { left, right, width } = control.getBoundingClientRect();
      if (width <= 0) return;
      const center = moveEvent.clientX - grabOffset;
      const overshoot = center < left ? center - left : center > right ? center - right : 0;
      trackWidth.set(width);
      stretch.set(rubberBand(overshoot, width));
    };
    const stop = () => {
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", release);
      doc.removeEventListener("pointercancel", release);
      stopDrag.current = null;
    };
    // The spring picks up the stretch's release velocity on its way back.
    function release(releaseEvent: PointerEvent) {
      if (releaseEvent.pointerId !== pointerId) return;
      stop();
      animate(stretch, 0, SETTLE);
    }
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", release);
    doc.addEventListener("pointercancel", release);
    stopDrag.current = stop;
  }

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      data-at-stop={activeStop !== undefined || undefined}
      value={position}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      name={name}
      className={`text-foreground w-full min-w-0 data-disabled:opacity-40 ${className ?? ""}`}
      onValueChange={(next, details) => {
        // Keyboard increments stay precise instead of getting caught by the same stop.
        if (details.reason === "drag" || details.reason === "track-press") {
          const nearest = markers.reduce<number | undefined>(
            (closest, stop) =>
              closest === undefined || Math.abs(stop - next) < Math.abs(closest - next) ? stop : closest,
            undefined,
          );
          if (nearest !== undefined && Math.abs(nearest - next) <= snapDistance) next = nearest;
        }
        if (next === position) return;
        // Catching a stop kicks the knob's scale, which swells and settles from wherever it is.
        if (!reducedMotion && markers.includes(next)) {
          animate(knobScale, 1, { ...SETTLE, velocity: CATCH_VELOCITY });
        }
        if (value === undefined) setInternalValue(next);
        onValueChange?.(next);
      }}
    >
      <div data-slot="slider-header" className="mb-4 flex items-center justify-between gap-4 text-xs">
        <span className="font-normal">{label}</span>
        <span aria-hidden="true" className="text-muted-foreground font-mono text-xs tabular-nums">
          {formatValue?.(position) ?? position}
        </span>
      </div>
      <div className="px-3">
        <SliderPrimitive.Control
          data-slot="slider-control"
          onPointerDown={trackOvershoot}
          className="relative flex h-11 w-full touch-pan-y items-center select-none data-disabled:cursor-not-allowed"
        >
          <SliderPrimitive.Track
            render={<motion.div style={{ scaleX: trackScale, originX: trackOrigin }} />}
            className="bg-muted relative h-1.5 w-full rounded-full"
          >
            <SliderPrimitive.Indicator className="bg-foreground rounded-full" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {markers.map((stop) => (
                <motion.span
                  key={stop}
                  data-slot="slider-stop"
                  data-active={stop === activeStop || undefined}
                  className="bg-muted-foreground/60 data-active:bg-foreground absolute top-[calc(100%+10px)] h-1 w-px origin-top -translate-x-1/2"
                  style={{ left: `${((stop - min) / (max - min)) * 100}%` }}
                  animate={{ scaleY: stop === activeStop ? 1.5 : 1 }}
                  transition={reducedMotion ? { duration: 0 } : SETTLE}
                />
              ))}
            </div>
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            getAriaLabel={() => label}
            getAriaValueText={formatValue ? (_, currentValue) => formatValue(currentValue) : undefined}
            className="relative flex size-11 cursor-grab items-center justify-center rounded-full outline-none data-disabled:cursor-not-allowed data-dragging:cursor-grabbing"
          >
            <motion.span
              aria-hidden="true"
              data-slot="slider-knob"
              className="border-border bg-background dark:bg-foreground relative grid size-5 place-items-center rounded-full border shadow-sm"
              style={{ x: stretch, scale: knobScale }}
            >
              <span className="bg-foreground dark:bg-background h-2 w-0.5 rounded-full opacity-60" />
            </motion.span>
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Control>
        {showStopLabels && (
          <div
            data-slot="slider-stop-labels"
            aria-hidden="true"
            className="text-muted-foreground relative mt-1 h-4 font-mono text-[10px] tabular-nums"
          >
            {markers.map((stop) => (
              <span
                key={stop}
                data-active={stop === activeStop || undefined}
                className="data-active:text-foreground absolute -translate-x-1/2"
                style={{ left: `${((stop - min) / (max - min)) * 100}%` }}
              >
                {stop}
              </span>
            ))}
          </div>
        )}
      </div>
    </SliderPrimitive.Root>
  );
}
