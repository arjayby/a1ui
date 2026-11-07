"use client";

import { clsx as cn } from "clsx";
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

export interface CompareCurtainProps {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  ariaLabel?: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 50;
  return Math.max(0, Math.min(100, value));
}

export function CompareCurtain({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
  ariaLabel = "Reveal after image",
  value,
  defaultValue = 50,
  onValueChange,
  disabled = false,
  className,
  style,
}: CompareCurtainProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; value: number } | null>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [dragging, setDragging] = useState(false);
  const position = clamp(value ?? internalValue);

  const update = (next: number) => {
    if (disabled) return;
    const bounded = clamp(next);
    if (bounded === position) return;
    if (value === undefined) setInternalValue(bounded);
    onValueChange?.(bounded);
  };

  const stretchKnob = (overshoot: number) => {
    const knob = knobRef.current;
    if (knob) knob.style.transform = overshoot ? `translateX(${overshoot}px)` : "";
  };

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!drag || !bounds || bounds.width <= 0) return;
    // Move by the pointer's travel from where the handle was grabbed, so the
    // divider keeps its offset from the pointer instead of jumping under it.
    const next = drag.value + ((event.clientX - drag.x) / bounds.width) * 100;
    // Past either edge, the knob follows with growing resistance instead of
    // stopping dead. The value itself stays within 0–100.
    const overshoot = ((next < 0 ? next : next > 100 ? next - 100 : 0) / 100) * bounds.width;
    const resistance = 0.55;
    stretchKnob((overshoot * bounds.width * resistance) / (bounds.width + resistance * Math.abs(overshoot)));
    update(Math.round(next));
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    stretchKnob(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = position - (event.shiftKey ? 10 : 1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = position + (event.shiftKey ? 10 : 1);
        break;
      case "PageDown":
        next = position - 10;
        break;
      case "PageUp":
        next = position + 10;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    update(next);
  };

  return (
    <div
      data-compare-curtain=""
      data-disabled={disabled || undefined}
      className={cn("text-foreground w-full font-mono data-disabled:opacity-50", className)}
      style={style}
    >
      <div
        ref={stageRef}
        data-compare-stage=""
        className="border-foreground bg-muted relative aspect-[3/1] min-h-40 w-full overflow-hidden border"
      >
        <div data-compare-before="" className="absolute inset-0 overflow-hidden">
          {before}
        </div>
        <div
          data-compare-after=""
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          {after}
        </div>
        <div
          aria-hidden="true"
          className="bg-background pointer-events-none absolute inset-y-0 z-10 w-px shadow-[0_0_0_1px_var(--foreground)]"
          style={{ left: `${position}%` }}
        />
        <div
          data-compare-handle=""
          data-dragging={dragging || undefined}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={position}
          aria-valuetext={`${position}% ${afterLabel.toLowerCase()}`}
          aria-disabled={disabled || undefined}
          aria-orientation="horizontal"
          className={cn(
            "absolute inset-y-0 z-20 w-11 -translate-x-1/2 touch-none outline-none select-none",
            "focus-visible:[&>span]:ring-foreground focus-visible:[&>span]:ring-offset-background focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-offset-2",
            disabled ? "cursor-default" : "cursor-ew-resize",
          )}
          style={{ left: `clamp(22px, ${position}%, calc(100% - 22px))` }}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => {
            if (disabled || event.button !== 0 || dragRef.current !== null) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            dragRef.current = { pointerId: event.pointerId, x: event.clientX, value: position };
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) updateFromPointer(event);
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
        >
          <span
            ref={knobRef}
            className={cn(
              "border-foreground bg-background text-foreground pointer-events-none absolute top-1/2 left-1/2 grid size-8 -translate-1/2 place-items-center rounded-full border shadow-sm",
              // The knob answers the press at once and tracks any edge stretch
              // directly, then settles back on release. Reduced motion drops the
              // press scale and the return travel.
              dragging
                ? "motion-reduce:bg-muted transition-[scale] duration-100 ease-out motion-safe:scale-[0.96] motion-reduce:transition-none"
                : "transition-[scale,transform] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none",
            )}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 7-5 5 5 5M15 7l5 5-5 5M4 12h16" />
            </svg>
          </span>
        </div>
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between gap-4 text-[10px] tracking-widest uppercase">
        <span>{afterLabel}</span>
        <span>{beforeLabel}</span>
      </div>
    </div>
  );
}
