"use client";

import { clsx } from "clsx";
import { cancelFrame, frame, spring, type FrameData, type KeyframeGenerator } from "motion";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

export type AsciiLensProps = {
  src: string;
  alt: string;
  /** Character spacing in CSS pixels, clamped to 6–24. */
  cellSize?: number;
  /** Lens radius in CSS pixels, clamped to 32–240. */
  radius?: number;
  /** Printable characters ordered from light to dark. */
  characters?: string;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
};

type Cell = { x: number; y: number; glyph: string; opacity: number; angle: number; scatter: number };
type Rest = { restDelta: number; restSpeed: number };
// A value that follows a target with a Motion spring, advanced by the lens's own frame callback
// so scrolling offscreen or hiding the tab freezes it exactly where it was.
type Follower = {
  value: number;
  target: number;
  elapsed: number;
  done: boolean;
  rest: Rest;
  generator: KeyframeGenerator<number>;
};
type Controls = {
  move: (clientX: number, clientY: number) => void;
  key: (key: string) => void;
  leave: () => void;
};

const defaultCharacters = ".:-=+*#%@";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
// Critically damped with a response of about 0.3 seconds (2π / √400), so the lens opens, closes
// and catches up briskly and settles without overshoot. Stiffness and damping, not a duration,
// because Motion's duration-based springs drop the velocity a retarget hands them.
// 400 and 40 keep the damping ratio at exactly 1.
const lensSpring = { stiffness: 400, damping: 40, mass: 1 };
// Where a spring counts as settled: a twentieth of a pixel for the lens position, and a
// two-thousandth of the way for its opening.
const pixels: Rest = { restDelta: 0.05, restSpeed: 0.5 };
const fraction: Rest = { restDelta: 0.0005, restSpeed: 0.005 };

function follower(value: number, rest: Rest): Follower {
  return {
    value,
    target: value,
    elapsed: 0,
    done: true,
    rest,
    generator: spring({ ...lensSpring, ...rest, keyframes: [value, value] }),
  };
}
function advance(follow: Follower, milliseconds: number) {
  if (follow.done) return;
  follow.elapsed += milliseconds;
  const state = follow.generator.next(follow.elapsed);
  follow.value = state.value;
  follow.done = state.done;
}
function springTo(follow: Follower, target: number, from = follow.value) {
  if (target === follow.target && from === follow.value) return;
  // Retargeting from the on-screen value with the current velocity keeps every change of
  // direction smooth.
  const velocity = follow.done ? 0 : (follow.generator.velocity?.(follow.elapsed) ?? 0);
  follow.generator = spring({ ...lensSpring, ...follow.rest, keyframes: [from, target], velocity });
  const state = follow.generator.next(0);
  Object.assign(follow, { value: state.value, target, elapsed: 0, done: state.done });
}
function jump(follow: Follower, value: number) {
  Object.assign(follow, { value, target: value, done: true });
}

function cover(image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  return {
    x: (width - imageWidth) / 2,
    y: (height - imageHeight) / 2,
    width: imageWidth,
    height: imageHeight,
  };
}

