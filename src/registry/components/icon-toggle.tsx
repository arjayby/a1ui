"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

// Phosphor SunIcon and MoonIcon contours, normalized to matching cubic commands.
const sunMoonPaths: NonNullable<IconToggleProps["paths"]> = [
  [
    "M17.25 12 C17.25 14.8995 14.8995 17.25 12 17.25 C9.1005 17.25 6.75 14.8995 6.75 12 C6.75 9.1005 9.1005 6.75 12 6.75 C13.3924 6.75 14.7277 7.3031 15.7123 8.2877 C16.6969 9.2723 17.25 10.6076 17.25 12 Z",
    "M21.3647 13.8647 C20.1151 17.9721 16.14 20.6277 11.8674 20.2066 C7.5948 19.7856 4.2144 16.4052 3.7934 12.1326 C3.3723 7.86 6.0279 3.8849 10.1361 2.6379 C9.1733 5.8143 10.0375 9.2654 12.386 11.614 C14.7346 13.9625 18.1857 14.8267 21.3639 13.8621 Z",
  ],
  ["M12 1.5 L12 3.75", "M10.1361 2.6379 L10.1361 2.6379"],
  ["M18 6 L19.5 4.5", "M10.1361 2.6379 L10.1361 2.6379"],
  ["M20.25 12 L22.5 12", "M21.3621 13.8639 L21.3621 13.8639"],
  ["M18 18 L19.5 19.5", "M19.114 17.614 L19.114 17.614"],
  ["M12 20.25 L12 22.5", "M12.75 20.25 L12.75 20.25"],
  ["M6 18 L4.5 19.5", "M6.386 17.614 L6.386 17.614"],
  ["M3.75 12 L1.5 12", "M3.75 11.25 L3.75 11.25"],
  ["M6 6 L4.5 4.5", "M6.386 4.886 L6.386 4.886"],
];

export interface IconToggleProps {
  /** A stable accessible name for the toggle, such as "Dark mode". */
  label: string;
  /** Each pair contains the unpressed and pressed SVG path in a 24 × 24 viewBox.
   * Both paths must use the same commands in the same order. */
  paths?: readonly (readonly [string, string])[];
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Transition duration in seconds. */
  duration?: number;
  disabled?: boolean;
  className?: string;
}

export function IconToggle({
  label,
  paths = sunMoonPaths,
  pressed,
  defaultPressed = false,
  onPressedChange,
  duration = 0.3,
  disabled = false,
  className,
}: IconToggleProps) {
  const [internalPressed, setInternalPressed] = useState(defaultPressed);
  const active = pressed ?? internalPressed;
  const reducedMotion = useReducedMotion();
  const transitionDuration = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;

  return (
    <Button
      variant="outline"
      size="icon"
      data-slot="icon-toggle"
      data-state={active ? "on" : "off"}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={className}
      onClick={() => {
        const next = !active;
        if (pressed === undefined) setInternalPressed(next);
        onPressedChange?.(next);
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        {paths.map(([off, on], index) => (
          <motion.path
            key={index}
            initial={false}
            animate={{ d: active ? on : off }}
            transition={{ type: "tween", duration: transitionDuration, ease: [0.4, 0, 0.2, 1] }}
          />
        ))}
      </svg>
    </Button>
  );
}
