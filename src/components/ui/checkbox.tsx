"use client";

import { useId, type ComponentProps } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  onCheckedChange,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { onCheckedChange?: (checked: boolean) => void }) {
  // Every form field gets an id (browsers flag fields with neither an id nor a name).
  const id = useId();

  return (
    <span className={cn("ui-check-target", className)}>
      <input
        id={id}
        type="checkbox"
        data-slot="checkbox"
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
        {...props}
      />
      <span className="ui-check-glyph" aria-hidden="true">
        <CheckIcon weight="bold" />
      </span>
    </span>
  );
}
