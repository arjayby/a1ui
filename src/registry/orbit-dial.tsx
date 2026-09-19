"use client";

import { clsx as cn } from "clsx";
import { useId, useRef, useState, type CSSProperties, type PointerEvent } from "react";

export interface OrbitDialProps {
  label: string;
  ariaLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  unit?: string;
  formatValue?: (value: number) => string;
  getValueText?: (value: number) => string;
  id?: string;
  name?: string;
  className?: string;
  style?: CSSProperties;
}

const theme = {
  "--orbit-dial-background": "var(--background)",
  "--orbit-dial-foreground": "var(--foreground)",
  "--orbit-dial-muted": "var(--muted-foreground)",
  "--orbit-dial-border": "var(--border)",
  "--orbit-dial-face": "color-mix(in oklab, var(--background) 97%, var(--foreground))",
} as CSSProperties;

const ticks = Array.from({ length: 51 }, (_, index) => ({
  angle: -135 + (index / 50) * 270,
  major: index % 5 === 0,
}));

function decimalPlaces(value: number) {
  const [coefficient, exponent = "0"] = value.toString().split("e");
  return Math.max(0, (coefficient.split(".")[1]?.length ?? 0) - Number(exponent));
}

function resolveRange(min: number, max: number, step: number) {
  const lower = Number.isFinite(min) ? min : 0;
  const upper = Number.isFinite(max) ? Math.max(lower, max) : Math.max(lower, 100);
  const span = upper - lower;
  const increment = Number.isFinite(step) && step > 0 ? step : 1;
  const count = span / increment;
  const valid = Number.isFinite(span) && Number.isFinite(count) && count <= Number.MAX_SAFE_INTEGER;
  const steps = valid ? Math.floor(count + Math.min(1e-7, Number.EPSILON * Math.max(1, count) * 4)) : 0;
  const precision = Math.min(100, Math.max(decimalPlaces(lower), decimalPlaces(increment)));
  const round = (number: number) => Number(number.toFixed(precision));
  const highest = steps > 0 ? Math.min(upper, round(lower + steps * increment)) : lower;

  return {
    lower,
    upper: highest,
    increment,
    normalize(number: number) {
      const bounded = Number.isNaN(number) ? lower : Math.max(lower, Math.min(highest, number));
      const position = (bounded - lower) / increment;
      const tolerance = Math.min(1e-7, Number.EPSILON * Math.max(1, position) * 4);
      const index = Math.max(0, Math.min(steps, Math.round(position + tolerance)));
      return Math.max(lower, Math.min(highest, round(lower + index * increment)));
    },
  };
}

