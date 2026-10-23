"use client";

import * as Primitive from "@radix-ui/react-toast";
import { XIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const ToastProvider = Primitive.Provider;
export function Toast({ className, ...props }: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="toast" className={cn("ui-toast", className)} {...props} />;
}
export function ToastTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn("ui-toast-title", className)} {...props} />;
}
export function ToastDescription({ className, ...props }: ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn("ui-description", className)} {...props} />;
}
export function ToastClose({ className, ...props }: ComponentProps<typeof Primitive.Close>) {
  return (
    <Primitive.Close
      aria-label="Dismiss notification"
      className={cn("ui-icon-button ui-toast-close", className)}
      {...props}
    >
      <XIcon aria-hidden="true" />
    </Primitive.Close>
  );
}
export function ToastViewport({ className, ...props }: ComponentProps<typeof Primitive.Viewport>) {
  return <Primitive.Viewport className={cn("ui-toast-viewport", className)} {...props} />;
}
