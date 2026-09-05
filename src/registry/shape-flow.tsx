"use client";

import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";
import { clsx } from "clsx";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export type ShapeFlowProps = {
  text: string;
  radius?: number;
  gap?: number;
  height?: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  className?: string;
};

const initialPosition = { x: 0.55, y: 0.4 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const positive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export function ShapeFlow({
  text,
  radius = 64,
  gap = 14,
  height = 320,
  fontSize = 18,
  lineHeight = 28,
  fontFamily = "Georgia",
  className,
}: ShapeFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const instructionsId = useId();
  const [width, setWidth] = useState(0);
  const [position, setPosition] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const [measurement, setMeasurement] = useState<{
    text: string;
    font: string;
    prepared: PreparedTextWithSegments;
  } | null>(null);

  const size = positive(fontSize, 18);
  const leading = Math.max(size, positive(lineHeight, 28));
  const areaHeight = positive(height, 320);
  const spacing = Number.isFinite(gap) ? Math.max(0, gap) : 14;
  const circleRadius = Math.min(positive(radius, 64), width / 3, areaHeight / 3);
  const travelX = Math.max(0, width - circleRadius * 2);
  const travelY = Math.max(0, areaHeight - circleRadius * 2);
  const centerX = circleRadius + position.x * travelX;
  const centerY = circleRadius + position.y * travelY;
  const font = `400 ${size}px ${fontFamily}`;
  const prepared = measurement?.text === text && measurement.font === font ? measurement.prepared : null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function measure() {
      try {
        await document.fonts.load(font, text);
        if (cancelled || typeof Intl.Segmenter !== "function") return;
        const next = prepareWithSegments(text, font);
        setMeasurement({ text, font, prepared: next });
      } catch {
        // Leave the readable paragraph in place if font measurement is unavailable.
      }
    }
    void measure();
    return () => {
      cancelled = true;
    };
  }, [font, text]);

  const flow = useMemo(() => {
    if (!prepared || width <= 0) return null;
    const fragments: { text: string; x: number; y: number; width: number }[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    const exclusionRadius = circleRadius + spacing;

    while (true) {
      // Use the closest point on the entire line box, not just its baseline.
      const distance = Math.max(y - centerY, centerY - (y + leading), 0);
      const halfWidth = distance < exclusionRadius ? Math.sqrt(exclusionRadius ** 2 - distance ** 2) : 0;
      const intervals =
        halfWidth > 0
          ? [
              [0, Math.max(0, centerX - halfWidth)],
              [Math.min(width, centerX + halfWidth), width],
            ]
          : [[0, width]];

      for (const [left, right] of intervals) {
        const available = right - left;
        // Skip slivers beside the shape, but allow narrow containers below it.
        if (available <= 0 || (halfWidth > 0 && available < size * 2)) continue;
        const range = layoutNextLineRange(prepared, cursor, available);
        if (!range) return { fragments, height: Math.max(areaHeight, y + leading) };
        const line = materializeLineRange(prepared, range);
        fragments.push({ text: line.text, x: left, y, width: available });
        cursor = range.end;
      }
      y += leading;
    }
  }, [prepared, width, circleRadius, spacing, centerX, centerY, leading, size, areaHeight]);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX - bounds.left - centerX,
      y: event.clientY - bounds.top - centerY,
      left: bounds.left,
      top: bounds.top,
    };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    setPosition({
      x: travelX ? clamp((event.clientX - drag.left - drag.x - circleRadius) / travelX, 0, 1) : 0.5,
      y: travelY ? clamp((event.clientY - drag.top - drag.y - circleRadius) / travelY, 0, 1) : 0.5,
    });
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (event.key === "Home") {
      event.preventDefault();
      setPosition(initialPosition);
      return;
    }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 32 : 8;
    setPosition((current) => ({
      x: clamp(current.x + (direction[0] * step) / (travelX || 1), 0, 1),
      y: clamp(current.y + (direction[1] * step) / (travelY || 1), 0, 1),
    }));
  }

  return (
    <div
      ref={containerRef}
      data-slot="shape-flow"
      data-state={flow ? "ready" : "fallback"}
      className={clsx("text-foreground relative w-full", className)}
      style={{
        minHeight: areaHeight,
        height: flow?.height,
        fontFamily,
        fontSize: size,
        lineHeight: `${leading}px`,
        fontWeight: 400,
        letterSpacing: 0,
        fontKerning: "normal",
        fontVariantLigatures: "normal",
      }}
    >
      <p className={clsx("m-0", flow && "sr-only")}>{text}</p>
      {flow ? (
        <>
          <div aria-hidden="true">
            {flow.fragments.map((fragment, index) => (
              <span
                key={index}
                data-slot="shape-flow-line"
                className="absolute whitespace-pre"
                style={{ left: fragment.x, top: fragment.y, maxWidth: fragment.width }}
              >
                {fragment.text}
              </span>
            ))}
          </div>
          <span id={instructionsId} className="sr-only">
            Drag to move the circle. Or use arrow keys, hold Shift for larger steps, and press Home to reset.
          </span>
          <button
            type="button"
            aria-label="Move circle"
            aria-describedby={instructionsId}
            data-slot="shape-flow-handle"
            data-dragging={dragging}
            className="bg-foreground text-background focus-visible:outline-ring absolute flex touch-none items-center justify-center rounded-full border-0 p-0 select-none focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{
              left: centerX - circleRadius,
              top: centerY - circleRadius,
              width: circleRadius * 2,
              height: circleRadius * 2,
              cursor: dragging ? "grabbing" : "grab",
            }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={moveWithKeyboard}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 128 128"
              className="absolute size-full"
              fill="none"
              stroke="currentColor"
            >
              {[24, 36, 48, 59].map((r) => (
                <circle key={r} cx="64" cy="64" r={r} opacity="0.2" />
              ))}
              <path
                d="M64 49v30m-15-15h30m-20-10 5-5 5 5m-10 20 5 5 5-5M54 59l-5 5 5 5m20-10 5 5-5 5"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  );
}
