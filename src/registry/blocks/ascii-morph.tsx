"use client";

import { clsx } from "clsx";
import { animate, cancelFrame, frame, spring, type FrameData, type KeyframeGenerator } from "motion";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

export type AsciiMorphShape = "globe" | "flower" | "a1";

export type AsciiMorphProps = {
  shape?: AsciiMorphShape;
  defaultShape?: AsciiMorphShape;
  onShapeChange?: (shape: AsciiMorphShape) => void;
  /** Approximate settling time in milliseconds, clamped to 400–4000. Defaults to 1200. */
  duration?: number;
  interactive?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

type Point = { x: number; y: number };
/** Position, plus the offset from the target and velocity (units/s) at the last retarget. */
type Particle = Point & { ox: number; oy: number; vx: number; vy: number };
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

// Each axis of each glyph is a critically damped spring. Their rates come from 31 steps, so the
// glyphs arrive slightly staggered. Springs are linear, so a glyph released from an offset with
// some velocity follows offset × settle(t) + velocity × kick(t). Every glyph retargets at the same
// moment, so 31 pairs of Motion spring generators, each sampled once per frame, drive all 1,024
// axes.
const rates = 31;
const rateOf = (i: number, axis: "x" | "y") => (i * (axis === "x" ? 17 : 29)) % rates;
type Curves = { settle: KeyframeGenerator<number>; kick: KeyframeGenerator<number> }[];
function springsFor(settlingTime: number): Curves {
  return Array.from({ length: rates }, (_, step) => {
    const omega = ((9 + (step / rates) * 5) * 1000) / settlingTime;
    const stiffness = omega * omega;
    // Written as 2√k so Motion computes a damping ratio of exactly 1.
    const physics = {
      stiffness,
      damping: 2 * Math.sqrt(stiffness),
      mass: 1,
      restDelta: 1e-6,
      restSpeed: 1e-5,
    };
    return {
      settle: spring({ ...physics, keyframes: [1, 0] }),
      kick: spring({ ...physics, keyframes: [0, 0], velocity: 1 }),
    };
  });
}

export function AsciiMorph({
  shape,
  defaultShape = "globe",
  onShapeChange,
  duration = 1200,
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
  const artRef = useRef<SVGGElement>(null);
  const textRefs = useRef<(SVGTextElement | null)[]>([]);
  const selectionRef = useRef(current);
  const engineRef = useRef<{
    configure: (next: AsciiMorphShape, duration: number, interactive: boolean) => void;
  } | null>(null);
  const instructionsId = useId();
  const statusId = useId();

  useEffect(() => {
    const root = rootRef.current;
    const art = artRef.current;
    if (!root || !art) return;
    const particles: Particle[] = initialPoints.map((point) => ({ ...point, ox: 0, oy: 0, vx: 0, vy: 0 }));
    let target = initialPoints;
    let running = false;
    let fresh = true;
    let moving = false;
    let visible = true;
    let enabled = true;
    let settlingTime = 1200;
    let curves = springsFor(settlingTime);
    // Milliseconds since every glyph was last retargeted.
    let elapsed = 0;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Sample each spring once for the current time: settle and kick positions, then velocities.
    function sample() {
      return curves.map(({ settle, kick }) => [
        settle.next(elapsed).value,
        kick.next(elapsed).value,
        settle.velocity!(elapsed),
        kick.velocity!(elapsed),
      ]);
    }

    // Aim every glyph at new targets or springs from where it is now, keeping its velocity.
    function retarget(next: Point[], nextCurves: Curves) {
      const at = sample();
      particles.forEach((particle, i) => {
        const [, , settleX, kickX] = at[rateOf(i, "x")];
        const [, , settleY, kickY] = at[rateOf(i, "y")];
        Object.assign(particle, {
          vx: particle.ox * settleX + particle.vx * kickX,
          vy: particle.oy * settleY + particle.vy * kickY,
          ox: particle.x - next[i].x,
          oy: particle.y - next[i].y,
        });
      });
      target = next;
      curves = nextCurves;
      elapsed = 0;
    }

    function paint() {
      particles.forEach((particle, i) => {
        const element = textRefs.current[i];
        element?.setAttribute("x", particle.x.toFixed(3));
        element?.setAttribute("y", particle.y.toFixed(3));
      });
    }

    function stop() {
      if (running) cancelFrame(tick);
      running = false;
    }

    function start() {
      if (running) return;
      // A suspended tab resumes from the last painted state, so the first frame adds no time.
      fresh = true;
      frame.render(tick, true);
      running = true;
    }

    function snap() {
      particles.forEach((particle, i) => Object.assign(particle, target[i], { ox: 0, oy: 0, vx: 0, vy: 0 }));
      elapsed = 0;
      moving = false;
      root!.dataset.state = "idle";
      paint();
    }

    // Runs in Motion's render step, after any other Motion animations update this frame.
    function tick({ delta }: FrameData) {
      // A long frame advances at most 32ms, avoiding a visible leap after a main-thread stall.
      elapsed += fresh ? 0 : Math.min(delta, 32);
      fresh = false;
      const at = sample();
      let unsettled = false;
      particles.forEach((particle, i) => {
        const [settleX, kickX, speedX, speedKickX] = at[rateOf(i, "x")];
        const [settleY, kickY, speedY, speedKickY] = at[rateOf(i, "y")];
        particle.x = target[i].x + particle.ox * settleX + particle.vx * kickX;
        particle.y = target[i].y + particle.oy * settleY + particle.vy * kickY;
        if (
          !unsettled &&
          (Math.abs(particle.x - target[i].x) > 0.025 ||
            Math.abs(particle.y - target[i].y) > 0.025 ||
            Math.abs(particle.ox * speedX + particle.vx * speedKickX) > 0.1 ||
            Math.abs(particle.oy * speedY + particle.vy * speedKickY) > 0.1)
        ) {
          unsettled = true;
        }
      });
      if (!unsettled) {
        stop();
        snap();
        return;
      }
      paint();
    }

    // Under reduced motion a new shape cross-fades in place: the glyphs fade out, swap to the
    // new shape unseen, and fade back in, instead of travelling or cutting in a single frame.
    let fade: ReturnType<typeof animate> | null = null;
    let swapping = false;
    let disposed = false;
    function crossFade() {
      // A shape picked during the fade-out is swapped in at its midpoint.
      if (swapping) return;
      swapping = true;
      fade?.stop();
      fade = animate(
        art!,
        { opacity: 0 },
        {
          duration: 0.1,
          ease: "easeIn",
          onComplete() {
            swapping = false;
            if (disposed) return;
            // If reduced motion was turned off meanwhile, the spring morph carries on instead.
            if (media.matches) snap();
            fade = animate(art!, { opacity: 1 }, { duration: 0.1, ease: "easeOut" });
          },
        },
      );
    }

    function sync() {
      root!.dataset.motion = media.matches ? "reduced" : enabled ? "enabled" : "static";
      if (media.matches && enabled && moving) {
        stop();
        crossFade();
      } else if (media.matches || !enabled) {
        // Static previews and an unchanged shape need no fade.
        stop();
        snap();
      } else if (!visible || document.hidden) {
        stop();
      } else if (moving) {
        start();
      }
    }

    engineRef.current = {
      configure(next, milliseconds, isInteractive) {
        const time = Number.isFinite(milliseconds) ? Math.min(4000, Math.max(400, milliseconds)) : 1200;
        enabled = isInteractive;
        // Retargeting changes only the destination or the springs; position and velocity
        // survive repeated clicks and duration changes mid-flight.
        if (time !== settlingTime) {
          settlingTime = time;
          retarget(target, springsFor(time));
        }
        if (target !== shapes[next]) {
          retarget(shapes[next], curves);
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
      disposed = true;
      fade?.stop();
      art.style.opacity = "";
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
      className={clsx("group/ascii-morph text-foreground relative isolate w-full", className)}
      style={style}
    >
      {/* Pressing the stage gives way at once; the morph itself starts on release. */}
      <svg
        data-slot="ascii-morph-art"
        viewBox="0 0 480 400"
        aria-hidden="true"
        className="pointer-events-none block size-full transition-[scale,opacity] duration-150 ease-out select-none motion-safe:group-has-[>button:active]/ascii-morph:scale-[0.97] motion-reduce:transition-none motion-reduce:group-has-[>button:active]/ascii-morph:opacity-70"
        style={{ aspectRatio: "6 / 5" }}
      >
        <g
          ref={artRef}
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
