"use client";

import { clsx } from "clsx";
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
type Controls = {
  move: (clientX: number, clientY: number) => void;
  key: (key: string) => void;
  leave: () => void;
};

const defaultCharacters = ".:-=+*#%@";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

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
    let frame = 0;
    let visible = true;
    let loaded = false;
    let sampleLoaded = false;
    let imageFailed = false;
    const lens = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, active: false };

    const canInteract = () => interactive && visible && !document.hidden && !root.closest("[inert]");
    const cancel = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    function draw() {
      if (!context || !canvas || !loaded || !width || !height) return;
      context.clearRect(0, 0, width, height);
      context.font = `${spacing * 0.94}px ${font}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      const activeRadius = lensRadius * lens.strength;
      const scatterWidth = spacing * 2.8;

      for (const cell of cells) {
        const distance = Math.hypot(cell.x - lens.x, cell.y - lens.y);
        if (activeRadius > 0 && distance < activeRadius - spacing * 0.6) continue;
        const rim = activeRadius > 0 && Math.abs(distance - activeRadius) < scatterWidth;
        const scatter =
          rim && !motion.matches ? (1 - Math.abs(distance - activeRadius) / scatterWidth) * lens.strength : 0;
        context.globalAlpha = cell.opacity * (rim ? 0.65 + scatter * 0.35 : 1);
        context.fillText(
          cell.glyph,
          cell.x + Math.cos(cell.angle) * cell.scatter * scatter * spacing * 2.3,
          cell.y + Math.sin(cell.angle) * cell.scatter * scatter * spacing * 2.3,
        );
      }
      context.globalAlpha = 1;

      if (activeRadius > 0) {
        const crop = cover(samplingImage, width, height);
        context.save();
        context.beginPath();
        context.arc(lens.x, lens.y, activeRadius, 0, Math.PI * 2);
        context.clip();
        context.drawImage(samplingImage, crop.x, crop.y, crop.width, crop.height);
        context.restore();
        // Repaint scattered rim glyphs over the photograph so they read as loose type.
        if (!motion.matches) {
          context.fillStyle = color;
          for (const cell of cells) {
            const distance = Math.hypot(cell.x - lens.x, cell.y - lens.y);
            const edge = Math.abs(distance - activeRadius);
            if (edge > scatterWidth || distance >= activeRadius) continue;
            const scatter = (1 - edge / scatterWidth) * lens.strength;
            context.globalAlpha = cell.opacity * scatter * 0.85;
            context.fillText(
              cell.glyph,
              cell.x + Math.cos(cell.angle) * cell.scatter * scatter * spacing * 2.3,
              cell.y + Math.sin(cell.angle) * cell.scatter * scatter * spacing * 2.3,
            );
          }
          context.globalAlpha = 1;
        }
      }
    }

    function tick() {
      frame = 0;
      if (!canInteract()) return;
      const easing = motion.matches ? 1 : 0.22;
      lens.x += (lens.targetX - lens.x) * easing;
      lens.y += (lens.targetY - lens.y) * easing;
      lens.strength += ((lens.active ? 1 : 0) - lens.strength) * easing;
      if (Math.abs(lens.strength) < 0.002 && !lens.active) lens.strength = 0;
      draw();
      if (
        Math.abs(lens.targetX - lens.x) > 0.25 ||
        Math.abs(lens.targetY - lens.y) > 0.25 ||
        (lens.active ? lens.strength < 0.998 : lens.strength > 0)
      )
        frame = requestAnimationFrame(tick);
    }

    function schedule() {
      if (frame) return;
      if (canInteract()) frame = requestAnimationFrame(tick);
      else draw();
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
      draw();
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
    function onVisibility() {
      if (document.hidden) cancel();
      else schedule();
    }
    function onMotion() {
      cancel();
      schedule();
    }

    controlsRef.current = {
      move(clientX, clientY) {
        if (!canInteract()) return;
        const bounds = root.getBoundingClientRect();
        if (!bounds.width || !bounds.height || !width || !height) return;
        lens.targetX = clamp(((clientX - bounds.left) * width) / bounds.width, 0, width);
        lens.targetY = clamp(((clientY - bounds.top) * height) / bounds.height, 0, height);
        if (!lens.active) {
          lens.x = lens.targetX;
          lens.y = lens.targetY;
        }
        lens.active = true;
        schedule();
      },
      key(key) {
        if (!canInteract()) return;
        if (key === "Escape") {
          lens.active = false;
        } else {
          if (!lens.active) {
            lens.x = lens.targetX = width / 2;
            lens.y = lens.targetY = height / 2;
          }
          lens.active = true;
          if (key === "Home") {
            lens.targetX = width / 2;
            lens.targetY = height / 2;
          }
          if (key === "ArrowLeft") lens.targetX = clamp(lens.targetX - spacing * 3, 0, width);
          if (key === "ArrowRight") lens.targetX = clamp(lens.targetX + spacing * 3, 0, width);
          if (key === "ArrowUp") lens.targetY = clamp(lens.targetY - spacing * 3, 0, height);
          if (key === "ArrowDown") lens.targetY = clamp(lens.targetY + spacing * 3, 0, height);
        }
        schedule();
      },
      leave() {
        lens.active = false;
        schedule();
      },
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) cancel();
      else schedule();
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
    document.addEventListener("visibilitychange", onVisibility);
    document.fonts?.addEventListener("loadingdone", resize);
    // Set crossOrigin before src so the request uses CORS mode from the start.
    samplingImage.crossOrigin = "anonymous";
    samplingImage.src = src;
    resize();
    if (samplingImage.complete && samplingImage.naturalWidth) onSampleLoad();
    if (image.complete && !image.naturalWidth) onImageError();

    return () => {
      cancel();
      controlsRef.current = null;
      image.removeEventListener("error", onImageError);
      samplingImage.removeEventListener("load", onSampleLoad);
      samplingImage.removeEventListener("error", onSampleError);
      samplingImage.removeAttribute("src");
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      motion.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
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
