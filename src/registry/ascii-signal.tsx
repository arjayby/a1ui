"use client";

import { clsx } from "clsx";
import { useEffect, useRef, type CSSProperties } from "react";

export type AsciiSignalStatus = "idle" | "processing" | "complete";

export type AsciiSignalProps = {
  status: AsciiSignalStatus;
  /** The visible and announced status text. */
  label?: string;
  /** Holds the current picture and stops the timer. */
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
};

const columns = 39;
const rows = 9;
const labels: Record<AsciiSignalStatus, string> = {
  idle: "Standing by",
  processing: "Processing",
  complete: "Complete",
};
const numbers: Record<AsciiSignalStatus, string> = {
  idle: "01 / 03",
  processing: "02 / 03",
  complete: "03 / 03",
};

function distanceToSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

function completeFrame() {
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < columns; x++) {
      const distance = Math.min(distanceToSegment(x, y, 8, 4, 17, 8), distanceToSegment(x, y, 17, 8, 33, 0));
      line += distance < 0.55 ? "@" : distance < 1.1 ? "+" : " ";
    }
    lines.push(line);
  }
  return lines.join("\n");
}

const check = completeFrame();

function waveFrame(status: Exclude<AsciiSignalStatus, "complete">, phase: number) {
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < columns; x++) {
      const u = x / (columns - 1);
      const envelope = Math.pow(Math.sin(Math.PI * u), 0.72);
      const wave =
        status === "processing"
          ? Math.sin(x * 0.6 - phase * 5) * 1.8 +
            Math.sin(x * 1.37 + phase * 7.4) * 0.95 +
            Math.sin(x * 0.23 + phase * 2.8) * 0.65
          : Math.sin(x * 0.37 - phase * 1.4) * 0.95 + Math.sin(x * 0.73 + phase * 0.8) * 0.22;
      const center = 4 - wave * envelope;
      const distance = Math.abs(y - center);
      line += distance < 0.38 ? "@" : distance < 0.82 ? "#" : distance < 1.22 ? "+" : " ";
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function resolveFrame(start: string, progress: number) {
  if (progress >= 1) return check;
  const source = start.split("");
  const target = check.split("");
  // A diagonal sweep draws the check from its short stroke to its tip.
  return target
    .map((glyph, index) => {
      if (glyph === "\n") return "\n";
      const x = index % (columns + 1);
      const y = Math.floor(index / (columns + 1));
      const threshold = (x * 0.65 + y * 0.35) / columns;
      return progress >= threshold ? glyph : (source[index] ?? " ");
    })
    .join("");
}

export function AsciiSignal({ status, label, paused = false, className, style }: AsciiSignalProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLPreElement>(null);
  const previousStatusRef = useRef<AsciiSignalStatus | null>(null);
  const initialFrame = status === "complete" ? check : waveFrame(status, 0);
  const frameRef = useRef(initialFrame);

  useEffect(() => {
    const root = rootRef.current;
    const art = artRef.current;
    if (!root || !art) return;

    const previous = previousStatusRef.current;
    previousStatusRef.current = status;
    const start = frameRef.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    let phase = 0;
    let progress = previous !== null && previous !== "complete" && status === "complete" ? 0 : 1;
    let ticks = progress === 0 ? 0 : 13;

    function stop() {
      if (timer !== null) clearInterval(timer);
      timer = null;
    }

    function paint() {
      if (!art) return;
      if (status === "complete") {
        ticks += 1;
        progress = Math.min(1, ticks / 13);
        const next = resolveFrame(start, progress);
        art.textContent = next;
        frameRef.current = next;
        if (progress >= 1) stop();
      } else {
        phase += 0.05;
        const next = waveFrame(status, phase);
        art.textContent = next;
        frameRef.current = next;
      }
    }

    function sync() {
      const motionAllowed = !media.matches && !paused;
      root!.dataset.motion = motionAllowed ? "enabled" : "static";
      if (!motionAllowed) {
        stop();
        const next = status === "complete" ? check : waveFrame(status, 0);
        art!.textContent = next;
        frameRef.current = next;
        progress = 1;
        ticks = 13;
      } else if (!visible || document.hidden || (status === "complete" && progress >= 1)) {
        stop();
      } else if (timer === null) {
        timer = setInterval(paint, 50);
      }
    }

    if (previous !== status) {
      const next = status === "complete" && progress < 1 ? start : initialFrame;
      art.textContent = next;
      frameRef.current = next;
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(root);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      stop();
      observer.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [status, paused, initialFrame]);

  return (
    <div
      ref={rootRef}
      data-slot="ascii-signal"
      data-state={status}
      className={clsx(
        "bg-background text-foreground border-border w-full max-w-[25rem] overflow-hidden rounded-xl border px-5 py-4 font-mono shadow-sm",
        className,
      )}
      style={style}
    >
      <div
        aria-hidden="true"
        className="text-muted-foreground flex items-center justify-between text-[10px] tracking-[0.22em] uppercase"
      >
        <span>ASCII SIGNAL</span>
        <span>{numbers[status]}</span>
      </div>
      <pre
        ref={artRef}
        data-slot="ascii-signal-art"
        aria-hidden="true"
        className="m-0 flex min-h-[7.5rem] items-center justify-center overflow-hidden py-3 text-center text-[clamp(8px,2vw,11px)] leading-[1.2] tracking-[0.08em] select-none"
      >
        {initialFrame}
      </pre>
      <div className="border-border flex items-center gap-2 border-t pt-3 text-xs">
        <span aria-hidden="true" className="bg-foreground size-1.5 shrink-0 rounded-full" />
        <span role="status" aria-live="polite" aria-atomic="true" className="min-w-0 truncate">
          {label ?? labels[status]}
        </span>
        <span
          aria-hidden="true"
          className="text-muted-foreground ms-auto shrink-0 text-[10px] tracking-[0.12em] uppercase"
        >
          {status}
        </span>
      </div>
    </div>
  );
}
