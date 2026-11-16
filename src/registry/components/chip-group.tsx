"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { Children, createContext, useContext, useEffect, useState, type ReactNode } from "react";

// A critically damped spring, the one Motion resolves `visualDuration` with no bounce to. Written as
// stiffness and damping because Motion drops velocity on time-defined springs, and a quick tap or a
// second toggle reverses a chip while it is still moving.
function criticalSpring(visualDuration: number) {
  const omega = (2 * Math.PI) / (visualDuration * 1.2);
  return { type: "spring", stiffness: omega * omega, damping: 2 * omega } as const;
}

type ChipGroupVariant = "muted" | "outline";

// Chips shrink the moment they are pressed and settle back without overshoot on release.
const PRESS: Transition = criticalSpring(0.2);

type ChipGroupContextValue = {
  value: readonly string[];
  variant: ChipGroupVariant;
  /** Seconds, already zero under reduced motion. */
  seconds: number;
  /** Critically damped spring shared by the fill and the check. */
  transition: Transition;
};

const ChipGroupContext = createContext<ChipGroupContextValue | null>(null);

function useChipGroup(part: string) {
  const context = useContext(ChipGroupContext);
  if (!context) throw new Error(`${part} must be used within ChipGroup.`);
  return context;
}

export interface ChipGroupProps {
  /** Pressed item values when controlled by the caller. */
  value?: string[];
  /** Initially pressed item values when uncontrolled. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** `muted` fills idle chips with the muted colour; `outline` gives them a border. */
  variant?: ChipGroupVariant;
  /** Pop time in seconds. */
  duration?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  /** Wrap arrow-key focus from the last item back to the first. */
  loopFocus?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  children?: ReactNode;
}

/** Chips that press on their own. For a single choice, use SegmentedControl. */
export function ChipGroup({
  value,
  defaultValue,
  onValueChange,
  variant = "muted",
  duration = 0.35,
  disabled = false,
  orientation = "horizontal",
  loopFocus = true,
  className,
  children,
  ...props
}: ChipGroupProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
  const current = value ?? internalValue;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const transition: Transition = seconds === 0 ? { duration: 0 } : criticalSpring(seconds);

  return (
    <ChipGroupContext.Provider value={{ value: current, variant, seconds, transition }}>
      <ToggleGroupPrimitive
        {...props}
        data-slot="chip-group"
        data-variant={variant}
        value={current}
        multiple
        disabled={disabled}
        orientation={orientation}
        loopFocus={loopFocus}
        onValueChange={(next: string[]) => {
          if (value === undefined) setInternalValue(next);
          onValueChange?.(next);
        }}
        className={`relative isolate inline-flex w-fit flex-wrap gap-2 ${orientation === "vertical" ? "flex-col items-start" : "items-center"} ${className ?? ""}`}
      >
        {children}
      </ToggleGroupPrimitive>
    </ChipGroupContext.Provider>
  );
}

export interface ChipGroupItemProps {
  value: string;
  disabled?: boolean;
  /** Required when the item shows only an icon. */
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

export function ChipGroupItem({
  value,
  disabled,
  "aria-label": ariaLabel,
  className,
  children,
}: ChipGroupItemProps) {
  const group = useChipGroup("ChipGroupItem");
  const pressed = group.value.includes(value);
  const hasText = Children.toArray(children).some(
    (child) => typeof child === "string" || typeof child === "number",
  );
  const iconOnly = !hasText;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && iconOnly && !ariaLabel) {
      console.warn(`ChipGroupItem "${value}" shows no text, so it needs an aria-label.`);
    }
  }, [iconOnly, ariaLabel, value]);

  const base =
    "focus-visible:ring-ring/30 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none select-none focus-visible:ring-3 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

  const outline = group.variant === "outline";

  return (
    <TogglePrimitive
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      data-slot="chip-group-item"
      data-icon-only={iconOnly || undefined}
      render={
        <motion.button whileTap={group.seconds === 0 ? undefined : { scale: 0.96 }} transition={PRESS} />
      }
      className={`${base} data-pressed:text-primary-foreground isolate h-8 rounded-full border ${outline ? "border-border bg-background" : "bg-muted border-transparent"} text-muted-foreground not-data-pressed:hover:text-foreground ${iconOnly ? "w-8 px-0" : "px-3"} ${className ?? ""}`}
    >
      <AnimatePresence initial={false}>
        {pressed && (
          <motion.span
            aria-hidden="true"
            data-slot="chip-group-fill"
            className="bg-primary pointer-events-none absolute -inset-px -z-10 rounded-full"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{
              scale: 0.85,
              opacity: 0,
              transition:
                group.seconds === 0
                  ? { duration: 0 }
                  : {
                      scale: criticalSpring(group.seconds * 0.5),
                      opacity: { duration: group.seconds * 0.5 },
                    },
            }}
            transition={group.transition}
          />
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {pressed && !iconOnly && (
          <motion.span
            aria-hidden="true"
            data-slot="chip-group-check"
            className="-mr-1.5 inline-flex overflow-hidden"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={group.transition}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
            >
              <motion.path
                d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: group.seconds * 0.8, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </TogglePrimitive>
  );
}
