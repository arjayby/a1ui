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
  const dragRef = useRef<{ pointerId: number; grabOffset: number } | null>(null);
  const progressRef = useRef(0);
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
    moveTo(0);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cancelDisabledDrag = useEffectEvent(cancelDrag);
  useEffect(() => {
    if (disabled) cancelDisabledDrag();
  }, [disabled]);

  async function confirm() {
    if (unavailable || lockedRef.current) return;
    lockedRef.current = true;
    releaseDrag();
    moveTo(1);
    setState("pending");
    try {
      await onConfirm();
      if (mountedRef.current) setState("confirmed");
    } catch {
      if (mountedRef.current) {
        lockedRef.current = false;
        moveTo(0);
        setState("error");
      }
    }
  }

  function movePointer(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || unavailable) return;
    const lane = laneRef.current!.getBoundingClientRect();
    const travel = lane.width - event.currentTarget.getBoundingClientRect().width;
    moveTo(travel > 0 ? Math.min(1, Math.max(0, (event.clientX - lane.left - drag.grabOffset) / travel)) : 0);
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
          "relative h-[60px] w-full overflow-hidden rounded-[20px] border font-mono text-[11px] transition-colors duration-300 select-none motion-reduce:transition-none",
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
        <div ref={laneRef} className="pointer-events-none absolute inset-1.5">
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
              "pointer-events-auto absolute top-0 flex aspect-square h-full touch-none items-center justify-center rounded-[14px] transition-[left,transform,background-color,color] duration-300 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--confirmation-foreground)] motion-reduce:transition-none [&_svg]:size-4",
              complete
                ? "cursor-default bg-[var(--confirmation-background)] text-[var(--confirmation-foreground)]"
                : "cursor-grab bg-[var(--confirmation-foreground)] text-[var(--confirmation-background)]",
              dragging && "cursor-grabbing transition-none",
              disabled && "cursor-not-allowed",
            )}
            style={{
              left: "calc(var(--confirmation-progress) * 100%)",
              transform: "translateX(calc(var(--confirmation-progress) * -100%))",
            }}
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
              // A new gesture starts at the left, even during the return animation.
              moveTo(0);
              dragRef.current = {
                pointerId: event.pointerId,
                grabOffset: event.clientX - event.currentTarget.getBoundingClientRect().left,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              if (state === "error") setState("idle");
            }}
            onPointerMove={movePointer}
            onPointerUp={(event) => {
              if (dragRef.current?.pointerId !== event.pointerId) return;
              movePointer(event);
              const reachedEnd = progressRef.current >= 0.95;
              releaseDrag();
              if (reachedEnd) void confirm();
              else moveTo(0);
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
            ? "mt-3 block font-mono text-xs text-[var(--confirmation-foreground)]"
            : "sr-only",
        )}
      >
        {state === "error" ? errorLabel : complete ? currentLabel : ""}
      </span>
    </div>
  );
}
