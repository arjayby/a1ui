"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const animations = {
  slide: {
    icon: {
      initial: { opacity: 0, scale: 0.5, rotate: -45 },
      exit: { opacity: 0, scale: 0.5, rotate: 45 },
    },
    label: { initial: { opacity: 0, y: 12 }, exit: { opacity: 0, y: -12 } },
  },
  blur: {
    icon: { initial: { opacity: 0, filter: "blur(4px)" }, exit: { opacity: 0, filter: "blur(4px)" } },
    label: { initial: { opacity: 0, filter: "blur(4px)" }, exit: { opacity: 0, filter: "blur(4px)" } },
  },
  flip: {
    icon: { initial: { opacity: 0, rotateX: -90 }, exit: { opacity: 0, rotateX: 90 } },
    label: { initial: { opacity: 0, rotateX: -90 }, exit: { opacity: 0, rotateX: 90 } },
  },
};

const visible = { opacity: 1, scale: 1, rotate: 0, rotateX: 0, y: 0, filter: "blur(0px)" };

// Movement settles on a critically damped spring; opacity and blur fade over the same time.
function swapTransition(seconds: number) {
  if (seconds === 0) return { duration: 0 };
  const fade = { type: "tween", duration: seconds } as const;
  return { type: "spring", visualDuration: seconds, bounce: 0, opacity: fade, filter: fade } as const;
}

export interface ConfirmButtonProps {
  onConfirm: () => void;
  label?: string;
  holdingLabel?: string;
  confirmedLabel?: string;
  /** Direction the fill travels toward. */
  direction?: "right" | "left" | "up" | "down";
  /** Required hold time in seconds. Invalid or non-positive values use 1.5. */
  duration?: number;
  animation?: keyof typeof animations;
  /** Text and icon transition time in seconds, independent of the hold duration. */
  transitionDuration?: number;
  disabled?: boolean;
  className?: string;
}

type Hold = { kind: "pointer"; pointerId: number } | { kind: "keyboard"; key: string };

const origins = { right: "left", left: "right", up: "bottom", down: "top" };

// Finger jitter at the edge shouldn't cancel a hold; dragging clearly away still does.
const POINTER_SLOP = 10;

