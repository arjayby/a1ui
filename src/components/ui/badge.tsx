import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: ComponentProps<"span"> & { variant?: "default" | "dot" }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        variant === "dot"
          ? "size-2 bg-current"
          : "bg-foreground text-background size-4.5 text-[0.625rem] leading-none font-bold tracking-normal",
        className,
      )}
      {...props}
    />
  );
}
