"use client";

import * as Primitive from "@radix-ui/react-dialog";
import { XIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="ui-overlay" />
      <Primitive.Content data-slot="dialog-content" className={cn("ui-dialog", className)} {...props}>
        {children}
        <Primitive.Close className="ui-icon-button ui-dialog-close" aria-label="Close">
          <XIcon aria-hidden="true" />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function DialogTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return <Primitive.Title className={cn("ui-dialog-title", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: ComponentProps<typeof Primitive.Description>) {
  return <Primitive.Description className={cn("ui-description", className)} {...props} />;
}
export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-dialog-header", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-dialog-footer", className)} {...props} />;
}