export function OrbitDial({
  label,
  ariaLabel,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = min,
  onValueChange,
  disabled = false,
  unit,
  formatValue = String,
  getValueText,
  id,
  name,
  className,
  style,
}: OrbitDialProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ pointerId: number; previousAngle: number; angle: number } | null>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [dragging, setDragging] = useState(false);
  const range = resolveRange(min, max, step);
  const currentValue = range.normalize(value ?? internalValue);
  const inactive = disabled || range.upper <= range.lower;
  const progress = range.upper > range.lower ? (currentValue - range.lower) / (range.upper - range.lower) : 0;
  const angle = -135 + progress * 270;
  const formattedValue = formatValue(currentValue);

  const update = (next: number) => {
    if (inactive) return;
    const normalized = range.normalize(next);
    if (normalized === currentValue) return;
    if (value === undefined) setInternalValue(normalized);
    onValueChange?.(normalized);
  };

  const pointerAngle = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    // The center has no useful angle. Crossing it should not flip the value.
    if (Math.hypot(x, y) < bounds.width * 0.12) return null;
    return (Math.atan2(x, -y) * 180) / Math.PI;
  };

  const updateFromAngle = (nextAngle: number) => {
    const bounded = Math.max(-135, Math.min(135, nextAngle));
    update(range.lower + ((bounded + 135) / 270) * (range.upper - range.lower));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      data-orbit-dial=""
      data-disabled={inactive || undefined}
      className={cn(
        "[container-type:inline-size] flex w-full max-w-64 flex-col gap-3 font-mono text-[var(--orbit-dial-foreground)] data-disabled:opacity-45",
        className,
      )}
      style={{ ...theme, ...style }}
    >
      <div
        data-orbit-dial-face=""
        data-dragging={dragging || undefined}
        aria-hidden="true"
        className={cn(
          "relative aspect-square w-full touch-none select-none",
          !inactive && "cursor-grab data-dragging:cursor-grabbing",
        )}
        onPointerDown={(event) => {
          if (inactive || event.button !== 0 || dragRef.current) return;
          event.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          const startAngle = pointerAngle(event) ?? angle;
          dragRef.current = { pointerId: event.pointerId, previousAngle: startAngle, angle: startAngle };
          setDragging(true);
          updateFromAngle(startAngle);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || inactive) return;
          const nextAngle = pointerAngle(event);
          if (nextAngle === null) return;
          // Unwrap the bottom seam so crossing the unused arc stays at the same endpoint.
          const delta = ((nextAngle - drag.previousAngle + 540) % 360) - 180;
          drag.angle += delta;
          drag.previousAngle = nextAngle;
          updateFromAngle(drag.angle);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <svg viewBox="0 0 240 240" className="pointer-events-none absolute inset-0 size-full" fill="none">
          {ticks.map((tick, index) => (
            <line
              key={index}
              x1="120"
              y1="10"
              x2="120"
              y2={tick.major ? 24 : 19}
              transform={`rotate(${tick.angle} 120 120)`}
              stroke={index / 50 <= progress ? "var(--orbit-dial-foreground)" : "var(--orbit-dial-border)"}
              strokeWidth={tick.major ? 2 : 1.5}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-[15%] flex flex-col items-center justify-center rounded-full border border-[var(--orbit-dial-border)] bg-[var(--orbit-dial-face)] shadow-[inset_0_0_0_5px_var(--orbit-dial-background),0_4px_12px_color-mix(in_oklab,var(--orbit-dial-foreground)_6%,transparent)]">
          <div className="flex max-w-[82%] items-baseline justify-center gap-1 whitespace-nowrap tabular-nums">
            <span
              data-orbit-dial-value=""
              className="truncate text-[clamp(1.1rem,18cqw,2.875rem)] leading-none tracking-[-0.08em]"
            >
              {formattedValue}
            </span>
            {unit ? <span className="text-[clamp(0.6rem,6cqw,0.9375rem)]">{unit}</span> : null}
          </div>
          <span className="mt-2 max-w-[80%] truncate text-[clamp(0.5rem,4cqw,0.625rem)] leading-tight tracking-[0.14em] text-[var(--orbit-dial-muted)] uppercase">
            {label}
          </span>
          <span className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
            <span className="absolute top-[7%] left-1/2 h-[8%] w-[2px] -translate-x-1/2 rounded-full bg-[var(--orbit-dial-foreground)]" />
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-[17%] bottom-[3%] flex justify-between gap-4 text-[clamp(0.5rem,4cqw,0.625rem)] text-[var(--orbit-dial-muted)] tabular-nums">
          <span className="truncate">{formatValue(range.lower)}</span>
          <span className="truncate">{formatValue(range.upper)}</span>
        </div>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="range"
        aria-label={ariaLabel ?? label}
        aria-valuetext={getValueText?.(currentValue) ?? `${formattedValue}${unit ? ` ${unit}` : ""}`}
        min={range.lower}
        max={range.upper}
        step={range.increment}
        value={currentValue}
        disabled={inactive}
        onChange={(event) => update(Number(event.currentTarget.value))}
        className="m-0 h-11 w-full cursor-ew-resize appearance-none rounded-sm bg-transparent outline-offset-4 focus-visible:outline-1 focus-visible:outline-[var(--orbit-dial-foreground)] disabled:cursor-default [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--orbit-dial-background)] [&::-moz-range-thumb]:bg-[var(--orbit-dial-foreground)] [&::-moz-range-thumb]:shadow-[0_0_0_1px_var(--orbit-dial-foreground)] [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-[var(--orbit-dial-border)] [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-[var(--orbit-dial-border)] [&::-webkit-slider-thumb]:-mt-[5.5px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--orbit-dial-background)] [&::-webkit-slider-thumb]:bg-[var(--orbit-dial-foreground)] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--orbit-dial-foreground)]"
      />
    </div>
  );
}
