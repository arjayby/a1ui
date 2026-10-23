import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: ComponentProps<"span"> & {
  variant?: "default" | "dot" | "secondary" | "outline" | "success" | "warning" | "destructive";
}) {
  return <span data-slot="badge" data-variant={variant} className={cn("ui-badge", className)} {...props} />;
}
