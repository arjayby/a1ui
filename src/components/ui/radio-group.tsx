import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Native radio inputs share a name and keep browser arrow-key and form behavior.
export function RadioGroup({ className, ...props }: ComponentProps<"fieldset">) {
  return <fieldset data-slot="radio-group" className={cn("ui-radio-group", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <span className={cn("ui-check-target ui-radio-target", className)}>
      <input type="radio" data-slot="radio-group-item" {...props} />
      <span className="ui-check-glyph" aria-hidden="true" />
    </span>
  );
}
