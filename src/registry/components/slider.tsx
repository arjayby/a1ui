"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

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
          className="relative flex h-11 w-full touch-pan-y items-center select-none data-disabled:cursor-not-allowed"
        >
          <SliderPrimitive.Track className="bg-muted relative h-1.5 w-full rounded-full">
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
                  transition={{ duration: reducedMotion ? 0 : 0.12 }}
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
              key={activeStop ?? "free"}
              aria-hidden="true"
              data-slot="slider-knob"
              className="border-border bg-background dark:bg-foreground relative grid size-5 place-items-center rounded-full border shadow-sm"
              animate={{ scale: activeStop !== undefined && !reducedMotion ? [1, 1.22, 0.96, 1] : 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.24 }}
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
