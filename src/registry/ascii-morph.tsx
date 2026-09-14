"use client";

import { clsx } from "clsx";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

export type AsciiMorphShape = "globe" | "flower" | "a1";

export type AsciiMorphProps = {
  shape?: AsciiMorphShape;
  defaultShape?: AsciiMorphShape;
  onShapeChange?: (shape: AsciiMorphShape) => void;
  /** Approximate settling time in milliseconds, clamped to 400–4000. */
  duration?: number;
  interactive?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

type Point = { x: number; y: number };
type Particle = Point & { vx: number; vy: number };
const order: AsciiMorphShape[] = ["globe", "flower", "a1"];
const names = { globe: "Globe", flower: "Flower", a1: "A1 monogram" };
const glyphs = "01.:+*#@";
const count = 512;
const tau = Math.PI * 2;

function makeShapes(): Record<AsciiMorphShape, Point[]> {
  const globe: Point[] = [];
  const flower: Point[] = [];
  const monogram: Point[] = [];
  // Three meridians and the rim, tilted together around the globe's axis.
  for (const width of [0.24, 0.57, 0.83, 1]) {
    for (let i = 0; i < 78; i++) {
      const angle = (i / 78) * tau;
      const x = Math.cos(angle) * 133 * width;
      const y = Math.sin(angle) * 133;
      globe.push({ x: 240 + x * 0.966 - y * 0.259, y: 200 + x * 0.259 + y * 0.966 });
    }
  }
  for (const latitude of [-0.72, -0.38, 0, 0.38, 0.72]) {
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * tau;
      const radius = Math.sqrt(1 - latitude * latitude) * 133;
      const x = Math.cos(angle) * radius;
      const y = latitude * 133 + Math.sin(angle) * radius * 0.13;
      globe.push({ x: 240 + x * 0.966 - y * 0.259, y: 200 + x * 0.259 + y * 0.966 });
    }
  }
  for (let petal = 0; petal < 8; petal++) {
    const rotation = (petal / 8) * tau;
    for (let i = 0; i < 54; i++) {
      const angle = (i / 54) * tau;
      const radial = 79 + Math.cos(angle) * 53;
      const side = Math.sin(angle) * 25;
      flower.push({
        x: 240 + radial * Math.cos(rotation) - side * Math.sin(rotation),
        y: 200 + radial * Math.sin(rotation) + side * Math.cos(rotation),
      });
    }
  }
  for (let i = 0; i < 80; i++) {
    const angle = i * 2.399963;
    const radius = Math.sqrt(i / 80) * 25;
    flower.push({ x: 240 + Math.cos(angle) * radius, y: 200 + Math.sin(angle) * radius });
  }
  // Sample a block A and a slab-serif 1 on a monospace grid.
  for (let y = 0; y < 25; y++) {
    for (let x = 0; x < 43; x++) {
      const a =
        (Math.abs(x - (11 - y * 0.4)) < 2.5 ||
          Math.abs(x - (13 + y * 0.4)) < 2.5 ||
          (y >= 14 && y <= 17 && x >= 5 && x <= 19)) &&
        x < 25;
      const one =
        (x >= 32 && x <= 36) || (y < 5 && x >= 28 + (4 - y) && x < 32) || (y >= 21 && x >= 28 && x <= 40);
      if (a || one) monogram.push({ x: 91 + x * 7, y: 94 + y * 9 });
    }
  }
  // Each shape keeps exactly the same particles. Coprime permutations make
  // characters cross the stage instead of merely sliding along the outlines.
  const sample = (points: Point[], stride: number) =>
    Array.from(
      { length: count },
      (_, i) => points[Math.floor((((i * stride) % count) / count) * points.length)],
    );
  return { globe: sample(globe, 1), flower: sample(flower, 197), a1: sample(monogram, 307) };
}

const shapes = makeShapes();

