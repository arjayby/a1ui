"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

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

// Feedback lands on pointer-down; the click still commits on release over the button.
const pressClasses =
  "transition-[color,background-color,border-color,box-shadow,scale] motion-safe:active:scale-[0.97]";

export interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  onCopy?: () => void;
  onCopyError?: () => void;
  animation?: keyof typeof animations;
  /** Transition duration in seconds. The confirmation resets after two seconds. */
  duration?: number;
  disabled?: boolean;
  className?: string;
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  onCopy,
  onCopyError,
  animation = "blur",
  duration = 0.2,
  disabled = false,
  className,
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const reducedMotion = useReducedMotion();
  const copied = state === "copied";
  const buttonLabel = copied ? copiedLabel : label;
  const preset = animations[animation];
  const transitionDuration = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.2;

  useEffect(() => {
    if (state !== "copied") return;
    const timeout = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function copy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setState("error");
      onCopyError?.();
      return;
    }
    setState("copied");
    onCopy?.();
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <Button
        variant="outline"
        data-slot="copy-button"
        data-state={state}
        data-animation={animation}
        aria-label={buttonLabel}
        aria-busy={state === "copying"}
        disabled={disabled || state === "copying" || copied}
        onClick={copy}
        className={`${pressClasses} ${className ?? ""}`}
      >
        <span aria-hidden="true" className="relative grid size-4 shrink-0 place-items-center">
          <AnimatePresence initial={false}>
            <motion.span
              key={copied ? "check" : "copy"}
              className="col-start-1 row-start-1 inline-flex"
              initial={reducedMotion ? false : preset.icon.initial}
              animate={visible}
              exit={reducedMotion ? visible : preset.icon.exit}
              transition={swapTransition(transitionDuration)}
            >
              {copied ? (
                <CheckIcon size={14} className="size-3.5" weight="bold" />
              ) : (
                <CopyIcon size={14} className="size-3.5" />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
        <span
          aria-hidden="true"
          data-label={label}
          data-copied-label={copiedLabel}
          className="relative grid h-5 overflow-hidden text-center before:invisible before:col-start-1 before:row-start-1 before:content-[attr(data-label)] after:invisible after:col-start-1 after:row-start-1 after:content-[attr(data-copied-label)]"
        >
          <AnimatePresence initial={false}>
            <motion.span
              key={buttonLabel}
              className="col-start-1 row-start-1 whitespace-nowrap"
              initial={reducedMotion ? false : preset.label.initial}
              animate={visible}
              exit={reducedMotion ? visible : preset.label.exit}
              transition={swapTransition(transitionDuration)}
            >
              {buttonLabel}
            </motion.span>
          </AnimatePresence>
        </span>
      </Button>
      <span
        role="status"
        aria-atomic="true"
        className={state === "error" ? "text-destructive text-sm" : "sr-only"}
      >
        {state === "error" ? "Couldn't copy. Try again." : copied ? "Copied to clipboard." : ""}
      </span>
    </span>
  );
}
