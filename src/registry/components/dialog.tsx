"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { motion, useReducedMotion, type Transition } from "motion/react";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

type DialogContextValue = {
  open: boolean;
  /** Stays true while the exit animation plays, then the popup unmounts. */
  present: boolean;
  finishExit: () => void;
  /** The element that opened the dialog, so the popup can grow out of it. */
  getOrigin: () => HTMLElement | null;
  seconds: number;
  reducedMotion: boolean;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialog(part: string) {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${part} must be used within Dialog.`);
  return context;
}

const buttonClass =
  "border-border bg-background hover:bg-muted focus-visible:ring-ring/30 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium whitespace-nowrap shadow-xs transition-colors outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

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
  duration = 0.35,
  dismissible = true,
  children,
}: DialogProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const seconds = Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  // The trigger that opened the dialog, so the popup can grow out of it and shrink back into it.
  const triggerRef = useRef<HTMLElement | null>(null);
  // A dialog opened without a trigger, such as from a menu item or a shortcut, grows from whatever had focus.
  const [focusOrigin, setFocusOrigin] = useState<HTMLElement | null>(null);

  // Keep the popup rendered after closing until its exit animation reports that it finished.
  const [present, setPresent] = useState(current);
  if (current && !present) {
    setPresent(true);
    const focused = document.activeElement;
    setFocusOrigin(focused instanceof HTMLElement && focused !== document.body ? focused : null);
  }
  if (!current && present && seconds === 0) setPresent(false);

  return (
    <DialogContext.Provider
      value={{
        open: current,
        present: present || current,
        finishExit: () => {
          triggerRef.current = null;
          setPresent(false);
        },
        getOrigin: () => triggerRef.current ?? focusOrigin,
        seconds,
        reducedMotion,
      }}
    >
      <DialogPrimitive.Root
        open={current}
        disablePointerDismissal={!dismissible}
        onOpenChange={(next, details) => {
          if (next) triggerRef.current = details.trigger instanceof HTMLElement ? details.trigger : null;
          if (open === undefined) setInternalOpen(next);
          onOpenChange?.(next);
        }}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}

export type DialogTriggerProps = Omit<ComponentProps<typeof DialogPrimitive.Trigger>, "className"> & {
  className?: string;
};

export function DialogTrigger({ className, render, ...props }: DialogTriggerProps) {
  useDialog("DialogTrigger");
  return (
    <DialogPrimitive.Trigger
      {...props}
      render={render}
      data-slot="dialog-trigger"
      className={render ? className : `${buttonClass} ${className ?? ""}`}
    />
  );
}

export type DialogCloseProps = Omit<ComponentProps<typeof DialogPrimitive.Close>, "className"> & {
  className?: string;
};

export function DialogClose({ className, render, ...props }: DialogCloseProps) {
  useDialog("DialogClose");
  return (
    <DialogPrimitive.Close
      {...props}
      render={render}
      data-slot="dialog-close"
      className={render ? className : `${buttonClass} ${className ?? ""}`}
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

// Mounted fresh for every opening, so the layout reads and media query below run once per open.
function DialogLayer({
  dialog,
  showCloseButton = true,
  closeLabel = "Close",
  className,
  children,
}: DialogContentProps & { dialog: DialogContextValue }) {
  const { open, seconds, reducedMotion, getOrigin, finishExit } = dialog;
  const popupRef = useRef<HTMLDivElement | null>(null);
  // Below the sm breakpoint the popup rises from the bottom edge like a sheet.
  const [sheet] = useState(
    () => typeof window !== "undefined" && (window.matchMedia?.("(max-width: 639px)").matches ?? false),
  );
  // Reduced motion keeps a short fade and drops the scale, slide, and blur.
  const time = reducedMotion ? Math.min(seconds, 0.15) : seconds;

  // Point the transform origin at the trigger so the popup grows out of it and shrinks back into it.
  const placeOrigin = (popup: HTMLDivElement) => {
    const origin = getOrigin();
    if (!origin?.isConnected || sheet) {
      popup.style.transformOrigin = sheet ? "50% 100%" : "50% 50%";
      return;
    }
    // Offsets ignore the running scale, so they give the popup's resting position.
    const frame = popup.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const trigger = origin.getBoundingClientRect();
    const x = trigger.left + trigger.width / 2 - (frame.left + popup.offsetLeft);
    const y = trigger.top + trigger.height / 2 - (frame.top + popup.offsetTop);
    popup.style.transformOrigin = `${x}px ${y}px`;
  };

  // Measure again on close: the popup may have changed size while it was open.
  useLayoutEffect(() => {
    if (!open && popupRef.current) placeOrigin(popupRef.current);
  });

  const closed = reducedMotion
    ? { opacity: 0 }
    : sheet
      ? { opacity: 0, y: "100%", scale: 1 }
      : { opacity: 0, y: 0, scale: 0.4 };
  const enter: Transition =
    time === 0
      ? { duration: 0 }
      : {
          default: { type: "spring", visualDuration: time, bounce: sheet ? 0 : 0.16 },
          opacity: { duration: time * 0.5, ease: "easeOut" },
        };
  const exit: Transition = time === 0 ? { duration: 0 } : { duration: time * 0.7, ease: [0.4, 0, 0.9, 0.4] };

  return (
    <DialogPrimitive.Portal keepMounted>
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        hidden={false}
        // A fading backdrop lets clicks through, so the trigger can reopen the dialog mid-exit.
        style={{ pointerEvents: open ? undefined : "none" }}
        className="bg-background/60 fixed inset-0 z-50"
        render={
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={
              open
                ? { opacity: 1, backdropFilter: reducedMotion ? "blur(0px)" : "blur(4px)" }
                : { opacity: 0, backdropFilter: "blur(0px)" }
            }
            transition={{ duration: open ? time * 0.8 : time * 0.7, ease: "easeOut" }}
          />
        }
      />
      <DialogPrimitive.Viewport
        data-slot="dialog-viewport"
        hidden={false}
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      >
        <DialogPrimitive.Popup
          // Base UI's portal mounts the popup a commit after this layer, so measure as it attaches.
          ref={(node: HTMLDivElement | null) => {
            if (node && node !== popupRef.current) placeOrigin(node);
            popupRef.current = node;
          }}
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
