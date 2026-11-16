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
  animate,
  cancelFrame,
  frame,
  motion,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
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
import { flushSync } from "react-dom";

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
// Apple's spring terms: a 0.4s response, and a damping ratio of 1 (no overshoot) or 0.8 (a slight
// bounce). Written as stiffness and damping because Motion drops `velocity` on duration-based
// springs, and every release hands its spring a velocity.
const frequency = (2 * Math.PI) / 0.4;
// Keyboard moves, and a duck let go at rest, ease into place without overshooting.
const settleSpring = { type: "spring", stiffness: frequency ** 2, damping: 2 * frequency } as const;
// Bounce is reserved for a flick: only a release that carried momentum overshoots.
const throwSpring = { type: "spring", stiffness: frequency ** 2, damping: 1.6 * frequency } as const;
const flickSpeed = 500;
// The duck lifts the moment it is pressed and sets down a little slower on release.
const liftSpring = { type: "spring", visualDuration: 0.15, bounce: 0 } as const;
const dropSpring = { type: "spring", visualDuration: 0.3, bounce: 0 } as const;
// Reduced motion: the held duck dims instead of lifting.
const fade = { duration: 0.15, ease: "easeOut" } as const;
const deceleration = 0.998;
const velocityWindow = 100;
const maxVelocity = 8000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
// Where a value moving at `velocity` per second would coast to a stop, as a scroll view decelerates.
const project = (velocity: number) => ((velocity / 1000) * deceleration) / (1 - deceleration);
const rubberband = (overshoot: number, dimension: number) =>
  (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
// Where an offset along the duck's travel shows on screen. Past an edge the duck follows with
// growing resistance instead of stopping dead; with reduced motion it stops at the edge.
const place = (offset: number, travel: number, dimension: number, elastic: boolean) => {
  const edge = clamp(offset, 0, travel);
  return elastic && travel > 0 && dimension > 0 ? edge + rubberband(offset - edge, dimension) : edge;
};
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
  const reducedMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  // `originX` and `originY` are where the pointer would be with the duck at the start of its
  // travel, so the offset from where it was grabbed holds for the whole drag.
  const dragRef = useRef<{
    id: number;
    originX: number;
    originY: number;
    samples: { x: number; y: number; time: number }[];
  } | null>(null);
  // Where the duck rests, or is heading: keyboard steps add up from here while it is still moving.
  const restRef = useRef(initialPosition);
  // The paragraph changes height as it reflows, and a duck that is held or thrown must not move
  // with it. Until it lands, `y` is measured against the vertical travel the duck had when it was
  // picked up, which pins it to a pixel offset. At rest `y` is a share of the current travel, so
  // the duck keeps its place when the paragraph is resized.
  const spanRef = useRef<number | null>(null);
  const travelRef = useRef(0);
  const instructionsId = useId();
  const duckGradientId = useId();
  // The duck's live position as a share of its travel on each axis. A drag sets these 1:1 and a
  // release springs each one on its own. They run past 0 and 1, and `place` softens what shows.
  const x = useMotionValue(initialPosition.x);
  const y = useMotionValue(initialPosition.y);
  const [width, setWidth] = useState(0);
  // The motion values as of this frame, with the travel `y` is pinned to while there is one.
  const [position, setPosition] = useState<{ x: number; y: number; span?: number }>(initialPosition);
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
  const elastic = !reducedMotion;
  const travelX = Math.max(0, width - halfExtent * 2);
  const centerX = halfExtent + place(position.x * travelX, travelX, halfExtent, elastic);
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

  // The paragraph reflows around the duck's live position. Both axes commit as one layout in
  // Motion's render step, so the text and the duck land on the same frame as the drag or spring
  // that moved them.
  useEffect(() => {
    const commit = () =>
      flushSync(() => setPosition({ x: x.get(), y: y.get(), span: spanRef.current ?? undefined }));
    const schedule = () => frame.render(commit);
    const stopX = x.on("change", schedule);
    const stopY = y.on("change", schedule);
    return () => {
      stopX();
      stopY();
      cancelFrame(commit);
      x.stop();
      y.stop();
    };
  }, [x, y]);

  const flow = useMemo(() => {
    if (!prepared || width <= 0) return null;
    const layoutAtHeight = (layoutHeight: number) => {
      const travel = Math.max(0, layoutHeight - halfExtent * 2);
      const centerY = halfExtent + place(position.y * (position.span ?? travel), travel, halfExtent, elastic);
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
  }, [
    prepared,
    width,
    halfExtent,
    spacing,
    centerX,
    position.y,
    position.span,
    elastic,
    leading,
    size,
    areaHeight,
  ]);

  const travelY = Math.max(0, (flow?.height ?? areaHeight) - halfExtent * 2);
  const centerY = halfExtent + place(position.y * (position.span ?? travelY), travelY, halfExtent, elastic);

  useLayoutEffect(() => {
    travelRef.current = travelY;
  });

  // Lets go of the pixel offset: `y` becomes a share of the travel again, measured against the
  // paragraph as it is laid out now, so nothing moves on screen.
  function unpin() {
    const span = spanRef.current;
    if (span === null) return;
    spanRef.current = null;
    const scale = span > 0 && travelRef.current > 0 ? span / travelRef.current : 1;
    y.jump(y.get() * scale);
    restRef.current = { x: restRef.current.x, y: clamp(restRef.current.y * scale, 0, 1) };
    setPosition({ x: x.get(), y: y.get() });
  }

  // Sends the duck to a resting point. Each axis has its own spring, which starts from the value
  // on screen and keeps the velocity it has (or is handed), so a duck in flight never jumps or
  // stalls when it is given somewhere new to go. With reduced motion it is placed there at once.
  function send(
    target: { x: number; y: number },
    transition: typeof settleSpring | typeof throwSpring = settleSpring,
    velocity?: { x: number; y: number },
  ) {
    restRef.current = target;
    const axes: [MotionValue<number>, "x" | "y", number][] = [
      [x, "x", travelX],
      [y, "y", spanRef.current ?? travelY],
    ];
    const flights = axes.map(([value, axis, travel]) => {
      if (reducedMotion || travel <= 0) return void value.jump(target[axis]);
      if (value.get() === target[axis] && !velocity?.[axis] && !value.isAnimating()) return;
      return animate(value, target[axis], {
        ...transition,
        ...(velocity && { velocity: velocity[axis] }),
        // The values are shares of the travel, so rest is half a pixel and 10 pixels a second.
        restDelta: 0.5 / travel,
        restSpeed: 10 / travel,
      });
    });
    void Promise.all(flights).then(land);
  }

  // A thrown duck has come to rest. If it was thrown at the lower edge, or the paragraph has
  // since moved that edge above it, it settles onto the edge where the paragraph has put it.
  function land() {
    if (spanRef.current === null || dragRef.current || x.isAnimating() || y.isAnimating()) return;
    const bound = restRef.current.y === 1;
    unpin();
    if (y.get() > 1 || (bound && y.get() < 1)) send({ x: x.get(), y: 1 });
    else restRef.current = { x: x.get(), y: y.get() };
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return;
    // Catch a duck in flight where it is on screen. The springs stop on their live values and
    // the drag carries on from them, so nothing jumps and the grab offset is kept.
    x.stop();
    y.stop();
    spanRef.current ??= travelY;
    // Capture keeps the drag alive outside the duck. It can fail if the pointer is already gone.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    dragRef.current = {
      id: event.pointerId,
      originX: event.clientX - x.get() * travelX,
      originY: event.clientY - y.get() * spanRef.current,
      samples: [{ x: event.clientX, y: event.clientY, time: event.timeStamp }],
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
    // 1:1 with the pointer. A container with no room to move in leaves the duck where it is.
    const span = spanRef.current ?? 0;
    if (travelX) x.set((event.clientX - drag.originX) / travelX);
    if (span) y.set((event.clientY - drag.originY) / span);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (drag?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (reducedMotion) {
      // No momentum and no spring: the duck stays where it was let go, inside the bounds.
      unpin();
      return send({ x: clamp(x.get(), 0, 1), y: clamp(y.get(), 0, 1) });
    }
    // Only a lifted pointer that was still moving carries momentum. Speed is measured up to the
    // moment of release, so a pause before lifting bleeds it away, and a cancelled gesture has none:
    // either way the duck just eases back inside the bounds.
    const recent = drag.samples.filter((sample) => event.timeStamp - sample.time <= velocityWindow);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const seconds = first ? (event.timeStamp - first.time) / 1000 : 0;
    const moving = event.type === "pointerup" && seconds > 0;
    const speedX = moving ? clamp((last.x - first.x) / seconds, -maxVelocity, maxVelocity) : 0;
    const speedY = moving ? clamp((last.y - first.y) / seconds, -maxVelocity, maxVelocity) : 0;
    // The springs take over at the pointer's velocity, so there is no seam between dragging and
    // settling, and momentum decides where the duck comes to rest.
    const span = spanRef.current ?? 0;
    const velocity = { x: travelX ? speedX / travelX : 0, y: span ? speedY / span : 0 };
    send(
      { x: clamp(x.get() + project(velocity.x), 0, 1), y: clamp(y.get() + project(velocity.y), 0, 1) },
      Math.hypot(speedX, speedY) >= flickSpeed ? throwSpring : settleSpring,
      velocity,
    );
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction && event.key !== "Home") return;
    event.preventDefault();
    // A held duck belongs to the pointer.
    if (dragRef.current) return;
    unpin();
    if (!direction) return send(initialPosition);
    const step = event.shiftKey ? 32 : 8;
    send({
      x: clamp(restRef.current.x + (direction[0] * step) / (travelX || 1), 0, 1),
      y: clamp(restRef.current.y + (direction[1] * step) / (travelY || 1), 0, 1),
    });
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
            className="text-foreground focus-visible:outline-ring absolute top-0 left-0 flex touch-none items-center justify-center border-0 bg-transparent p-0 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid"
            style={{
              width: halfExtent * 2,
              height: halfExtent * 2,
              // Only the transform moves the duck. It is written in the same commit as the lines
              // it displaces, so the two can never be a frame apart.
              transform: `translate(${centerX - halfExtent}px, ${centerY - halfExtent}px)`,
              willChange: "transform",
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
              <motion.g
                data-slot="shape-flow-duck"
                fill={`url(#${duckGradientId})`}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
                fontSize="3.8"
                fontWeight="600"
                style={{ fontKerning: "none", fontVariantLigatures: "none" }}
                // Feedback starts on pointer-down: the held duck lifts, or dims with reduced motion.
                initial={false}
                animate={
                  reducedMotion
                    ? { scale: 1, opacity: dragging ? 0.75 : 1 }
                    : { scale: dragging ? 1.04 : 1, opacity: 1 }
                }
                transition={reducedMotion ? fade : dragging ? liftSpring : dropSpring}
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
              </motion.g>
            </svg>
          </button>
        </>
      ) : null}
    </div>
  );
}