export function ConfirmButton({
  onConfirm,
  label = "Hold to confirm",
  holdingLabel = "Keep holding",
  confirmedLabel = "Confirmed",
  direction = "right",
  duration = 1.5,
  animation = "blur",
  transitionDuration = 0.2,
  disabled = false,
  className,
}: ConfirmButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const holdRef = useRef<Hold | null>(null);
  const frameRef = useRef(0);
  const progressRef = useRef(0);
  const drainRef = useRef<{ stop: () => void } | null>(null);
  const confirmedRef = useRef(false);
  const resetTimeoutRef = useRef(0);
  const [state, setState] = useState<"idle" | "holding" | "confirmed">("idle");
  const id = useId();
  const reducedMotion = useReducedMotion();
  const preset = animations[animation];
  const contentDuration = reducedMotion
    ? 0
    : Number.isFinite(transitionDuration)
      ? Math.max(0, transitionDuration)
      : 0.2;
  const vertical = direction === "up" || direction === "down";
  const holdDuration = Number.isFinite(duration) && duration > 0 ? duration : 1.5;

  function setProgress(progress: number) {
    progressRef.current = progress;
    if (fillRef.current) {
      fillRef.current.style.transform = `${vertical ? "scaleY" : "scaleX"}(${progress})`;
    }
  }

  function stopDrain() {
    drainRef.current?.stop();
    drainRef.current = null;
  }

  // Releasing early drains the fill from where it is, so the cancel reads as the hold letting go.
  function drain() {
    stopDrain();
    if (reducedMotion || progressRef.current === 0) {
      setProgress(0);
      return;
    }
    drainRef.current = animate(progressRef.current, 0, {
      type: "spring",
      visualDuration: 0.3,
      bounce: 0,
      onUpdate: setProgress,
      onComplete: () => setProgress(0),
    });
  }

  function cancel() {
    const hold = holdRef.current;
    if (!hold) return;
    holdRef.current = null;
    cancelAnimationFrame(frameRef.current);
    if (confirmedRef.current) {
      resetTimeoutRef.current = window.setTimeout(() => {
        confirmedRef.current = false;
        setProgress(0);
        setState("idle");
      }, 2000);
    } else {
      drain();
      setState("idle");
    }
    if (hold.kind === "pointer" && buttonRef.current?.hasPointerCapture(hold.pointerId)) {
      buttonRef.current.releasePointerCapture(hold.pointerId);
    }
  }

  const cancelHold = useEffectEvent(cancel);
  useEffect(() => {
    cancelHold();
  }, [disabled, duration, direction]);

  const clearFill = useEffectEvent(() => {
    stopDrain();
    setProgress(0);
  });
  useEffect(() => {
    clearFill();
  }, [direction]);

  useEffect(() => {
    function onBlur() {
      cancelHold();
    }
    function onVisibilityChange() {
      if (document.hidden) cancelHold();
    }
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelAnimationFrame(frameRef.current);
      drainRef.current?.stop();
      window.clearTimeout(resetTimeoutRef.current);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  function start(hold: Hold) {
    if (disabled || holdRef.current || confirmedRef.current) return;
    holdRef.current = hold;
    stopDrain();
    // A press during the drain picks the fill up where it is, but still needs the full hold time.
    const from = progressRef.current;
    setState("holding");
    const started = performance.now();
    function tick(now: number) {
      if (holdRef.current !== hold) return;
      const elapsed = Math.min(1, (now - started) / (holdDuration * 1000));
      const progress = from + (1 - from) * elapsed;
      setProgress(progress);
      if (elapsed >= 1) {
        confirmedRef.current = true;
        setState("confirmed");
        onConfirm();
      } else {
        frameRef.current = requestAnimationFrame(tick);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
  }

  const currentLabel = state === "holding" ? holdingLabel : state === "confirmed" ? confirmedLabel : label;

  return (
    <span className="inline-flex flex-col items-start">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        data-slot="confirm-button"
        data-state={state}
        data-direction={direction}
        data-animation={animation}
        aria-label={currentLabel}
        aria-describedby={`${id}-instructions`}
        disabled={disabled}
        className={`relative isolate w-40 touch-none overflow-hidden transition-[color,background-color,border-color,box-shadow,scale] select-none motion-safe:data-[state=holding]:scale-[0.97] ${className ?? ""}`}
        onPointerDown={(event) => {
          if (disabled || holdRef.current || confirmedRef.current || !event.isPrimary || event.button !== 0)
            return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          start({ kind: "pointer", pointerId: event.pointerId });
        }}
        onPointerUp={(event) => {
          if (holdRef.current?.kind === "pointer" && holdRef.current.pointerId === event.pointerId) cancel();
        }}
        onPointerCancel={(event) => {
          if (holdRef.current?.kind === "pointer" && holdRef.current.pointerId === event.pointerId) cancel();
        }}
        onLostPointerCapture={(event) => {
          if (holdRef.current?.kind === "pointer" && holdRef.current.pointerId === event.pointerId) cancel();
        }}
        onPointerMove={(event) => {
          if (holdRef.current?.kind !== "pointer" || holdRef.current.pointerId !== event.pointerId) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left - POINTER_SLOP ||
            event.clientX > bounds.right + POINTER_SLOP ||
            event.clientY < bounds.top - POINTER_SLOP ||
            event.clientY > bounds.bottom + POINTER_SLOP
          )
            cancel();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancel();
          if (event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          if (!event.repeat) start({ kind: "keyboard", key: event.key });
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") event.preventDefault();
          if (holdRef.current?.kind === "keyboard" && holdRef.current.key === event.key) cancel();
        }}
        onBlur={cancel}
        onClick={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span
          ref={fillRef}
          aria-hidden="true"
          data-slot="confirm-button-fill"
          hidden={state === "confirmed"}
          className="pointer-events-none absolute inset-0 -z-10 bg-[var(--confirm-fill,currentColor)] opacity-20"
          style={{ transform: `${vertical ? "scaleY" : "scaleX"}(0)`, transformOrigin: origins[direction] }}
        />
        <span aria-hidden="true" className="relative grid h-5 w-full overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.span
              key={state}
              data-slot="confirm-button-content"
              data-state={state}
              className="col-start-1 row-start-1 inline-flex w-full items-center justify-center gap-1.5"
              initial={reducedMotion ? false : "hidden"}
              animate="visible"
              exit={reducedMotion ? "visible" : "exit"}
            >
              {state === "confirmed" && (
                <motion.span
                  data-slot="confirm-button-icon"
                  className="inline-flex size-4 shrink-0 items-center justify-center text-[var(--status-success,#15803d)]"
                  variants={{ hidden: preset.icon.initial, visible, exit: preset.icon.exit }}
                  transition={swapTransition(contentDuration)}
                >
                  <CheckIcon size={14} className="size-3.5" weight="bold" />
                </motion.span>
              )}
              <span
                data-slot="confirm-button-label"
                className={`grid h-5 text-center ${state === "confirmed" ? "text-[var(--status-success,#15803d)]" : ""}`}
              >
                <motion.span
                  className="col-start-1 row-start-1 whitespace-nowrap"
                  variants={{ hidden: preset.label.initial, visible, exit: preset.label.exit }}
                  transition={swapTransition(contentDuration)}
                >
                  {currentLabel}
                </motion.span>
              </span>
            </motion.span>
          </AnimatePresence>
        </span>
      </Button>
      <span id={`${id}-instructions`} className="sr-only">
        Hold the button or the Space or Enter key for {holdDuration} seconds to confirm. Release early or
        press Escape to cancel.
      </span>
      <span role="status" aria-atomic="true" className="sr-only">
        {state === "confirmed" ? confirmedLabel : ""}
      </span>
    </span>
  );
}
