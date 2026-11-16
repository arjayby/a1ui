"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

// A critically damped spring, the one Motion resolves `visualDuration` with no bounce to. Written as
// stiffness and damping because Motion drops velocity on time-defined springs, and the trigger can
// reopen the dialog while its exit is still running.
function criticalSpring(visualDuration: number) {
  const omega = (2 * Math.PI) / (visualDuration * 1.2);
  return { type: "spring", stiffness: omega * omega, damping: 2 * omega } as const;
}

type DialogContextValue = {
  open: boolean;
  /** Stays true while the exit animation plays, then the popup unmounts. */
  present: boolean;
  finishExit: () => void;
  seconds: number;
  reducedMotion: boolean;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialog(part: string) {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${part} must be used within Dialog.`);
  return context;
}

type ButtonVariant = NonNullable<ComponentProps<typeof Button>["variant"]>;

export interface DialogProps {
  /** Whether the dialog is open when controlled by the caller. */
  open?: boolean;
  /** Whether the dialog starts open when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Open and close time in seconds. */
  duration?: number;
  /** Close when the backdrop is clicked. Escape still closes. */
  dismissible?: boolean;
  children?: ReactNode;
}

export function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  duration = 0.3,
  dismissible = true,
  children,
}: DialogProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const seconds = Number.isFinite(duration) ? Math.max(0, duration) : 0.3;

  // Keep the popup rendered after closing until its exit animation reports that it finished.
  const [present, setPresent] = useState(current);
  if (current && !present) setPresent(true);
  if (!current && present && seconds === 0) setPresent(false);

  return (
    <DialogContext.Provider
      value={{
        open: current,
        present: present || current,
        finishExit: () => setPresent(false),
        seconds,
        reducedMotion,
      }}
    >
      <DialogPrimitive.Root
        open={current}
        disablePointerDismissal={!dismissible}
        onOpenChange={(next) => {
          if (open === undefined) setInternalOpen(next);
          onOpenChange?.(next);
        }}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}

export type DialogTriggerProps = ComponentProps<typeof DialogPrimitive.Trigger> & {
  /** Button style when no `render` is given. */
  variant?: ButtonVariant;
};

export function DialogTrigger({ variant = "outline", render, ...props }: DialogTriggerProps) {
  useDialog("DialogTrigger");
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      render={render ?? <Button variant={variant} />}
      {...props}
    />
  );
}

export type DialogCloseProps = ComponentProps<typeof DialogPrimitive.Close> & {
  /** Button style when no `render` is given. */
  variant?: ButtonVariant;
};

export function DialogClose({ variant = "outline", render, ...props }: DialogCloseProps) {
  useDialog("DialogClose");
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      render={render ?? <Button variant={variant} />}
      {...props}
    />
  );
}

export interface DialogContentProps {
  /** Show the close button in the top-right corner. */
  showCloseButton?: boolean;
  /** Accessible name for the corner close button. */
  closeLabel?: string;
  className?: string;
  children?: ReactNode;
}

export function DialogContent(props: DialogContentProps) {
  const dialog = useDialog("DialogContent");
  if (!dialog.present) return null;
  return <DialogLayer {...props} dialog={dialog} />;
}

// Mounted fresh for every opening, so the media query below runs once per open.
function DialogLayer({
  dialog,
  showCloseButton = true,
  closeLabel = "Close",
  className,
  children,
}: DialogContentProps & { dialog: DialogContextValue }) {
  const { open, seconds, reducedMotion, finishExit } = dialog;
  // Below the sm breakpoint the popup rises from the bottom edge like a sheet.
  const [sheet] = useState(
    () => typeof window !== "undefined" && (window.matchMedia?.("(max-width: 639px)").matches ?? false),
  );
  // Reduced motion keeps a short fade and drops the scale and slide.
  const time = reducedMotion ? Math.min(seconds, 0.15) : seconds;

  const closed = reducedMotion
    ? { opacity: 0 }
    : sheet
      ? { opacity: 0, y: "100%", scale: 1 }
      : { opacity: 0, y: 0, scale: 0.94 };
  const enter: Transition = time === 0 ? { duration: 0 } : criticalSpring(time);
  const exit: Transition = { duration: time * 0.6, ease: [0.4, 0, 1, 1] };

  return (
    <DialogPrimitive.Portal keepMounted>
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        hidden={false}
        // A fading backdrop lets clicks through, so the trigger can reopen the dialog mid-exit.
        style={{ pointerEvents: open ? undefined : "none" }}
        className="bg-background/60 fixed inset-0 z-50 backdrop-blur-[3px]"
        render={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: open ? time * 0.8 : time * 0.6, ease: "easeOut" }}
          />
        }
      />
      <DialogPrimitive.Viewport
        data-slot="dialog-viewport"
        hidden={false}
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      >
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          data-sheet={sheet || undefined}
          data-state={open ? "open" : "closed"}
          hidden={false}
          // While closing, the popup only plays its exit and can no longer be focused or clicked.
          inert={!open}
          className={`bg-background text-foreground border-border relative grid max-h-[calc(100dvh-2rem)] w-full gap-4 overflow-y-auto rounded-t-2xl border p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg outline-none sm:max-w-lg sm:rounded-xl sm:pb-6 ${className ?? ""}`}
          render={
            <motion.div
              initial={closed}
              animate={open ? { opacity: 1, y: 0, scale: 1 } : closed}
              transition={open ? enter : exit}
              onAnimationComplete={() => {
                if (!open) finishExit();
              }}
            />
          }
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              aria-label={closeLabel}
              data-slot="dialog-corner-close"
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 absolute top-3 right-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                className="size-4"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} data-slot="dialog-header" className={`grid gap-1.5 pr-8 text-left ${className ?? ""}`} />
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      data-slot="dialog-footer"
      className={`flex flex-col-reverse gap-2 sm:flex-row sm:justify-end ${className ?? ""}`}
    />
  );
}

export type DialogTitleProps = Omit<ComponentProps<typeof DialogPrimitive.Title>, "className"> & {
  className?: string;
};

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      {...props}
      data-slot="dialog-title"
      className={`text-lg leading-6 font-semibold tracking-tight ${className ?? ""}`}
    />
  );
}

export type DialogDescriptionProps = Omit<ComponentProps<typeof DialogPrimitive.Description>, "className"> & {
  className?: string;
};

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      {...props}
      data-slot="dialog-description"
      className={`text-muted-foreground text-sm leading-relaxed ${className ?? ""}`}
    />
  );
}
