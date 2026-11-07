"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { LayoutGroup, motion, useReducedMotion, type Transition } from "motion/react";
import { createContext, useContext, useId, useState, type ReactNode } from "react";

type RadioGroupVariant = "default" | "card";

type RadioGroupContextValue = {
  value: string | null;
  variant: RadioGroupVariant;
  disabled: boolean;
  transition: Transition;
  /** True when the group had no selection before the latest change, so the dot pops in. */
  popIn: boolean;
  /** True when the duration is zero or the user prefers reduced motion. */
  instant: boolean;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  /** The selected value when controlled by the caller. */
  value?: string | null;
  /** The initially selected value when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `default` renders compact rows; `card` renders each option as a bordered card. */
  variant?: RadioGroupVariant;
  /** Travel time of the dot and card highlight in seconds. */
  duration?: number;
  /** Field name for form submission. */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** Accessible name for the group when no visible heading labels it. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  children?: ReactNode;
}

export function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  variant = "default",
  duration = 0.35,
  name,
  disabled = false,
  required,
  className,
  children,
  ...props
}: RadioGroupProps) {
  const id = useId();
  const reducedMotion = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null);
  const [popIn, setPopIn] = useState(false);
  const current = value === undefined ? internalValue : value;
  const visualDuration = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const transition: Transition =
    visualDuration === 0 ? { duration: 0 } : { type: "spring", visualDuration, bounce: 0 };

  // Scope the shared layoutId so several groups on one page never trade dots.
  return (
    <LayoutGroup id={id}>
      <RadioGroupContext.Provider
        value={{ value: current, variant, disabled, transition, popIn, instant: visualDuration === 0 }}
      >
        {/* Null keeps the group controlled with nothing selected; items only ever emit strings. */}
        <RadioGroupPrimitive<string | null>
          {...props}
          data-slot="radio-group"
          data-variant={variant}
          value={current}
          name={name}
          disabled={disabled}
          required={required}
          onValueChange={(next) => {
            if (next === null) return;
            setPopIn(current == null);
            if (value === undefined) setInternalValue(next);
            onValueChange?.(next);
          }}
          className={`grid ${variant === "card" ? "gap-2" : "gap-3"} ${className ?? ""}`}
        >
          {children}
        </RadioGroupPrimitive>
      </RadioGroupContext.Provider>
    </LayoutGroup>
  );
}

export interface RadioGroupItemProps {
  value: string;
  /** Visible label. Clicking it, or anywhere on a card, selects the option. */
  label?: ReactNode;
  /** Secondary text under the label. */
  description?: ReactNode;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroupItem({
  value,
  label,
  description,
  "aria-label": ariaLabel,
  disabled: disabledProp = false,
  className,
}: RadioGroupItemProps) {
  const group = useContext(RadioGroupContext);
  if (!group) throw new Error("RadioGroupItem must be used within RadioGroup.");
  const labelId = useId();
  const descriptionId = useId();
  const checked = group.value === value;
  const disabled = disabledProp || group.disabled;
  const card = group.variant === "card" && Boolean(label);

  const radio = (
    <Radio.Root
      value={value}
      disabled={disabledProp}
      data-slot="radio-group-radio"
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      render={
        <motion.span
          whileTap={disabled || group.instant ? undefined : { scale: 0.86 }}
          transition={{ type: "spring", visualDuration: 0.2, bounce: 0 }}
        />
      }
      className={`border-border bg-background data-checked:border-foreground focus-visible:ring-ring/30 relative inline-grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-full border shadow-xs transition-colors duration-150 outline-none focus-visible:ring-3 data-disabled:cursor-not-allowed ${label ? "mt-px" : `data-disabled:opacity-50 ${className ?? ""}`}`}
    >
      {checked && (
        <motion.span
          aria-hidden="true"
          data-slot="radio-group-dot"
          layoutId="radio-group-dot"
          initial={group.popIn && !group.instant ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={group.transition}
          className="bg-foreground pointer-events-none size-2 rounded-full"
        />
      )}
    </Radio.Root>
  );

  if (!label) return radio;

  return (
    <label
      data-slot="radio-group-item"
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
      className={`relative flex cursor-pointer items-start gap-3 text-sm select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 ${card ? "border-border bg-background hover:bg-muted/50 rounded-lg border p-4 transition-colors data-disabled:hover:bg-transparent" : ""} ${className ?? ""}`}
    >
      {card && checked && (
        <motion.span
          aria-hidden="true"
          data-slot="radio-group-highlight"
          layoutId="radio-group-highlight"
          initial={false}
          transition={group.transition}
          // An inline radius lets Motion correct it while the highlight resizes between cards.
          style={{ borderRadius: 8 }}
          className="border-foreground pointer-events-none absolute -inset-px border-2"
        />
      )}
      {radio}
      <span className="grid gap-1">
        <span id={labelId} data-slot="radio-group-label" className={`leading-5 ${card ? "font-medium" : ""}`}>
          {label}
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
