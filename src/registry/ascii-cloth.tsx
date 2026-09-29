"use client";

import { clsx } from "clsx";
import { useEffect, useId, useRef, type CSSProperties } from "react";

export type AsciiClothProps = {
  /** Printable ASCII woven into the center of the sheet. */
  word?: string;
  /** Approximate character spacing in pixels, clamped to 10–24. */
  cellSize?: number;
  /** Enables pointer and keyboard dragging. */
  interactive?: boolean;
  /** Freezes the current cloth position and disables dragging. */
  paused?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

type Particle = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  restX: number;
  restY: number;
  glyph: string;
  woven: boolean;
  pinned: boolean;
};

type Link = { a: number; b: number; length: number };
type Controls = {
  sync: () => void;
  grab: (x: number, y: number) => boolean;
  move: (x: number, y: number) => void;
  release: () => void;
  key: (key: string) => void;
};

const ramp = ".:+#@";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

function glyphFor(row: number, column: number) {
  // A stable pattern keeps the fabric from flickering as it moves.
  const noise = (row * 73 + column * 149 + row * column * 17) % 23;
  return ramp[Math.min(ramp.length - 1, Math.floor(noise / 5))];
}

export function AsciiCloth({
  word = "A1 UI",
  cellSize = 15,
  interactive = true,
  paused = false,
  ariaLabel = "ASCII cloth hanging from two corners",
  className,
  style,
}: AsciiClothProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const pausedRef = useRef(paused);
  const instructionsId = useId();
  const spacing = clamp(finite(cellSize, 15), 10, 24);
  const label = word.replace(/[^\x20-\x7e]/g, "").slice(0, 24);

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
    let height = 0;
    let particles: Particle[] = [];
    let links: Link[] = [];
    let held = -1;
    let targetX = 0;
    let targetY = 0;
    let keyboardX = 0;
    let keyboardY = 0;
    let color = "currentColor";
    let fontFamily = "monospace";
    let fontSize = spacing;
    let quietFrames = 0;

    const blocked = () => pausedRef.current || motion.matches || Boolean(root.closest("[inert]"));
    const canAnimate = () =>
      interactive && visible && !document.hidden && !blocked() && width > 0 && height > 0;

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      context.font = `${fontSize}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      for (const particle of particles) {
        context.globalAlpha = particle.woven ? 1 : particle.pinned ? 0.9 : 0.5;
        context.fillText(particle.glyph, particle.x, particle.y);
      }
      context.globalAlpha = 1;
      canvas!.dataset.ready = "true";
    }

    function pinCorners() {
      for (const particle of particles) {
        if (particle.pinned) {
          particle.x = particle.restX;
          particle.y = particle.restY;
          particle.previousX = particle.x;
          particle.previousY = particle.y;
        }
      }
    }

    function step(delta: number) {
      const gravity = 86 * delta * delta;
      let motionAmount = 0;
      for (let index = 0; index < particles.length; index++) {
        const particle = particles[index];
        if (particle.pinned || index === held) continue;
        const velocityX = (particle.x - particle.previousX) * 0.985;
        const velocityY = (particle.y - particle.previousY) * 0.985;
        particle.previousX = particle.x;
        particle.previousY = particle.y;
        particle.x += velocityX;
        particle.y += velocityY + gravity;
        motionAmount = Math.max(motionAmount, Math.abs(velocityX) + Math.abs(velocityY));
      }

      for (let iteration = 0; iteration < 5; iteration++) {
        if (held >= 0) {
          const particle = particles[held];
          particle.x = targetX;
          particle.y = targetY;
          particle.previousX = targetX;
          particle.previousY = targetY;
        }
        pinCorners();
        for (const link of links) {
          const a = particles[link.a];
          const b = particles[link.b];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const length = Math.hypot(dx, dy) || 1;
          const correction = (length - link.length) / length;
          const aFree = !a.pinned && link.a !== held;
          const bFree = !b.pinned && link.b !== held;
          const share = aFree && bFree ? 0.5 : 1;
          if (aFree) {
            a.x += dx * correction * share;
            a.y += dy * correction * share;
          }
          if (bFree) {
            b.x -= dx * correction * share;
            b.y -= dy * correction * share;
          }
        }
      }
      pinCorners();
      return motionAmount;
    }

    function tick(now: number) {
      frame = 0;
      if (!canAnimate()) return;
      const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.032) : 1 / 60;
      lastFrame = now;
      const velocity = step(delta);
      draw();
      quietFrames = held < 0 && velocity < 0.035 ? quietFrames + 1 : 0;
      if (quietFrames < 50) frame = requestAnimationFrame(tick);
    }

    function wake() {
      quietFrames = 0;
      if (canAnimate() && !frame) {
        lastFrame = 0;
        frame = requestAnimationFrame(tick);
      }
    }

    function reset() {
      held = -1;
      for (const particle of particles) {
        particle.x = particle.previousX = particle.restX;
        particle.y = particle.previousY = particle.restY;
      }
    }

    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      if (motion.matches) reset();
      if (blocked()) held = -1;
      root!.dataset.motion = motion.matches ? "reduced" : pausedRef.current ? "paused" : "running";
      draw();
      wake();
    }

    function resize() {
      width = root!.clientWidth;
      height = root!.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 2400 / Math.max(width, height, 1));
      canvas!.width = Math.round(width * ratio);
      canvas!.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      const columns = clamp(Math.floor((width * 0.84) / spacing), 18, 64);
      const rows = clamp(Math.floor((height * 0.58) / spacing), 10, 28);
      const left = width * 0.08;
      const span = width * 0.84;
      const top = height * 0.13;
      const depth = height * 0.57;
      fontSize = Math.min(spacing, (span / (columns - 1)) * 0.88);
      const woven = label.slice(0, Math.max(0, columns - 4));
      const wovenRow = Math.floor(rows * 0.49);
      const wovenStart = Math.floor((columns - woven.length) / 2);
      particles = [];
      links = [];
      for (let row = 0; row < rows; row++) {
        const v = row / (rows - 1);
        for (let column = 0; column < columns; column++) {
          const u = column / (columns - 1);
          const x = left + span * u;
          const y = top + depth * v + height * 0.065 * Math.sin(Math.PI * u) * (1 - v * 0.4);
          const textIndex = column - wovenStart;
          const isWoven =
            row === wovenRow && textIndex >= 0 && textIndex < woven.length && woven[textIndex] !== " ";
          particles.push({
            x,
            y,
            previousX: x,
            previousY: y,
            restX: x,
            restY: y,
            glyph: isWoven ? woven[textIndex] : glyphFor(row, column),
            woven: isWoven,
            pinned: row === 0 && (column === 0 || column === columns - 1),
          });
        }
      }
      const connect = (a: number, b: number) => {
        const first = particles[a];
        const second = particles[b];
        links.push({ a, b, length: Math.hypot(second.x - first.x, second.y - first.y) });
      };
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = row * columns + column;
          if (column + 1 < columns) connect(index, index + 1);
          if (row + 1 < rows) connect(index, index + columns);
          if (row + 1 < rows && column + 1 < columns) connect(index, index + columns + 1);
          if (row + 1 < rows && column > 0) connect(index, index + columns - 1);
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
      grab(clientX, clientY) {
        if (!interactive || blocked()) return false;
        const bounds = root!.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return false;
        const x = (clientX - bounds.left) * (width / bounds.width);
        const y = (clientY - bounds.top) * (height / bounds.height);
        let nearest = -1;
        let distance = (spacing * 2.5) ** 2;
        for (let index = 0; index < particles.length; index++) {
          if (particles[index].pinned) continue;
          const next = (particles[index].x - x) ** 2 + (particles[index].y - y) ** 2;
          if (next < distance) {
            nearest = index;
            distance = next;
          }
        }
        if (nearest < 0) return false;
        held = nearest;
        targetX = keyboardX = x;
        targetY = keyboardY = y;
        wake();
        return true;
      },
      move(clientX, clientY) {
        if (held < 0 || blocked()) return;
        const bounds = root!.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        targetX = clamp((clientX - bounds.left) * (width / bounds.width), 0, width);
        targetY = clamp((clientY - bounds.top) * (height / bounds.height), 0, height);
        wake();
      },
      release() {
        held = -1;
        wake();
      },
      key(key) {
        if (!interactive || blocked()) return;
        if (key === "Escape") {
          held = -1;
          wake();
          return;
        }
        if (key === "Enter" || key === " ") {
          if (held >= 0) {
            held = -1;
          } else {
            held = Math.floor(particles.length / 2);
            targetX = keyboardX = particles[held].x;
            targetY = keyboardY = particles[held].y;
          }
          wake();
          return;
        }
        if (held < 0) return;
        if (key === "ArrowLeft") keyboardX -= spacing;
        if (key === "ArrowRight") keyboardX += spacing;
        if (key === "ArrowUp") keyboardY -= spacing;
        if (key === "ArrowDown") keyboardY += spacing;
        targetX = keyboardX = clamp(keyboardX, 0, width);
        targetY = keyboardY = clamp(keyboardY, 0, height);
        wake();
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
    resize();
    appearance();
    resizeObserver.observe(root);
    intersectionObserver.observe(root);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    document.fonts?.addEventListener("loadingdone", appearance);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      document.fonts?.removeEventListener("loadingdone", appearance);
      controlsRef.current = null;
      canvas.width = canvas.height = 0;
      delete canvas.dataset.ready;
    };
  }, [spacing, label, interactive]);

  return (
    <div
      ref={rootRef}
      data-slot="ascii-cloth"
      role={interactive ? "group" : "img"}
      aria-label={
        ariaLabel === "ASCII cloth hanging from two corners" && label
          ? `${ariaLabel}, woven with ${label}`
          : ariaLabel
      }
      className={clsx("text-foreground relative h-96 w-full overflow-hidden font-mono", className)}
      style={style}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      {interactive ? (
        <>
          <button
            type="button"
            aria-label="Drag ASCII cloth"
            aria-describedby={instructionsId}
            className="focus-visible:outline-ring absolute inset-0 size-full cursor-grab touch-none border-0 bg-transparent p-0 focus-visible:-outline-offset-4 active:cursor-grabbing"
            onPointerDown={(event) => {
              if (event.isPrimary && controlsRef.current?.grab(event.clientX, event.clientY)) {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerMove={(event) => {
              if (event.isPrimary && event.currentTarget.hasPointerCapture(event.pointerId)) {
                controlsRef.current?.move(event.clientX, event.clientY);
              }
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              controlsRef.current?.release();
            }}
            onPointerCancel={() => controlsRef.current?.release()}
            onLostPointerCapture={() => controlsRef.current?.release()}
            onBlur={() => controlsRef.current?.release()}
            onKeyDown={(event) => {
              if (
                ["Enter", " ", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              ) {
                event.preventDefault();
                if (event.repeat && (event.key === "Enter" || event.key === " ")) return;
                controlsRef.current?.key(event.key);
              }
            }}
          />
          <span id={instructionsId} className="sr-only">
            Drag a character to stretch the cloth, then release it to settle. Press Enter or Space to grab or
            release the center. While grabbed, use arrow keys to pull the cloth. Escape releases it. Motion
            stops while paused or when reduced motion is enabled.
          </span>
        </>
      ) : null}
    </div>
  );
}
