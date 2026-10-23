"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ComponentProps<typeof ButtonPrimitive> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "icon";
}) {
  return (
    <ButtonPrimitive
      type={type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={(state) => cn("ui-button", typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
}
