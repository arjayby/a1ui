"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  onCheckedChange,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { onCheckedChange?: (checked: boolean) => void }) {
  return (
    <span className={cn("ui-check-target", className)}>
      <input
        type="checkbox"
        data-slot="checkbox"
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
        {...props}
      />
      <span className="ui-check-glyph" aria-hidden="true" />
    </span>
  );
}
