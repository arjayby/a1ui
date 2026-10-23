"use client";

import { Toast as Primitive } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const ToastProvider = Primitive.Provider;
export const useToastManager = Primitive.useToastManager;

export function ToastViewport({ className, ...props }: ComponentProps<typeof Primitive.Viewport>) {
  const { toasts } = useToastManager();

  return (
    <Primitive.Portal>
      <Primitive.Viewport
        className={(state) =>
          cn("ui-toast-viewport", typeof className === "function" ? className(state) : className)
        }
        {...props}
      >
        {toasts.map((toast) => (
          <Primitive.Root
            key={toast.id}
            toast={toast}
            data-slot="toast"
            className="ui-toast"
            swipeDirection="right"
          >
            <Primitive.Content>
              <Primitive.Title className="ui-toast-title">{toast.title}</Primitive.Title>
              <Primitive.Description className="ui-description">{toast.description}</Primitive.Description>
              <Primitive.Close
                aria-label="Dismiss notification"
                aria-hidden={false}
                className="ui-icon-button ui-toast-close"
              >
                <XIcon aria-hidden="true" />
              </Primitive.Close>
            </Primitive.Content>
          </Primitive.Root>
        ))}
      </Primitive.Viewport>
    </Primitive.Portal>
  );
}
