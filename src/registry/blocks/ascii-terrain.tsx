"use client";

import { clsx } from "clsx";
import { cancelFrame, frame, keyframes, spring, type FrameData, type KeyframeGenerator } from "motion";
import { useEffect, useId, useRef, type CSSProperties } from "react";

export type AsciiTerrainProps = {
  cellSize?: number;
  amplitude?: number;
  speed?: number;
  seed?: number;
  characters?: string;
  paused?: boolean;
  interactive?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

type Point = { x: number; z: number; screenX: number; screenY: number; baseY: number };
type Ripple = { x: number; z: number; started: number; released?: number };
// A value that follows a target with a Motion generator, advanced on the terrain's own clock
// so pausing, scrolling offscreen, or hiding the tab freezes it exactly where it was.
type Follower = { value: number; target: number; elapsed: number; generator: KeyframeGenerator<number> };
type Controls = {
  sync: () => void;
  move: (x: number, y: number) => void;
  leave: () => void;
  key: (key: string) => void;
  ripple: () => void;
};

const ramp = ".:-=+*#%@";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
const smoothstep = (value: number) => {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
};
// Critically damped, so the hill glides to the pointer and carries momentum without overshoot.
const hoverSpring = { stiffness: 64, damping: 16, mass: 1, restDelta: 0.0001, restSpeed: 0.001 };
// The hill rises and settles with an exponential ease, normalized to finish in 750ms.
const strengthDuration = 750;
const settle = (progress: number) => (1 - Math.exp(-6 * progress)) / (1 - Math.exp(-6));

function follower(value: number, generator: KeyframeGenerator<number>): Follower {
  return { value, target: value, elapsed: 0, generator };
}
function advance(follow: Follower, milliseconds: number) {
  follow.elapsed += milliseconds;
  follow.value = follow.generator.next(follow.elapsed).value;
}
function springTo(follow: Follower, target: number) {
  if (target === follow.target) return;
  // Retargeting keeps the current velocity so a moving hill curves toward its new spot.
  const velocity = follow.generator.velocity?.(follow.elapsed) ?? 0;
  follow.generator = spring({ ...hoverSpring, keyframes: [follow.value, target], velocity });
  follow.target = target;
  follow.elapsed = 0;
}
function springJump(follow: Follower, value: number) {
  follow.generator = spring({ ...hoverSpring, keyframes: [value, value] });
  follow.value = follow.target = value;
  follow.elapsed = 0;
}
function settleTo(follow: Follower, target: number) {
  if (target === follow.target) return;
  follow.generator = keyframes({
    keyframes: [follow.value, target],
    duration: strengthDuration,
    ease: settle,
  });
  follow.target = target;
  follow.elapsed = 0;
}

export function AsciiTerrain({
  cellSize = 10,
  amplitude = 1,
  speed = 1,
  seed = 7,
  characters = ramp,
  paused = false,
  interactive = true,
  ariaLabel = "ASCII terrain with rolling hills",
  className,
  style,
}: AsciiTerrainProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const pausedRef = useRef(paused);
  const timeRef = useRef(0);
  const instructionsId = useId();
  const spacing = clamp(finite(cellSize, 10), 6, 24);
  const height = clamp(finite(amplitude, 1), 0, 2);
  const rate = clamp(finite(speed, 1), 0, 3);
  const phase = finite(seed, 7) % 1000;
  // Printable ASCII keeps every glyph one cell wide and excludes control characters.
  const glyphs = characters.replace(/[^\x21-\x7e]/g, "").slice(0, 32) || ramp;

  useEffect(() => {
    pausedRef.current = paused;
    controlsRef.current?.sync();
  }, [paused]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!root || !canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let running = false;
    let width = 0;
    let viewHeight = 0;
    let color = "";
    let fontFamily = "monospace";
    let points: Point[] = [];
    let ripples: Ripple[] = [];
    const pointer = {
      x: follower(0, spring({ ...hoverSpring, keyframes: [0, 0] })),
      z: follower(0, spring({ ...hoverSpring, keyframes: [0, 0] })),
      strength: follower(0, keyframes({ keyframes: [0, 0], duration: strengthDuration })),
      targetX: 0,
      targetZ: 0,
    };
    const aim = (x: number, z: number) => {
      pointer.targetX = x;
      pointer.targetZ = z;
      springTo(pointer.x, x);
      springTo(pointer.z, z);
    };
    const activate = (active: boolean) => settleTo(pointer.strength, active ? 1 : 0);

    const canMove = () => !pausedRef.current && !motion.matches && !root.closest("[inert]");
    const canAnimate = () => visible && !document.hidden && canMove() && width > 0 && viewHeight > 0;

    function draw() {
      if (!context || !canvas) return;
      context.clearRect(0, 0, width, viewHeight);
      context.font = `${spacing * 0.9}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      const time = timeRef.current;
      const drift = time * rate * 0.16;
      const waves = ripples.map((ripple) => {
        const age = time - ripple.started;
        const release = ripple.released === undefined ? 1 : 1 - smoothstep((time - ripple.released) / 0.24);
        return {
          x: ripple.x,
          z: ripple.z,
          radius: age * 0.85,
          strength: smoothstep(age / 0.24) * Math.exp(-age * 1.2) * release * 0.3,
        };
      });

      for (const point of points) {
        const { x, z } = point;
        const wave =
          Math.sin(x * 3.3 + z * 1.8 + drift + phase) * 0.26 +
          Math.cos(z * 4.2 - x * 1.3 - drift * 0.7 + phase * 0.7) * 0.2 +
          Math.sin(x * 7.5 + z * 6.2 + drift * 0.5) * 0.07;
        let level = (0.42 + wave) * height;
        const depth = (z + 1) / 2;
        // Pick against the base landscape so a raised hill cannot move its own target.
        point.baseY = viewHeight * (0.28 + depth * 0.56 - level * 0.25);
        const distance = Math.hypot(x - pointer.x.value, z - pointer.z.value);
        level += Math.exp(-distance * distance * 10) * pointer.strength.value * 0.65;
        for (const wave of waves) {
          const front = Math.hypot(x - wave.x, z - wave.z) - wave.radius;
          level += Math.cos(front * 13) * Math.exp(-front * front * 5) * wave.strength;
        }

        point.screenX = width / 2 + x * width * 0.43 * (0.62 + depth * 0.38);
        point.screenY = viewHeight * (0.28 + depth * 0.56 - level * 0.25);
        const shade = clamp((level + 0.12) / 1.15, 0, 1);
        const edge = Math.min(1, (1 - Math.abs(x)) * 8, (1 - Math.abs(z)) * 8);
        context.globalAlpha = (0.24 + shade * 0.7) * (0.45 + depth * 0.55) * edge;
        context.fillText(glyphs[Math.round(shade * (glyphs.length - 1))], point.screenX, point.screenY);
      }
      context.globalAlpha = 1;
      canvas.dataset.ready = "true";
    }

    // Runs in Motion's render step, after any other Motion animations update this frame.
    function tick({ delta }: FrameData) {
      if (!canAnimate()) return stop();
      // Motion clamps long gaps between frames, so a stalled tab cannot fling the terrain forward.
      timeRef.current += delta / 1000;
      // Motion's generators are analytic, so the response is the same at any refresh rate.
      advance(pointer.x, delta);
      advance(pointer.z, delta);
      advance(pointer.strength, delta);
      ripples = ripples.filter(
        (ripple) =>
          timeRef.current - ripple.started < 4 &&
          (ripple.released === undefined || timeRef.current - ripple.released < 0.24),
      );
      draw();
    }

    function stop() {
      if (running) cancelFrame(tick);
      running = false;
    }

    function sync() {
      stop();
      if (motion.matches) {
        pointer.strength = follower(0, keyframes({ keyframes: [0, 0], duration: strengthDuration }));
        ripples = [];
      }
      root!.dataset.motion = motion.matches ? "reduced" : pausedRef.current ? "paused" : "running";
      draw();
      if (canAnimate()) {
        frame.render(tick, true);
        running = true;
      }
    }

    function resize() {
      if (!canvas || !root || !context) return;
      width = root.clientWidth;
      viewHeight = root.clientHeight;
      // Bound both the backing store and sample count for large hero sections.
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 2400 / Math.max(width, viewHeight, 1));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(viewHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const columns = clamp(Math.floor(width / spacing), 24, 120);
      const rows = clamp(Math.floor(viewHeight / (spacing * 0.75)), 18, 64);
      points = [];
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          points.push({
            x: (column / (columns - 1)) * 2 - 1,
            z: (row / (rows - 1)) * 2 - 1,
            screenX: 0,
            screenY: 0,
            baseY: 0,
          });
        }
      }
      sync();
    }

    function appearance() {
      const computed = getComputedStyle(root!);
      color = computed.color;
      fontFamily = computed.fontFamily;
      sync();
    }

    controlsRef.current = {
      sync,
      move(clientX, clientY) {
        if (!interactive || !canMove()) return;
        const bounds = root.getBoundingClientRect();
        const x = (clientX - bounds.left) * (width / bounds.width);
        const y = (clientY - bounds.top) * (viewHeight / bounds.height);
        let nearest: Point | undefined;
        let distance = Infinity;
        for (const point of points) {
          const next = (point.screenX - x) ** 2 + (point.baseY - y) ** 2;
          if (next < distance) {
            nearest = point;
            distance = next;
          }
        }
        if (nearest) {
          if (pointer.strength.value < 0.001) {
            // A hill rising from flat ground appears under the pointer instead of sliding in.
            springJump(pointer.x, nearest.x);
            springJump(pointer.z, nearest.z);
          }
          aim(nearest.x, nearest.z);
          activate(true);
        }
      },
      leave() {
        activate(false);
      },
      key(key) {
        if (!interactive || !canMove()) return;
        if (key === "Escape") {
          activate(false);
          return;
        }
        activate(true);
        let { targetX: x, targetZ: z } = pointer;
        if (key === "Home") x = z = 0;
        if (key === "ArrowLeft") x = clamp(x - 0.12, -0.9, 0.9);
        if (key === "ArrowRight") x = clamp(x + 0.12, -0.9, 0.9);
        if (key === "ArrowUp") z = clamp(z - 0.12, -0.9, 0.9);
        if (key === "ArrowDown") z = clamp(z + 0.12, -0.9, 0.9);
        aim(x, z);
      },
      ripple() {
        if (!interactive || !canMove()) return;
        const active = ripples.filter((ripple) => ripple.released === undefined);
        if (active.length >= 6) active[0].released = timeRef.current;
        // Fade retiring waves instead of removing a visible wave on the seventh click.
        ripples = [
          ...ripples.slice(-23),
          { x: pointer.targetX, z: pointer.targetZ, started: timeRef.current },
        ];
      },
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const themeObserver = new MutationObserver(appearance);
    for (let ancestor: HTMLElement | null = root; ancestor; ancestor = ancestor.parentElement) {
      themeObserver.observe(ancestor, { attributes: true, attributeFilter: ["class", "style", "inert"] });
    }
    appearance();
    resize();
    resizeObserver.observe(root);
    intersectionObserver.observe(root);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    document.fonts?.addEventListener("loadingdone", appearance);
    window.addEventListener("resize", resize);
    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      document.fonts?.removeEventListener("loadingdone", appearance);
      window.removeEventListener("resize", resize);
      controlsRef.current = null;
      canvas.width = canvas.height = 0;
      delete canvas.dataset.ready;
    };
  }, [spacing, height, rate, phase, glyphs, interactive]);

  return (
    <div
      ref={rootRef}
      data-slot="ascii-terrain"
      role={interactive ? "group" : "img"}
      aria-label={ariaLabel}
      className={clsx("text-foreground relative h-96 w-full overflow-hidden font-mono", className)}
      style={style}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      {interactive ? (
        <>
          <button
            type="button"
            aria-label="Interact with terrain"
            aria-describedby={instructionsId}
            className="focus-visible:outline-ring absolute inset-0 size-full cursor-crosshair touch-pan-y border-0 bg-transparent p-0 focus-visible:-outline-offset-4"
            onPointerMove={(event) => {
              if (event.isPrimary) controlsRef.current?.move(event.clientX, event.clientY);
            }}
            onPointerLeave={() => controlsRef.current?.leave()}
            onPointerCancel={() => controlsRef.current?.leave()}
            onBlur={() => controlsRef.current?.leave()}
            onClick={(event) => {
              if (event.detail > 0) controlsRef.current?.move(event.clientX, event.clientY);
              controlsRef.current?.ripple();
            }}
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Escape"].includes(event.key)) {
                event.preventDefault();
                controlsRef.current?.key(event.key);
              }
            }}
          />
          <span id={instructionsId} className="sr-only">
            Move the pointer or use arrow keys to raise hills. Click, press Enter, or press Space to send a
            ripple. Home centers the hill. Escape releases it. Interactions stop while paused or when reduced
            motion is enabled.
          </span>
        </>
      ) : null}
    </div>
  );
}
