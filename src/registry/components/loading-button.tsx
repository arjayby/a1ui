"use client";

import { ArrowRightIcon, CheckIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

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

export interface LoadingButtonProps {
  onClick: () => void | Promise<unknown>;
  label?: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  icon?: ReactNode;
  animation?: keyof typeof animations;
  /** Transition duration in seconds. The confirmation resets after two seconds. */
  duration?: number;
  disabled?: boolean;
  className?: string;
}

export function LoadingButton({
  onClick,
  label = "Submit",
  loadingLabel = "Loading...",
  successLabel = "Done",
  errorLabel = "Try again",
  icon = <ArrowRightIcon size={14} className="size-3.5" />,
  animation = "slide",
  duration = 0.2,
  disabled = false,
  className,
}: LoadingButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const locked = useRef(false);
  const statusId = useId();
  const reducedMotion = useReducedMotion();
  const loading = state === "loading";
  const succeeded = state === "success";
  const showIcon = loading || succeeded || Boolean(icon);
  const currentLabel = loading
    ? loadingLabel
    : succeeded
      ? successLabel
      : state === "error"
        ? errorLabel
        : label;
  const preset = animations[animation];
  const transitionDuration = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.2;

  useEffect(() => {
    if (state !== "success") return;
    const timeout = window.setTimeout(() => {
      locked.current = false;
      setState("idle");
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function run() {
    if (disabled || locked.current) return;
    locked.current = true;
    setState("loading");
    try {
      await onClick();
      setState("success");
    } catch {
      locked.current = false;
      setState("error");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <Button
        variant="outline"
        data-slot="loading-button"
        data-state={state}
        data-animation={animation}
        aria-label={currentLabel}
        aria-busy={loading}
        aria-describedby={state === "error" ? statusId : undefined}
        disabled={disabled || loading || succeeded}
        onClick={run}
        className={`w-32 ${className ?? ""}`}
      >
        {showIcon && (
          <span aria-hidden="true" className="relative grid size-4 shrink-0 place-items-center">
            <AnimatePresence initial={!icon}>
              <motion.span
                key={loading ? "spinner" : succeeded ? "check" : "idle"}
                className="col-start-1 row-start-1 inline-flex"
                initial={reducedMotion ? false : preset.icon.initial}
                animate={visible}
                exit={reducedMotion ? visible : preset.icon.exit}
                transition={{ type: "tween", duration: transitionDuration }}
              >
                {loading ? (
                  <SpinnerGapIcon size={14} className="size-3.5 motion-safe:animate-spin" />
                ) : succeeded ? (
                  <CheckIcon size={14} className="size-3.5" weight="bold" />
                ) : (
                  icon
                )}
              </motion.span>
            </AnimatePresence>
          </span>
        )}
        <span aria-hidden="true" className="relative grid h-5 overflow-hidden text-center">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={currentLabel}
              className="col-start-1 row-start-1 whitespace-nowrap"
              initial={reducedMotion ? false : preset.label.initial}
              animate={visible}
              exit={reducedMotion ? visible : preset.label.exit}
              transition={{ type: "tween", duration: transitionDuration }}
            >
              {currentLabel}
            </motion.span>
          </AnimatePresence>
        </span>
      </Button>
      <span id={statusId} role="status" aria-atomic="true" className="sr-only">
        {state === "error" ? errorLabel : loading ? loadingLabel : succeeded ? successLabel : ""}
      </span>
    </span>
  );
}
