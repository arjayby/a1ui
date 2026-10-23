"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof Primitive.Popup>) {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="ui-overlay" />
      <Primitive.Popup
        data-slot="dialog-content"
        className={(state) => cn("ui-dialog", typeof className === "function" ? className(state) : className)}
        {...props}
      >
        {children}
        <Primitive.Close className="ui-icon-button ui-dialog-close" aria-label="Close">
          <XIcon aria-hidden="true" />
        </Primitive.Close>
      </Primitive.Popup>
    </Primitive.Portal>
  );
}
export function DialogTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={(state) =>
        cn("ui-dialog-title", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
export function DialogDescription({ className, ...props }: ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={(state) =>
        cn("ui-description", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-dialog-header", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-dialog-footer", className)} {...props} />;
}
