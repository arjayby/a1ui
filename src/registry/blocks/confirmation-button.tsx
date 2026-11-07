"use client";

import { clsx as cn } from "clsx";
import { Check, LoaderCircle } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

export interface ConfirmationButtonProps {
  /** Resolve to show success. Throw or reject to let the user try again. */
  onConfirm: () => void | Promise<void>;
  label?: string;
  pendingLabel?: string;
  confirmedLabel?: string;
  errorLabel?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

// Apple's default spring: critically damped (damping 1.0) with a 0.35s response.
const RESPONSE = 0.35;
// A release must reach the end. A throw does not confirm, so a confirmation always needs a deliberate drag.
const COMMIT_AT = 0.95;
// Releasing while pulling back faster than this (track widths per second) cancels even at the end.
const PULL_BACK = -0.5;

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Past either end the handle resists instead of stopping dead, giving way at most `limit` pixels.
const rubberband = (overshoot: number, limit: number) =>
  (overshoot * limit * 0.55) / (limit + 0.55 * Math.abs(overshoot));

const theme = {
  "--confirmation-background": "var(--background, #f7f7f5)",
  "--confirmation-foreground": "var(--foreground, #222320)",
  "--confirmation-border": "var(--border, #d6d7d1)",
  "--confirmation-track":
    "color-mix(in oklab, var(--confirmation-background) 94%, var(--confirmation-foreground))",
  "--confirmation-progress": 0,
} as CSSProperties;

export function ConfirmationButton({
  onConfirm,
  label = "Slide to confirm",
  pendingLabel = "Confirming...",
  confirmedLabel = "Confirmed",
  errorLabel = "Couldn't confirm. Try again.",
  disabled = false,
  className,
  style,
}: ConfirmationButtonProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    grabOffset: number;
    samples: { time: number; progress: number }[];
  } | null>(null);
  const progressRef = useRef(0);
  const springRef = useRef(0);
  const lockedRef = useRef(false);
  const mountedRef = useRef(false);
  const [state, setState] = useState<"idle" | "pending" | "confirmed" | "error">("idle");
  const [dragging, setDragging] = useState(false);
  const unavailable = disabled || state === "pending" || state === "confirmed";
  const complete = state === "pending" || state === "confirmed";

  function moveTo(progress: number) {
    progressRef.current = progress;
    rootRef.current?.style.setProperty("--confirmation-progress", String(progress));
  }

  function stopSpring() {
    cancelAnimationFrame(springRef.current);
  }

  // Springs from the handle's current position and velocity, so a release or a re-grab never jumps.
  function springTo(target: number, velocity = 0) {
    stopSpring();
    const from = progressRef.current - target;
    if (prefersReducedMotion() || (from === 0 && velocity === 0)) {
      moveTo(target);
      return;
    }
    const omega = (2 * Math.PI) / RESPONSE;
    // Never carry the handle past the track, or past where a rubber-banded drag let go.
    const low = Math.min(0, progressRef.current);
    const high = Math.max(1, progressRef.current);
    const start = performance.now();
    function step(now: number) {
      const t = Math.max(0, now - start) / 1000;
      const decay = Math.exp(-omega * t);
      const offset = (from + (velocity + omega * from) * t) * decay;
      const speed = (velocity - omega * (velocity + omega * from) * t) * decay;
      // The ends are walls: a fast release settles against them instead of passing through, and
      // otherwise the spring rests once it is within a fraction of a pixel.
      const crossed = from !== 0 && Math.sign(offset) !== Math.sign(from);
      if (crossed || (Math.abs(offset) < 0.0005 && Math.abs(speed) < 0.01)) {
        moveTo(target);
        return;
      }
      moveTo(Math.min(high, Math.max(low, target + offset)));
      springRef.current = requestAnimationFrame(step);
    }
    springRef.current = requestAnimationFrame(step);
  }

  // Track widths per second over the last 100ms of the drag; zero if the pointer had stopped.
  function releaseVelocity(samples: { time: number; progress: number }[], now: number) {
    const last = samples.at(-1);
    if (!last || now - last.time > 50) return 0;
    const first = samples.find((sample) => last.time - sample.time <= 100) ?? last;
    return last.time > first.time ? ((last.progress - first.progress) / (last.time - first.time)) * 1000 : 0;
  }

