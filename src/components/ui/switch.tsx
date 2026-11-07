"use client";

import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  onCheckedChange,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type" | "role"> & { onCheckedChange?: (checked: boolean) => void }) {
  // Every form field gets an id (browsers flag fields with neither an id nor a name).
  const id = useId();

  return (
    <span className={cn("ui-switch-target", className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        data-slot="switch"
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
        {...props}
      />
      <span className="ui-switch-track" aria-hidden="true">
        <span />
      </span>
    </span>
  );
}