/** An image sampled into ASCII, with a circular view of the original under the pointer. */
export function AsciiLens({
  src,
  alt,
  cellSize = 10,
  radius = 92,
  characters = defaultCharacters,
  interactive = true,
  className,
  style,
}: AsciiLensProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const [result, setResult] = useState<{ src: string; status: "ready" | "failed" | "unsupported" }>();
  const instructionsId = useId();
  const spacing = clamp(finite(cellSize, 10), 6, 24);
  const lensRadius = clamp(finite(radius, 92), 32, 240);
  const glyphs = characters.replace(/[^\x21-\x7e]/g, "").slice(0, 32) || defaultCharacters;
  const ready = result?.src === src && result.status === "ready";
  const failed = result?.src === src && result.status === "failed";
  const unsupported = result?.src === src && result.status === "unsupported";

  useEffect(() => {
    const root = rootRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!root || !image || !canvas || !context) return;
    const samplingImage = new Image();

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let cells: Cell[] = [];
    let color = "";
    let font = "monospace";
    let running = false;
    let visible = true;
    let loaded = false;
    let sampleLoaded = false;
    let imageFailed = false;
    // Where the lens rests, and whether the pointer is carrying it. The followers hold how far
    // the drawn lens still is from that point, and how far open it is from 0 to 1.
    const lens = { x: 0, y: 0, tracking: false };
    const offsetX = follower(0, pixels);
    const offsetY = follower(0, pixels);
    const opening = follower(0, fraction);

    // Reduced motion keeps the lens from growing or gliding: it cross-fades in place at full size.
    const still = () => motion.matches;
    const atRest = () => offsetX.done && offsetY.done && opening.done;
    const canAnimate = () => visible && !document.hidden && loaded && width > 0 && height > 0;
    const canInteract = () => interactive && visible && !document.hidden && !root.closest("[inert]");

    function draw() {
      if (!context || !canvas || !loaded || !width || !height) return;
      context.clearRect(0, 0, width, height);
      context.font = `${spacing * 0.94}px ${font}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      const reduced = still();
      const open = clamp(opening.value, 0, 1);
      const radius = reduced ? (open > 0 ? lensRadius : 0) : lensRadius * open;
      const reveal = reduced ? open : 1;
      const x = lens.x + offsetX.value;
      const y = lens.y + offsetY.value;
      const scatterWidth = spacing * 2.8;
      const write = (cell: Cell, scatter: number) =>
        context.fillText(
          cell.glyph,
          cell.x + Math.cos(cell.angle) * cell.scatter * scatter * spacing * 2.3,
          cell.y + Math.sin(cell.angle) * cell.scatter * scatter * spacing * 2.3,
        );

      for (const cell of cells) {
        const distance = Math.hypot(cell.x - x, cell.y - y);
        // Glyphs under the opaque photograph are never seen. While it fades in they still are.
        if (reveal === 1 && radius > 0 && distance < radius - spacing * 0.6) continue;
        // 1 on the rim of the lens, falling to 0 at the edges of the band of loose glyphs.
        const rim = radius > 0 ? Math.max(0, 1 - Math.abs(distance - radius) / scatterWidth) : 0;
        const scatter = reduced ? 0 : rim * open;
        // The band dims as the lens opens, so it neither pops in nor out.
        context.globalAlpha = cell.opacity * (rim > 0 ? 1 - (open - scatter) * 0.35 : 1);
        write(cell, scatter);
      }
      context.globalAlpha = 1;

      if (radius > 0) {
        const crop = cover(samplingImage, width, height);
        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.clip();
        context.globalAlpha = reveal;
        context.drawImage(samplingImage, crop.x, crop.y, crop.width, crop.height);
        context.restore();
        context.globalAlpha = 1;
        // Repaint scattered rim glyphs over the photograph so they read as loose type.
        if (!reduced) {
          context.fillStyle = color;
          for (const cell of cells) {
            const distance = Math.hypot(cell.x - x, cell.y - y);
            const edge = Math.abs(distance - radius);
            if (edge > scatterWidth || distance >= radius) continue;
            const scatter = (1 - edge / scatterWidth) * open;
            context.globalAlpha = cell.opacity * scatter * 0.85;
            write(cell, scatter);
          }
          context.globalAlpha = 1;
        }
      }
    }

    // Runs in Motion's render step, after any other Motion animations update this frame.
    function tick({ delta }: FrameData) {
      running = false;
      if (!canAnimate()) return;
      // Motion's generators are analytic, so the response is the same at any refresh rate, and
      // Motion clamps long gaps between frames, so a stalled tab cannot fling the lens forward.
      advance(offsetX, delta);
      advance(offsetY, delta);
      advance(opening, delta);
      draw();
      // Only a lens that is still moving asks for another frame, so one at rest costs nothing.
      if (!atRest()) request();
    }

    function stop() {
      if (running) cancelFrame(tick);
      running = false;
    }

    // Draws on Motion's next frame. Input calls this too, so a pointer move paints once.
    function request() {
      if (running || !canAnimate()) return;
      frame.render(tick);
      running = true;
    }

    function sync() {
      stop();
      draw();
      if (!atRest()) request();
    }

    function onMotion() {
      if (still()) {
        // Land a lens in flight, so the reduced view starts from where it was heading.
        jump(offsetX, 0);
        jump(offsetY, 0);
        jump(opening, opening.target);
      }
      sync();
    }

    // Moves the point the lens rests at. A lens on screen springs there from where it is drawn
    // now, keeping its velocity. A closed one, or any lens under reduced motion, is simply there.
    function aim(x: number, y: number) {
      const fromX = lens.x + offsetX.value - x;
      const fromY = lens.y + offsetY.value - y;
      lens.x = x;
      lens.y = y;
      if (still() || opening.value < 0.001) {
        jump(offsetX, 0);
        jump(offsetY, 0);
      } else {
        springTo(offsetX, 0, fromX);
        springTo(offsetY, 0, fromY);
      }
    }

    function sample() {
      if (!canvas || !context || !root || !sampleLoaded || !width || !height) return;
      const columns = clamp(Math.floor(width / spacing), 1, 140);
      const rows = clamp(Math.floor(height / (spacing * 1.2)), 1, 100);
      const source = document.createElement("canvas");
      source.width = columns;
      source.height = rows;
      const sourceContext = source.getContext("2d", { willReadFrequently: true });
      if (!sourceContext) {
        setResult({ src, status: "unsupported" });
        return;
      }
      let pixels: Uint8ClampedArray;
      try {
        const crop = cover(samplingImage, columns, rows);
        sourceContext.drawImage(samplingImage, crop.x, crop.y, crop.width, crop.height);
        pixels = sourceContext.getImageData(0, 0, columns, rows).data;
      } catch {
        // Keep the visible image if the browser cannot decode or sample this source.
        loaded = false;
        setResult({ src, status: "unsupported" });
        return;
      }
      cells = [];
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = (row * columns + column) * 4;
          const brightness =
            (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) / 255;
          const darkness = 1 - brightness;
          const noise = ((column * 73 + row * 193) % 101) / 101;
          cells.push({
            x: ((column + 0.5) * width) / columns,
            y: ((row + 0.5) * height) / rows,
            glyph: glyphs[Math.min(glyphs.length - 1, Math.floor(darkness * glyphs.length))],
            opacity: 0.22 + darkness * 0.72,
            angle: noise * Math.PI * 2,
            scatter: 0.35 + ((column * 17 + row * 29) % 11) / 11,
          });
        }
      }
      loaded = true;
      setResult({ src, status: "ready" });
      // Input that arrived while the image was loading opens the lens now.
      sync();
    }

    function resize() {
      if (!root || !canvas || !context) return;
      width = root.clientWidth;
      height = root.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2, 2400 / Math.max(width, height));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const computed = getComputedStyle(root);
      color = computed.color;
      font = computed.fontFamily;
      sample();
    }

    function onSampleLoad() {
      if (sampleLoaded) return;
      sampleLoaded = true;
      resize();
    }
    function onSampleError() {
      sampleLoaded = false;
      loaded = false;
      if (!imageFailed) setResult({ src, status: "unsupported" });
    }
    function onImageError() {
      imageFailed = true;
      loaded = false;
      setResult({ src, status: "failed" });
    }

    controlsRef.current = {
      move(clientX, clientY) {
        if (!canInteract()) return;
        const bounds = root.getBoundingClientRect();
        if (!bounds.width || !bounds.height || !width || !height) return;
        const x = clamp(((clientX - bounds.left) * width) / bounds.width, 0, width);
        const y = clamp(((clientY - bounds.top) * height) / bounds.height, 0, height);
        // The lens stays under the pointer 1:1. A pointer that arrives while the lens is open
        // somewhere else pulls it over on the spring, and keeps carrying it while it catches up.
        if (lens.tracking) {
          lens.x = x;
          lens.y = y;
        } else {
          aim(x, y);
        }
        lens.tracking = true;
        springTo(opening, 1);
        request();
      },
      key(key) {
        if (!canInteract()) return;
        lens.tracking = false;
        if (key === "Escape") {
          springTo(opening, 0);
        } else {
          // A lens that is closed or closing reopens from the centre.
          let { x, y } = opening.target ? lens : { x: width / 2, y: height / 2 };
          if (key === "Home") {
            x = width / 2;
            y = height / 2;
          }
          if (key === "ArrowLeft") x = clamp(x - spacing * 3, 0, width);
          if (key === "ArrowRight") x = clamp(x + spacing * 3, 0, width);
          if (key === "ArrowUp") y = clamp(y - spacing * 3, 0, height);
          if (key === "ArrowDown") y = clamp(y + spacing * 3, 0, height);
          aim(x, y);
          springTo(opening, 1);
        }
        request();
      },
      leave() {
        lens.tracking = false;
        springTo(opening, 0);
        request();
      },
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const themeObserver = new MutationObserver(resize);
    for (let ancestor: HTMLElement | null = root; ancestor; ancestor = ancestor.parentElement) {
      themeObserver.observe(ancestor, { attributes: true, attributeFilter: ["class", "style", "inert"] });
    }
    image.addEventListener("error", onImageError);
    samplingImage.addEventListener("load", onSampleLoad);
    samplingImage.addEventListener("error", onSampleError);
    resizeObserver.observe(root);
    intersectionObserver.observe(root);
    motion.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", sync);
    document.fonts?.addEventListener("loadingdone", resize);
    // Set crossOrigin before src so the request uses CORS mode from the start.
    samplingImage.crossOrigin = "anonymous";
    samplingImage.src = src;
    resize();
    if (samplingImage.complete && samplingImage.naturalWidth) onSampleLoad();
    if (image.complete && !image.naturalWidth) onImageError();

    return () => {
      stop();
      controlsRef.current = null;
      image.removeEventListener("error", onImageError);
      samplingImage.removeEventListener("load", onSampleLoad);
      samplingImage.removeEventListener("error", onSampleError);
      samplingImage.removeAttribute("src");
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", sync);
      document.fonts?.removeEventListener("loadingdone", resize);
      canvas.width = canvas.height = 0;
    };
  }, [src, spacing, lensRadius, glyphs, interactive]);

  return (
    <div
      ref={rootRef}
      data-slot="ascii-lens"
      data-state={failed ? "failed" : unsupported ? "unsupported" : ready ? "ready" : "image"}
      role={interactive ? "group" : "img"}
      aria-label={alt}
      className={clsx(
        "bg-background text-foreground relative aspect-[4/3] w-full overflow-hidden font-mono",
        className,
      )}
      style={style}
    >
      {/* The image stays available as a fallback if loading or canvas sampling fails. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={clsx("absolute inset-0 size-full object-cover", ready && "opacity-0")}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={clsx("pointer-events-none absolute inset-0 size-full", !ready && "invisible")}
      />
      {failed ? (
        <span className="bg-background/90 text-foreground absolute inset-x-0 bottom-0 p-3">
          Image unavailable
        </span>
      ) : null}
      {interactive && !failed && !unsupported ? (
        <>
          <button
            type="button"
            aria-label={`Explore ${alt} with lens`}
            aria-describedby={instructionsId}
            className="focus-visible:outline-ring absolute inset-0 size-full cursor-crosshair touch-pan-y border-0 bg-transparent p-0 focus-visible:-outline-offset-4"
            onPointerMove={(event) => {
              if (event.isPrimary) controlsRef.current?.move(event.clientX, event.clientY);
            }}
            onPointerDown={(event) => {
              // A finger has no hover, so the lens opens under it the moment it lands.
              if (event.isPrimary) controlsRef.current?.move(event.clientX, event.clientY);
            }}
            onPointerLeave={() => controlsRef.current?.leave()}
            onPointerCancel={() => controlsRef.current?.leave()}
            onBlur={() => controlsRef.current?.leave()}
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Escape"].includes(event.key)) {
                event.preventDefault();
                controlsRef.current?.key(event.key);
              }
            }}
          />
          <span id={instructionsId} className="sr-only">
            Move the pointer or use arrow keys to explore the original image. Home centers the lens. Escape
            closes it.
          </span>
        </>
      ) : null}
    </div>
  );
}