  function releaseDrag() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (drag && handleRef.current?.hasPointerCapture(drag.pointerId)) {
      handleRef.current.releasePointerCapture(drag.pointerId);
    }
  }

  function cancelDrag() {
    if (!dragRef.current) return;
    releaseDrag();
    springTo(0);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(springRef.current);
    };
  }, []);

  const cancelDisabledDrag = useEffectEvent(cancelDrag);
  useEffect(() => {
    if (disabled) cancelDisabledDrag();
  }, [disabled]);

  async function confirm(velocity = 0) {
    if (unavailable || lockedRef.current) return;
    lockedRef.current = true;
    releaseDrag();
    springTo(1, velocity);
    setState("pending");
    try {
      await onConfirm();
      if (mountedRef.current) setState("confirmed");
    } catch {
      if (mountedRef.current) {
        lockedRef.current = false;
        springTo(0);
        setState("error");
      }
    }
  }

  // Layout sizes, so the pressed handle's scale doesn't skew the 1:1 tracking.
  function measure(handle: HTMLButtonElement) {
    const lane = laneRef.current!;
    return {
      left: lane.getBoundingClientRect().left,
      travel: lane.clientWidth - handle.offsetWidth,
      edge: lane.offsetLeft,
    };
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || unavailable) return;
    const { left, travel, edge } = measure(event.currentTarget);
    if (travel <= 0) return moveTo(0);
    const position = event.clientX - left - drag.grabOffset;
    const resisted =
      position < 0
        ? rubberband(position, edge)
        : position > travel
          ? travel + rubberband(position - travel, edge)
          : position;
    moveTo(resisted / travel);
    drag.samples.push({ time: event.timeStamp, progress: progressRef.current });
    if (drag.samples.length > 8) drag.samples.shift();
  }

  const currentLabel = state === "confirmed" ? confirmedLabel : state === "pending" ? pendingLabel : label;

  return (
    <div className={cn("w-full", className)} style={{ ...theme, ...style }} ref={rootRef}>
      <div
        data-slot="confirmation-button"
        data-state={state}
        data-dragging={dragging}
        data-disabled={disabled}
        className={cn(
          "relative h-[60px] w-full overflow-hidden rounded-[20px] border font-sans text-[11px] transition-colors duration-300 select-none motion-reduce:transition-none",
          complete
            ? "border-[var(--confirmation-foreground)] bg-[var(--confirmation-foreground)] text-[var(--confirmation-background)]"
            : "border-[var(--confirmation-border)] bg-[var(--confirmation-track)] text-[var(--confirmation-foreground)]",
          disabled && "opacity-45",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 motion-reduce:transition-none",
            complete ? "pr-16 pl-5" : "pr-5 pl-16",
            dragging && "transition-none",
          )}
          style={{ opacity: complete ? 1 : "calc(1 - var(--confirmation-progress) * 1.5)" }}
        >
          <span className="truncate">{currentLabel}</span>
        </span>
        <div ref={laneRef} className="@container pointer-events-none absolute inset-1.5">
          <button
            ref={handleRef}
            type="button"
            data-slot="confirmation-button-handle"
            aria-label={currentLabel}
            aria-describedby={`${id}-instructions${state === "error" ? ` ${id}-status` : ""}`}
            aria-disabled={unavailable}
            aria-busy={state === "pending"}
            disabled={disabled}
            className={cn(
              "pointer-events-auto absolute top-0 left-0 flex aspect-square h-full touch-none items-center justify-center rounded-[14px] transition-[background-color,color,scale] duration-200 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--confirmation-foreground)] motion-reduce:transition-none [&_svg]:size-4",
              complete
                ? "cursor-default bg-[var(--confirmation-background)] text-[var(--confirmation-foreground)]"
                : "cursor-grab bg-[var(--confirmation-foreground)] text-[var(--confirmation-background)]",
              // The press lands instantly and springs back on release.
              dragging && "cursor-grabbing transition-none motion-safe:scale-[0.96]",
              disabled && "cursor-not-allowed",
            )}
            style={{ translate: "calc(var(--confirmation-progress) * (100cqw - 100%)) 0" }}
            onPointerDown={(event) => {
              if (
                unavailable ||
                lockedRef.current ||
                dragRef.current ||
                !event.isPrimary ||
                event.button !== 0
              )
                return;
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              // Catch the handle wherever it is, even mid-return, and keep the grab point under the pointer.
              stopSpring();
              const { left, travel } = measure(event.currentTarget);
              dragRef.current = {
                pointerId: event.pointerId,
                grabOffset: event.clientX - left - progressRef.current * Math.max(0, travel),
                samples: [],
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              if (state === "error") setState("idle");
            }}
            onPointerMove={movePointer}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              if (drag?.pointerId !== event.pointerId) return;
              movePointer(event);
              const velocity = releaseVelocity(drag.samples, event.timeStamp);
              releaseDrag();
              if (progressRef.current >= COMMIT_AT && velocity > PULL_BACK) void confirm(velocity);
              // Only momentum toward the start carries over: a throw toward the end would look like it
              // confirmed when it can't.
              else springTo(0, Math.min(0, velocity));
            }}
            onPointerCancel={(event) => {
              if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
            }}
            onLostPointerCapture={(event) => {
              if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelDrag();
              if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
            }}
            onBlur={cancelDrag}
            onClick={(event) => {
              // Native keyboard and assistive-technology activation has no pointer clicks.
              if (event.detail === 0) void confirm();
            }}
          >
            {state === "confirmed" ? (
              <Check aria-hidden="true" strokeWidth={2} />
            ) : state === "pending" ? (
              <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 28" fill="currentColor">
                <circle cx="7" cy="4" r="2.2" />
                <circle cx="12" cy="9" r="2.2" />
                <circle cx="17" cy="14" r="2.2" />
                <circle cx="12" cy="19" r="2.2" />
                <circle cx="7" cy="24" r="2.2" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <span id={`${id}-instructions`} className="sr-only">
        Drag the arrow to the right and release to confirm, or press Enter or Space. Press Escape to cancel a
        drag.
      </span>
      <span
        id={`${id}-status`}
        role="status"
        aria-atomic="true"
        className={cn(
          state === "error"
            ? "mt-3 block font-sans text-xs text-[var(--confirmation-foreground)]"
            : "sr-only",
        )}
      >
        {state === "error" ? errorLabel : complete ? currentLabel : ""}
      </span>
    </div>
  );
}
