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
  const activePointerRef = useRef<number | null>(null);
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

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    update(Math.round(((event.clientX - bounds.left) / bounds.width) * 100));
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== event.pointerId) return;
    activePointerRef.current = null;
    setDragging(false);
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
            if (disabled || event.button !== 0 || activePointerRef.current !== null) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            activePointerRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
            updateFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (activePointerRef.current === event.pointerId) updateFromPointer(event);
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
        >
          <span
            className="border-foreground bg-background text-foreground pointer-events-none absolute top-1/2 left-1/2 grid size-8 -translate-1/2 place-items-center rounded-full border shadow-sm"
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
