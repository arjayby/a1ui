"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

// Both marks use three points so the dash can morph into the check.
const CHECK = "M4.5 9.5 L7.5 12.5 L13.5 5.5";
const DASH = "M5 9 L9 9 L13 9";

export interface CheckboxProps {
  /** Visible label. Clicking it toggles the checkbox. */
  label?: ReactNode;
  /** Secondary text under the label. */
  description?: ReactNode;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Shows a dash for a partially selected group. The caller clears it on change. */
  indeterminate?: boolean;
  /** Draws a line through the label when checked, like a finished task. */
  strikethrough?: boolean;
  /** Check-mark draw time in seconds. */
  duration?: number;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export function Checkbox({
  label,
  description,
  "aria-label": ariaLabel,
  checked,
  defaultChecked = false,
  onCheckedChange,
  indeterminate = false,
  strikethrough = false,
  duration = 0.25,
  disabled = false,
  required,
  name,
  value,
  className,
}: CheckboxProps) {
  const labelId = useId();
  const descriptionId = useId();
  const reducedMotion = useReducedMotion();
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const on = checked ?? internalChecked;
  const marked = on || indeterminate;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.25;

  // A ring bursts outward each time the box becomes checked, never on first render.
  const [burst, setBurst] = useState({ on, key: 0 });
  if (burst.on !== on) setBurst({ on, key: on ? burst.key + 1 : burst.key });

  const box = (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={on}
      indeterminate={indeterminate}
      disabled={disabled}
      required={required}
      name={name}
      value={value}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onCheckedChange={(next) => {
        if (checked === undefined) setInternalChecked(next);
        onCheckedChange?.(next);
      }}
      render={
        <motion.span
          whileTap={disabled || seconds === 0 ? undefined : { scale: 0.86 }}
          transition={{ type: "spring", visualDuration: 0.2, bounce: 0 }}
        />
      }
      className={`border-border bg-background text-background data-checked:border-foreground data-checked:bg-foreground data-indeterminate:border-foreground data-indeterminate:bg-foreground focus-visible:ring-ring/30 relative inline-grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-[5px] border shadow-xs transition-colors duration-150 outline-none focus-visible:ring-3 data-disabled:cursor-not-allowed ${label ? "mt-px" : `data-disabled:opacity-50 ${className ?? ""}`}`}
    >
      {burst.key > 0 && on && seconds > 0 && (
        <motion.span
          key={burst.key}
          aria-hidden="true"
          data-slot="checkbox-burst"
          className="border-foreground pointer-events-none absolute -inset-px rounded-[inherit] border"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.7, 0.3, 1] }}
        />
      )}
      <svg
        aria-hidden="true"
        viewBox="0 0 18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[18px]"
      >
        <motion.path
          data-slot="checkbox-mark"
          initial={false}
          animate={{ d: indeterminate ? DASH : CHECK, pathLength: marked ? 1 : 0, opacity: marked ? 1 : 0 }}
          transition={{
            d: { duration: seconds, ease: [0.4, 0, 0.2, 1] },
            pathLength: { duration: marked ? seconds : seconds * 0.6, ease: [0.65, 0, 0.35, 1] },
            opacity: { duration: marked ? 0 : seconds * 0.6 },
          }}
        />
      </svg>
    </CheckboxPrimitive.Root>
  );

  if (!label) return box;

  const struck = strikethrough && on && !indeterminate;

  return (
    <label
      data-slot="checkbox-label"
      data-disabled={disabled || undefined}
      className={`inline-flex cursor-pointer items-start gap-3 text-sm select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 ${className ?? ""}`}
    >
      {box}
      <span className="grid gap-1">
        <span
          id={labelId}
          data-slot="checkbox-text"
          data-struck={struck || undefined}
          className="data-struck:text-muted-foreground leading-5 transition-colors duration-200"
        >
          {/* An inline background line sweeps across every wrapped line of the label. */}
          <motion.span
            className="[box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
            style={{
              backgroundImage: strikethrough ? "linear-gradient(currentColor, currentColor)" : undefined,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "0 55%",
            }}
            initial={false}
            animate={strikethrough ? { backgroundSize: struck ? "100% 1px" : "0% 1px" } : undefined}
            transition={{ duration: seconds * 1.6, ease: [0.65, 0, 0.35, 1] }}
          >
            {label}
          </motion.span>
        </span>
        {description && (
          <span id={descriptionId} className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
