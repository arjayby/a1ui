"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "motion/react";
import { Children, createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";

type ToggleGroupVariant = "muted" | "outline";

// Items shrink the moment they are pressed and settle back without overshoot on release.
const PRESS: Transition = { type: "spring", visualDuration: 0.2, bounce: 0 };

type ToggleGroupContextValue = {
  value: readonly string[];
  multiple: boolean;
  variant: ToggleGroupVariant;
  /** Seconds, already zero under reduced motion. */
  seconds: number;
  /** Critically damped spring shared by the sliding surface and the chip fill. */
  transition: Transition;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function useToggleGroup(part: string) {
  const context = useContext(ToggleGroupContext);
  if (!context) throw new Error(`${part} must be used within ToggleGroup.`);
  return context;
}

export interface ToggleGroupProps {
  /** Pressed item values when controlled by the caller. */
  value?: string[];
  /** Initially pressed item values when uncontrolled. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /**
   * `false` makes a segmented control: one item stays pressed and a surface slides to it.
   * `true` makes chips that pop in and out independently.
   */
  multiple?: boolean;
  /** `muted` sits on a muted track; `outline` uses a bordered track or bordered chips. */
  variant?: ToggleGroupVariant;
  /** Slide and pop time in seconds. */
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

export function ToggleGroup({
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  variant = "muted",
  duration = 0.35,
  disabled = false,
  orientation = "horizontal",
  loopFocus = true,
  className,
  children,
  ...props
}: ToggleGroupProps) {
  const id = useId();
  const reducedMotion = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
  const current = value ?? internalValue;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const transition: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0 };

  const layout = multiple
    ? `flex-wrap gap-2 ${orientation === "vertical" ? "flex-col items-start" : "items-center"}`
    : `rounded-lg p-[3px] ${orientation === "vertical" ? "flex-col items-stretch" : "h-9 items-center"} ${variant === "muted" ? "bg-muted" : "border-border bg-background border"}`;

  return (
    <LayoutGroup id={id}>
      <ToggleGroupContext.Provider value={{ value: current, multiple, variant, seconds, transition }}>
        <ToggleGroupPrimitive
          {...props}
          data-slot="toggle-group"
          data-variant={variant}
          data-multiple={multiple || undefined}
          value={current}
          multiple={multiple}
          disabled={disabled}
          orientation={orientation}
          loopFocus={loopFocus}
          onValueChange={(next: string[]) => {
            // A segmented control always keeps one item pressed once something is chosen.
            if (!multiple && next.length === 0) return;
            if (value === undefined) setInternalValue(next);
            onValueChange?.(next);
          }}
          className={`relative isolate inline-flex w-fit ${layout} ${className ?? ""}`}
        >
          {children}
        </ToggleGroupPrimitive>
      </ToggleGroupContext.Provider>
    </LayoutGroup>
  );
}

export interface ToggleGroupItemProps {
  value: string;
  disabled?: boolean;
  /** Required when the item shows only an icon. */
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

export function ToggleGroupItem({
  value,
  disabled,
  "aria-label": ariaLabel,
  className,
  children,
}: ToggleGroupItemProps) {
  const group = useToggleGroup("ToggleGroupItem");
  const pressed = group.value.includes(value);
  const hasText = Children.toArray(children).some(
    (child) => typeof child === "string" || typeof child === "number",
  );
  const iconOnly = !hasText;

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && iconOnly && !ariaLabel) {
      console.warn(`ToggleGroupItem "${value}" shows no text, so it needs an aria-label.`);
    }
  }, [iconOnly, ariaLabel, value]);

  const base =
    "focus-visible:ring-ring/30 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none select-none focus-visible:ring-3 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

  if (!group.multiple) {
    return (
      <TogglePrimitive
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        data-slot="toggle-group-item"
        data-icon-only={iconOnly || undefined}
        render={
          <motion.button whileTap={group.seconds === 0 ? undefined : { scale: 0.97 }} transition={PRESS} />
        }
        className={`${base} text-muted-foreground hover:text-foreground data-pressed:text-foreground h-full min-h-[30px] rounded-md ${iconOnly ? "aspect-square px-0" : "px-3"} ${className ?? ""}`}
      >
        {pressed && (
          <motion.span
            aria-hidden="true"
            data-slot="toggle-group-indicator"
            layoutId="toggle-group-indicator"
            initial={false}
            transition={group.transition}
            className={`pointer-events-none absolute inset-0 -z-10 rounded-md ${group.variant === "muted" ? "bg-background ring-foreground/5 shadow-sm ring-1" : "bg-muted"}`}
          />
        )}
        {children}
      </TogglePrimitive>
    );
  }

  const outline = group.variant === "outline";

  return (
    <TogglePrimitive
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      data-slot="toggle-group-item"
      data-icon-only={iconOnly || undefined}
      render={
        <motion.button whileTap={group.seconds === 0 ? undefined : { scale: 0.96 }} transition={PRESS} />
      }
      className={`${base} data-pressed:text-background isolate h-8 rounded-full border ${outline ? "border-border bg-background" : "bg-muted border-transparent"} text-muted-foreground not-data-pressed:hover:text-foreground ${iconOnly ? "w-8 px-0" : "px-3"} ${className ?? ""}`}
    >
      <AnimatePresence initial={false}>
        {pressed && (
          <motion.span
            aria-hidden="true"
            data-slot="toggle-group-fill"
            className="bg-foreground pointer-events-none absolute -inset-px -z-10 rounded-full"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{
              scale: 0.85,
              opacity: 0,
              transition:
                group.seconds === 0
                  ? { duration: 0 }
                  : {
                      scale: { type: "spring", visualDuration: group.seconds * 0.5, bounce: 0 },
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
            data-slot="toggle-group-check"
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
