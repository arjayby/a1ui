import type { ComponentProps } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: ComponentProps<"span">) {
  return (
    <span role="status" className={cn("ui-spinner-status", className)} {...props}>
      <CircleNotchIcon data-slot="spinner" className="ui-spinner" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </span>
  );
}
