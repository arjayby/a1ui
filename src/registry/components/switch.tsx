"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

// Track 44 × 24 with 2px padding and a 20px thumb: 20px of travel.
const THUMB = 20;
const PRESSED_THUMB = 25;
const TRAVEL = 20;

export interface SwitchProps {
  /** Visible label. Clicking it toggles the switch. */
  label?: ReactNode;
  /** Accessible name when there is no visible label. */
  "aria-label"?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Icons that rotate in and out inside the thumb. */
  thumbIcons?: { checked: ReactNode; unchecked: ReactNode };
  /** Thumb travel time in seconds. */
  duration?: number;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
}

export function Switch({
  label,
  "aria-label": ariaLabel,
  checked,
  defaultChecked = false,
  onCheckedChange,
  thumbIcons,
  duration = 0.3,
  disabled = false,
  required,
  name,
  className,
}: SwitchProps) {
  const labelId = useId();
  const reducedMotion = useReducedMotion();
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const [pressed, setPressed] = useState(false);
  const on = checked ?? internalChecked;
  const squash = pressed && !disabled && !reducedMotion;
  const width = squash ? PRESSED_THUMB : THUMB;
  const visualDuration = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;
  const transition =
    visualDuration === 0 ? { duration: 0 } : ({ type: "spring", visualDuration, bounce: 0 } as const);
  const release = () => setPressed(false);

  const control = (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={on}
      disabled={disabled}
      required={required}
      name={name}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      onCheckedChange={(next) => {
        if (checked === undefined) setInternalChecked(next);
        onCheckedChange?.(next);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onKeyDown={(event) => {
        if (event.key === " ") setPressed(true);
      }}
      onKeyUp={release}
      onBlur={release}
      className={`bg-muted-foreground/25 data-checked:bg-foreground focus-visible:ring-ring/30 relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 outline-none focus-visible:ring-3 data-disabled:cursor-not-allowed ${label ? "" : `data-disabled:opacity-50 ${className ?? ""}`}`}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        render={
          <motion.span
            initial={false}
            animate={{ x: on ? TRAVEL + THUMB - width : 0, width }}
            transition={transition}
          />
        }
        className="bg-background text-foreground relative grid h-5 place-items-center overflow-hidden rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.2),0_1px_1px_rgb(0_0_0/0.06)] [&_svg]:size-3"
        style={{ width: THUMB }}
      >
        {thumbIcons &&
          (["unchecked", "checked"] as const).map((state) => {
            const visible = (state === "checked") === on;
            return (
              <motion.span
                key={state}
                aria-hidden="true"
                data-slot="switch-icon"
                data-state={state}
                className="absolute inset-0 grid place-items-center"
                initial={false}
                animate={{
                  opacity: visible ? 1 : 0,
                  scale: visible ? 1 : 0.4,
                  rotate: visible ? 0 : state === "checked" ? -90 : 90,
                }}
                transition={transition}
              >
                {thumbIcons[state]}
              </motion.span>
            );
          })}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );

  if (!label) return control;

  return (
    <label
      data-slot="switch-label"
      data-disabled={disabled || undefined}
      className={`inline-flex cursor-pointer items-center gap-3 text-sm select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 ${className ?? ""}`}
    >
      {control}
      <span id={labelId}>{label}</span>
    </label>
  );
}