export function AsciiMorph({
  shape,
  defaultShape = "globe",
  onShapeChange,
  duration = 1600,
  interactive = true,
  ariaLabel = "Change ASCII shape",
  className,
  style,
}: AsciiMorphProps) {
  const [internalShape, setInternalShape] = useState(defaultShape);
  const current = shape ?? internalShape;
  // Initial SVG coordinates stay constant in React. The animation owns the
  // live coordinates, so an unrelated render cannot reset a travelling glyph.
  const [initialPoints] = useState(() => shapes[current]);
  const rootRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(SVGTextElement | null)[]>([]);
  const selectionRef = useRef(current);
  const engineRef = useRef<{
    configure: (next: AsciiMorphShape, duration: number, interactive: boolean) => void;
  } | null>(null);
  const instructionsId = useId();
  const statusId = useId();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const particles: Particle[] = initialPoints.map((point) => ({ ...point, vx: 0, vy: 0 }));
    let target = initialPoints;
    let frame = 0;
    let previousTime: number | null = null;
    let moving = false;
    let visible = true;
    let enabled = true;
    let settlingTime = 1600;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    function paint() {
      particles.forEach((particle, i) => {
        const element = textRefs.current[i];
        element?.setAttribute("x", particle.x.toFixed(3));
        element?.setAttribute("y", particle.y.toFixed(3));
      });
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
    }

    function snap() {
      particles.forEach((particle, i) => Object.assign(particle, target[i], { vx: 0, vy: 0 }));
      moving = false;
      root!.dataset.state = "idle";
      paint();
    }

    function tick(time: number) {
      frame = 0;
      // A suspended tab resumes from the last painted state. A long frame
      // advances at most 32ms, avoiding a visible leap after a main-thread stall.
      const dt = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.032);
      previousTime = time;
      let unsettled = false;
      particles.forEach((particle, i) => {
        // Exact critically damped spring integration. Retargeting changes only
        // the destination; both position and velocity survive repeated clicks.
        for (const axis of ["x", "y"] as const) {
          const velocity = axis === "x" ? "vx" : "vy";
          const variation = ((i * (axis === "x" ? 17 : 29)) % 31) / 31;
          const omega = ((9 + variation * 5) * 1000) / settlingTime;
          const offset = particle[axis] - target[i][axis];
          const impulse = particle[velocity] + omega * offset;
          const decay = Math.exp(-omega * dt);
          particle[axis] = target[i][axis] + (offset + impulse * dt) * decay;
          particle[velocity] = (particle[velocity] - omega * impulse * dt) * decay;
          if (Math.abs(particle[axis] - target[i][axis]) > 0.025 || Math.abs(particle[velocity]) > 0.1) {
            unsettled = true;
          }
        }
      });
      if (!unsettled) {
        snap();
        previousTime = null;
        return;
      }
      paint();
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      root!.dataset.motion = media.matches ? "reduced" : enabled ? "enabled" : "static";
      if (media.matches || !enabled) {
        stop();
        snap();
      } else if (!visible || document.hidden) {
        stop();
      } else if (moving && !frame) {
        frame = requestAnimationFrame(tick);
      }
    }

    engineRef.current = {
      configure(next, milliseconds, isInteractive) {
        settlingTime = Number.isFinite(milliseconds) ? Math.min(4000, Math.max(400, milliseconds)) : 1600;
        enabled = isInteractive;
        if (target !== shapes[next]) {
          target = shapes[next];
          moving = true;
          root.dataset.state = "morphing";
        }
        sync();
      },
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(root);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      observer.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      engineRef.current = null;
    };
  }, [initialPoints]);

  useEffect(() => {
    selectionRef.current = current;
    engineRef.current?.configure(current, duration, interactive);
  }, [current, duration, interactive]);

  function cycle(direction = 1) {
    const next = order[(order.indexOf(selectionRef.current) + direction + order.length) % order.length];
    if (shape === undefined) {
      selectionRef.current = next;
      setInternalShape(next);
    }
    onShapeChange?.(next);
  }

  return (
    <div
      ref={rootRef}
      data-slot="ascii-morph"
      data-shape={current}
      data-state="idle"
      role={interactive ? undefined : "img"}
      aria-label={interactive ? undefined : `ASCII ${names[current]}`}
      className={clsx("text-foreground relative isolate w-full", className)}
      style={style}
    >
      <svg
        data-slot="ascii-morph-art"
        viewBox="0 0 480 400"
        aria-hidden="true"
        className="pointer-events-none block size-full select-none"
        style={{ aspectRatio: "6 / 5" }}
      >
        <g
          fill="currentColor"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          fontSize="8"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {initialPoints.map((point, i) => (
            <text
              key={i}
              ref={(element) => {
                textRefs.current[i] = element;
              }}
              x={point.x.toFixed(3)}
              y={point.y.toFixed(3)}
              opacity={0.48 + ((i * 13) % 11) * 0.052}
            >
              {glyphs[(i * 7 + Math.floor(i / 9)) % glyphs.length]}
            </text>
          ))}
        </g>
      </svg>
      {interactive ? (
        <>
          <button
            type="button"
            aria-label={ariaLabel}
            aria-describedby={`${instructionsId} ${statusId}`}
            className="focus-visible:outline-ring absolute inset-0 size-full cursor-pointer touch-manipulation rounded-[inherit] border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:-outline-offset-4"
            onClick={() => cycle()}
            onKeyDown={(event) => {
              if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                cycle(event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
              }
            }}
          />
          <span id={instructionsId} className="sr-only">
            Click, press Enter or Space for the next shape. Arrow keys cycle in either direction.
          </span>
          <span id={statusId} className="sr-only" role="status">
            {names[current]}
          </span>
        </>
      ) : null}
    </div>
  );
}
