"use client";

import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";
import { clsx } from "clsx";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

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

const initialPosition = { x: 0.5, y: 0.5 };
const duckArt = [
  "              _yyqqpyy_",
  "            _y@@@@@@@@@y_",
  "           ,@@@@@@@@@@@@@,",
  "          ;@@@@@@@@@@@@@@@y",
  "         ,@@@@@Q@@@@@@@@@@@y",
  "         @@@@@OOq@@@@@@@@@@@L",
  "  __     @@@@@OOq@@@@@@@@@@@L",
  " <==,   _y@@@@@@q@@@@@@@@@@@L",
  "  <===yy@@@@@@@@@@@@@@@@@@@L",
  "   <====Q@@@@@@@@@@@@@@@@@@L",
  "    !===Q@@@@@@@@@@@@@@@@@$'",
  "     '!!yQQ@@@@@@@@@@@@@@Q$",
  "       'QQQQ@@@@@@@@@@@Q$'",
  "         'sQQQQQQQQQQQs'",
  "           '?SSSSSSSS?'",
  "            _p555555y_             ,yqp",
  "          _y@@@@@@@@@gyyy_       _y@@@@y",
  "        _y@@@@@@@@@@@@@@@@yyyyy@@@@@@@@L",
  "       y@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@L",
  "      @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@,",
  "     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@L",
  "    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@L",
  "    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@L",
  "    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@L",
  "    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'",
  "    4@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@P",
  "     'Q@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@Q'",
  "      ?Q@@@@@@@@@@@@@@@@@@@@@@@@@@@@Q?",
  "       '4QQ@@@@@@@@@@@@@@@@@@@@@@QQ4'",
  "         '4QQQQQ@@@@@@@@@@@@@QQQQ4'",
  "           '^^?YQQQQQQQQQQQQY?^^'",
  "                '''^^^^'''",
];
const cellWidth = 92 / Math.max(...duckArt.map((row) => row.length));
const cellHeight = 92 / duckArt.length;
const duckRows = duckArt.map((row, index) => ({
  text: row.trim(),
  x: 4 + row.search(/\S/) * cellWidth,
  y: 4 + index * cellHeight,
  width: row.trim().length * cellWidth,
}));
// Reserve room for the lifted duck so its glyphs never touch the paragraph while held.
const liftPadding = 3;
// The duck lifts the moment it is pressed and settles back without overshoot on release.
const duckStyles = `
  [data-slot="shape-flow-duck"] {
    transform-origin: 50% 50%;
    transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  [data-slot="shape-flow-handle"][data-dragging="true"] [data-slot="shape-flow-duck"] {
    transform: scale(1.04);
    transition-duration: 120ms;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-slot="shape-flow-duck"] { transition: none; }
    [data-slot="shape-flow-handle"][data-dragging="true"] [data-slot="shape-flow-duck"] {
      transform: none;
      opacity: 0.75;
    }
  }
`;
// A flick hands its velocity to a lightly damped spring (damping 0.8, response 0.4s) that
// settles on the momentum-projected point, as a thrown object would.
const settleResponse = 0.4;
const settleDamping = 0.8;
const deceleration = 0.998;
const velocityWindow = 100;
const maxVelocity = 8000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const project = (velocity: number) => ((velocity / 1000) * deceleration) / (1 - deceleration);
// Past an edge the duck follows with growing resistance instead of stopping dead.
const rubberband = (overshoot: number, dimension: number) =>
  (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
const soften = (value: number, travel: number, dimension: number) => {
  const edge = clamp(value, 0, 1);
  return travel > 0 && dimension > 0 ? edge + rubberband((value - edge) * travel, dimension) / travel : edge;
};
const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const positive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export function ShapeFlow({
  text,
  radius = 80,
  gap = 4,
  height = 320,
  fontSize = 18,
  lineHeight = 28,
  fontFamily = "Georgia",
  className,
}: ShapeFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    samples: { x: number; y: number; time: number }[];
    position: { x: number; y: number };
  } | null>(null);
  const settleFrameRef = useRef(0);
  const geometryRef = useRef({ travelX: 0, travelY: 0 });
  const instructionsId = useId();
  const duckGradientId = useId();
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
  const spacing = Number.isFinite(gap) ? Math.max(0, gap) : 4;
  const halfExtent = Math.min(positive(radius, 80), width / 3, areaHeight / 3);
  const travelX = Math.max(0, width - halfExtent * 2);
  const centerX = halfExtent + position.x * travelX;
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
    const layoutAtHeight = (layoutHeight: number) => {
      const centerY = halfExtent + position.y * Math.max(0, layoutHeight - halfExtent * 2);
      const fragments: { text: string; x: number; y: number; width: number }[] = [];
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = 0;
      while (true) {
        const scale = (halfExtent * 2) / 100;
        const bandTop = (y - spacing - (centerY - halfExtent)) / scale;
        const bandBottom = (y + leading + spacing - (centerY - halfExtent)) / scale;
        const blocked: [number, number][] = [];
        for (const row of duckRows) {
          if (row.y + cellHeight + liftPadding < bandTop || row.y - liftPadding > bandBottom) continue;
          blocked.push([
            clamp(centerX - halfExtent + (row.x - liftPadding) * scale - spacing, 0, width),
            clamp(centerX - halfExtent + (row.x + row.width + liftPadding) * scale + spacing, 0, width),
          ]);
        }
        blocked.sort((a, b) => a[0] - b[0]);
        const intervals: [number, number][] = [];
        let nextLeft = 0;
        for (const [left, right] of blocked) {
          if (left > nextLeft) intervals.push([nextLeft, left]);
          nextLeft = Math.max(nextLeft, right);
        }
        if (nextLeft < width) intervals.push([nextLeft, width]);

        for (const [left, right] of intervals) {
          const available = right - left;
          // Skip slivers beside the shape, but allow narrow containers below it.
          if (available <= 0 || (blocked.length > 0 && available < size * 2)) continue;
          const range = layoutNextLineRange(prepared, cursor, available);
          if (!range) {
            const lastLine = fragments[fragments.length - 1];
            return { fragments, height: Math.max(layoutHeight, lastLine ? lastLine.y + leading : 0) };
          }
          const line = materializeLineRange(prepared, range);
          fragments.push({ text: line.text, x: left, y, width: available });
          cursor = range.end;
        }
        y += leading;
      }
    };
    // Text can make the area taller than its minimum. Reflow at the expanded
    // height so the shape and its drag bounds use the same final rectangle.
    // Only grow during this calculation to avoid oscillating between line breaks.
    let layoutHeight = areaHeight;
    while (true) {
      const result = layoutAtHeight(layoutHeight);
      if (result.height <= layoutHeight) return result;
      layoutHeight = result.height;
    }
  }, [prepared, width, halfExtent, spacing, centerX, position.y, leading, size, areaHeight]);

  const travelY = Math.max(0, (flow?.height ?? areaHeight) - halfExtent * 2);
  const centerY = halfExtent + position.y * travelY;

  useLayoutEffect(() => {
    geometryRef.current = { travelX, travelY };
  });

  useEffect(() => () => cancelAnimationFrame(settleFrameRef.current), []);

  function stopSettling() {
    cancelAnimationFrame(settleFrameRef.current);
    settleFrameRef.current = 0;
  }

  // Animate from the on-screen position toward the projected resting point, carrying the
  // release velocity (normalized units per second) so there is no seam between drag and spring.
  function settle(from: { x: number; y: number }, velocity: { x: number; y: number }) {
    stopSettling();
    const omega = (2 * Math.PI) / settleResponse;
    const axes = (["x", "y"] as const).map((axis) => ({
      axis,
      value: from[axis],
      velocity: velocity[axis],
      target: clamp(from[axis] + project(velocity[axis]), 0, 1),
    }));
    let previous: number | null = null;
    const step = (now: number) => {
      const elapsed = previous === null ? 1 / 60 : Math.min(0.064, (now - previous) / 1000);
      previous = now;
      const substeps = Math.max(1, Math.ceil(elapsed * 240));
      const dt = elapsed / substeps;
      const { travelX: currentX, travelY: currentY } = geometryRef.current;
      let resting = true;
      for (const state of axes) {
        for (let index = 0; index < substeps; index += 1) {
          const acceleration =
            -omega * omega * (state.value - state.target) - 2 * settleDamping * omega * state.velocity;
          state.velocity += acceleration * dt;
          state.value += state.velocity * dt;
        }
        const travel = state.axis === "x" ? currentX : currentY;
        const scale = Math.max(1, travel);
        if (Math.abs(state.value - state.target) * scale > 0.5 || Math.abs(state.velocity) * scale > 10) {
          resting = false;
        }
      }
      const [x, y] = axes;
      if (resting) {
        settleFrameRef.current = 0;
        setPosition({ x: x.target, y: y.target });
        return;
      }
      setPosition({ x: soften(x.value, currentX, halfExtent), y: soften(y.value, currentY, halfExtent) });
      settleFrameRef.current = requestAnimationFrame(step);
    };
    settleFrameRef.current = requestAnimationFrame(step);
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    // Catch a settling duck where it is on screen, keeping the offset from where it was grabbed.
    stopSettling();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX - bounds.left - centerX,
      y: event.clientY - bounds.top - centerY,
      left: bounds.left,
      top: bounds.top,
      samples: [{ x: event.clientX, y: event.clientY, time: event.timeStamp }],
      position,
    };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    drag.samples.push({ x: event.clientX, y: event.clientY, time: event.timeStamp });
    while (drag.samples.length > 2 && event.timeStamp - drag.samples[0].time > velocityWindow) {
      drag.samples.shift();
    }
    const edge = prefersReducedMotion()
      ? (value: number) => clamp(value, 0, 1)
      : (value: number, travel: number) => soften(value, travel, halfExtent);
    drag.position = {
      x: travelX ? edge((event.clientX - drag.left - drag.x - halfExtent) / travelX, travelX) : 0.5,
      y: travelY ? edge((event.clientY - drag.top - drag.y - halfExtent) / travelY, travelY) : 0.5,
    };
    setPosition(drag.position);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (drag?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (prefersReducedMotion()) {
      setPosition({ x: clamp(drag.position.x, 0, 1), y: clamp(drag.position.y, 0, 1) });
      return;
    }
    // Only a release carries momentum. A cancelled gesture just eases back inside the bounds.
    const recent = drag.samples.filter((sample) => event.timeStamp - sample.time <= velocityWindow);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const seconds = first && last ? (last.time - first.time) / 1000 : 0;
    const velocity = (distance: number, travel: number) =>
      event.type === "pointerup" && seconds > 0 && travel > 0
        ? clamp(distance / seconds, -maxVelocity, maxVelocity) / travel
        : 0;
    settle(drag.position, {
      x: velocity(last ? last.x - first.x : 0, travelX),
      y: velocity(last ? last.y - first.y : 0, travelY),
    });
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
      stopSettling();
      setPosition(initialPosition);
      return;
    }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    stopSettling();
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
            Drag to move the duck. Or use arrow keys, hold Shift for larger steps, and press Home to reset.
          </span>
          <button
            type="button"
            aria-label="Move duck"
            aria-describedby={instructionsId}
            data-slot="shape-flow-handle"
            data-dragging={dragging}
            className="text-foreground focus-visible:outline-ring absolute flex touch-none items-center justify-center border-0 bg-transparent p-0 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid"
            style={{
              left: centerX - halfExtent,
              top: centerY - halfExtent,
              width: halfExtent * 2,
              height: halfExtent * 2,
              cursor: dragging ? "grabbing" : "grab",
            }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={moveWithKeyboard}
          >
            <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute size-full">
              <defs>
                <linearGradient
                  id={duckGradientId}
                  gradientUnits="userSpaceOnUse"
                  x1="15"
                  y1="0"
                  x2="75"
                  y2="100"
                >
                  <stop offset="0%" stopColor="#fff58a" />
                  <stop offset="45%" stopColor="#eee34e" />
                  <stop offset="100%" stopColor="#b4a22d" />
                </linearGradient>
              </defs>
              <g
                data-slot="shape-flow-duck"
                fill={`url(#${duckGradientId})`}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fontSize="3.8"
                fontWeight="600"
                style={{ fontKerning: "none", fontVariantLigatures: "none" }}
              >
                {duckRows.map((row, index) => (
                  <text
                    key={index}
                    data-slot="shape-flow-duck-row"
                    x={row.x}
                    y={row.y + cellHeight * 0.82}
                    textLength={row.width}
                    lengthAdjust="spacingAndGlyphs"
                    xmlSpace="preserve"
                  >
                    {row.text.split(/([<>=!;:]+|OO)/).map((part, partIndex) => (
                      <tspan
                        key={partIndex}
                        fill={part === "OO" ? "#302b23" : /^[<>=!;:]+$/.test(part) ? "#d07935" : undefined}
                      >
                        {part}
                      </tspan>
                    ))}
                  </text>
                ))}
              </g>
            </svg>
            <style>{duckStyles}</style>
          </button>
        </>
      ) : null}
    </div>
  );
}
