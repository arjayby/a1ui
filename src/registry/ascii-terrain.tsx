"use client";

import { clsx } from "clsx";
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
    let frame = 0;
    let lastFrame = 0;
    let width = 0;
    let viewHeight = 0;
    let color = "";
    let fontFamily = "monospace";
    let points: Point[] = [];
    let ripples: Ripple[] = [];
    const pointer = {
      x: 0,
      z: 0,
      targetX: 0,
      targetZ: 0,
      velocityX: 0,
      velocityZ: 0,
      strength: 0,
      active: false,
    };

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
        const distance = Math.hypot(x - pointer.x, z - pointer.z);
        level += Math.exp(-distance * distance * 10) * pointer.strength * 0.65;
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

    function tick(now: number) {
      frame = 0;
      if (!canAnimate()) return;
      const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0;
      lastFrame = now;
      timeRef.current += delta;
      // A critically damped spring carries momentum through pointer changes.
      // The exact solution keeps the response the same at different refresh rates.
      const decay = Math.exp(-8 * delta);
      const offsetX = pointer.x - pointer.targetX;
      const offsetZ = pointer.z - pointer.targetZ;
      const springX = pointer.velocityX + 8 * offsetX;
      const springZ = pointer.velocityZ + 8 * offsetZ;
      pointer.x = pointer.targetX + (offsetX + springX * delta) * decay;
      pointer.z = pointer.targetZ + (offsetZ + springZ * delta) * decay;
      pointer.velocityX = (pointer.velocityX - springX * 8 * delta) * decay;
      pointer.velocityZ = (pointer.velocityZ - springZ * 8 * delta) * decay;
      pointer.strength += ((pointer.active ? 1 : 0) - pointer.strength) * (1 - Math.exp(-delta * 8));
      ripples = ripples.filter(
        (ripple) =>
          timeRef.current - ripple.started < 4 &&
          (ripple.released === undefined || timeRef.current - ripple.released < 0.24),
      );
      draw();
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      if (motion.matches) {
        pointer.strength = 0;
        pointer.active = false;
        ripples = [];
      }
      root!.dataset.motion = motion.matches ? "reduced" : pausedRef.current ? "paused" : "running";
      draw();
      if (canAnimate()) frame = requestAnimationFrame(tick);
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
          pointer.targetX = nearest.x;
          pointer.targetZ = nearest.z;
          if (pointer.strength < 0.001) {
            pointer.x = pointer.targetX;
            pointer.z = pointer.targetZ;
            pointer.velocityX = pointer.velocityZ = 0;
          }
          pointer.active = true;
        }
      },
      leave() {
        pointer.active = false;
      },
      key(key) {
        if (!interactive || !canMove()) return;
        if (key === "Escape") {
          pointer.active = false;
          return;
        }
        pointer.active = true;
        if (key === "Home") {
          pointer.targetX = 0;
          pointer.targetZ = 0;
        }
        if (key === "ArrowLeft") pointer.targetX = clamp(pointer.targetX - 0.12, -0.9, 0.9);
        if (key === "ArrowRight") pointer.targetX = clamp(pointer.targetX + 0.12, -0.9, 0.9);
        if (key === "ArrowUp") pointer.targetZ = clamp(pointer.targetZ - 0.12, -0.9, 0.9);
        if (key === "ArrowDown") pointer.targetZ = clamp(pointer.targetZ + 0.12, -0.9, 0.9);
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
      if (frame) cancelAnimationFrame(frame);
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
