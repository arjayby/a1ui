"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useId, useState } from "react";

export interface OtpInputProps {
  /** Accessible name for the code field, such as "Verification code". */
  label: string;
  /** Number of characters. */
  length?: 4 | 6 | 8;
  /** Numeric accepts digits only. Alphanumeric accepts letters and digits, uppercased. */
  mode?: "numeric" | "alphanumeric";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called with the full code whenever the last slot is filled. */
  onComplete?: (value: string) => void;
  /** Splits the slots in half with a dash, or with the given text. */
  separator?: boolean | string;
  invalid?: boolean;
  /** Shows success borders, such as after the code is verified. */
  success?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function OtpInput({
  label,
  length = 6,
  mode = "numeric",
  value,
  defaultValue = "",
  onValueChange,
  onComplete,
  separator = false,
  invalid = false,
  success = false,
  disabled = false,
  name,
  className,
}: OtpInputProps) {
  if (length !== 4 && length !== 6 && length !== 8) {
    throw new Error("OtpInput requires a length of 4, 6, or 8.");
  }
  const sanitize = (text: string) =>
    (mode === "numeric" ? text.replace(/\D/g, "") : text.replace(/[^a-z0-9]/gi, "").toUpperCase()).slice(
      0,
      length,
    );
  const [internalValue, setInternalValue] = useState(() => sanitize(defaultValue));
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const highlightId = useId();
  const code = sanitize(value ?? internalValue);
  const complete = code.length === length;
  const activeIndex = focused && !success ? Math.min(code.length, length - 1) : -1;

  // Editing always happens at the end so the caret matches the highlighted slot.
  const moveCaretToEnd = (input: HTMLInputElement) => {
    const end = input.value.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
  };

  return (
    <motion.div
      data-slot="otp-input"
      data-complete={complete || undefined}
      data-invalid={invalid || undefined}
      data-success={success || undefined}
      className={`relative flex w-full max-w-max items-center gap-1.5 sm:gap-2 ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className ?? ""}`}
      animate={{ x: invalid && !reducedMotion ? [0, -6, 6, -4, 4, 0] : 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.36 }}
    >
      <input
        aria-label={label}
        aria-invalid={invalid || undefined}
        name={name}
        value={code}
        disabled={disabled}
        autoComplete="one-time-code"
        inputMode={mode === "numeric" ? "numeric" : "text"}
        autoCapitalize={mode === "numeric" ? "off" : "characters"}
        autoCorrect="off"
        spellCheck={false}
        className="absolute inset-0 z-10 w-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
        onFocus={(event) => {
          setFocused(true);
          moveCaretToEnd(event.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(event) => moveCaretToEnd(event.currentTarget)}
        onChange={(event) => {
          const next = sanitize(event.currentTarget.value);
          if (next === code) return;
          if (value === undefined) setInternalValue(next);
          onValueChange?.(next);
          if (next.length === length) onComplete?.(next);
        }}
      />
      {Array.from({ length }, (_, index) => {
        const char = code[index];
        const active = index === activeIndex;
        return (
          <Fragment key={index}>
            {separator !== false && index === length / 2 && (
              <span
                aria-hidden="true"
                data-slot="otp-input-separator"
                className="text-muted-foreground flex w-3 shrink-0 items-center justify-center font-mono text-lg"
              >
                {separator === true ? "-" : separator}
              </span>
            )}
            <motion.div
              aria-hidden="true"
              data-slot="otp-input-slot"
              data-active={active || undefined}
              data-filled={char !== undefined || undefined}
              className={`bg-background text-foreground relative grid aspect-5/6 w-10 min-w-0 place-items-center rounded-md border font-mono text-lg tabular-nums ${success ? "border-success" : invalid ? "border-destructive" : "border-border"}`}
              animate={{ y: success && !reducedMotion ? [0, -3, 0] : 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.28, delay: reducedMotion ? 0 : index * 0.035 }}
            >
              {active && (
                <motion.span
                  layoutId={highlightId}
                  data-slot="otp-input-highlight"
                  className={`pointer-events-none absolute -inset-px rounded-md border ${invalid ? "border-destructive ring-destructive/25" : "border-ring ring-ring/30"} ring-3`}
                  transition={{ type: "spring", duration: reducedMotion ? 0 : 0.3, bounce: 0.2 }}
                />
              )}
              <AnimatePresence initial={false}>
                {char !== undefined && (
                  <motion.span
                    key={char}
                    className="col-start-1 row-start-1"
                    initial={reducedMotion ? false : { y: 8, opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { y: -6, opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
                  >
                    {char}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && char === undefined && (
                <motion.span
                  data-slot="otp-input-caret"
                  className="bg-foreground col-start-1 row-start-1 h-5 w-px"
                  animate={{ opacity: reducedMotion ? 1 : [1, 1, 0, 0] }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }
                  }
                />
              )}
            </motion.div>
          </Fragment>
        );
      })}
    </motion.div>
  );
}
