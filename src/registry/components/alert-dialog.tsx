"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { motion, useAnimate, useReducedMotion, type Transition } from "motion/react";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";

// A damped side-to-side shake, in pixels, played when the backdrop is clicked.
const SHAKE = [0, -10, 9, -6, 4, -2, 0];

type AlertDialogContextValue = {
  open: boolean;
  /** Open/close time in seconds; zero when motion is off. */
  seconds: number;
  actionsRef: RefObject<AlertDialogPrimitive.Root.Actions | null>;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialog(part: string) {
  const context = useContext(AlertDialogContext);
  if (!context) throw new Error(`${part} must be used within AlertDialog.`);
  return context;
}

export interface AlertDialogProps {
  /** Whether the dialog is open when controlled by the caller. */
  open?: boolean;
  /** Whether the dialog starts open when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: AlertDialogPrimitive.Root.ChangeEventDetails) => void;
  /** Open and close time in seconds. */
  duration?: number;
  children?: ReactNode;
}

export function AlertDialog({
  open,
  defaultOpen = false,
  onOpenChange,
  duration = 0.3,
  children,
}: AlertDialogProps) {
  const reducedMotion = useReducedMotion();
  const actionsRef = useRef<AlertDialogPrimitive.Root.Actions>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;

  return (
    <AlertDialogContext.Provider value={{ open: current, seconds, actionsRef }}>
      <AlertDialogPrimitive.Root
        open={current}
        actionsRef={actionsRef}
        onOpenChange={(next, eventDetails) => {
          // Hold the popup in the DOM until Motion finishes the exit, then unmount it ourselves.
          if (!next && seconds > 0) eventDetails.preventUnmountOnClose();
          if (open === undefined) setInternalOpen(next);
          onOpenChange?.(next, eventDetails);
        }}
      >
        {children}
      </AlertDialogPrimitive.Root>
    </AlertDialogContext.Provider>
  );
}

export type AlertDialogTriggerProps = ComponentProps<typeof AlertDialogPrimitive.Trigger>;

export function AlertDialogTrigger(props: AlertDialogTriggerProps) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

export interface AlertDialogContentProps {
  /** Element to focus when the dialog opens. Defaults to the first focusable element. */
  initialFocus?: ComponentProps<typeof AlertDialogPrimitive.Popup>["initialFocus"];
  /** Element to focus when the dialog closes. Defaults to the trigger. */
  finalFocus?: ComponentProps<typeof AlertDialogPrimitive.Popup>["finalFocus"];
  className?: string;
  children?: ReactNode;
}

export function AlertDialogContent({
  initialFocus,
  finalFocus,
  className,
  children,
}: AlertDialogContentProps) {
  const dialog = useAlertDialog("AlertDialogContent");
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const [shaking, setShaking] = useState(false);
  const { seconds } = dialog;
  const enter: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.28 };
  const exit: Transition = { duration: seconds * 0.6, ease: [0.4, 0, 1, 1] };
  const transition = dialog.open ? enter : exit;

  // Alert dialogs ignore outside clicks, so the popup shakes to say "answer me first".
  const shake = () => {
    if (seconds === 0 || !dialog.open || !scope.current) return;
    setShaking(true);
    animate(scope.current, { x: SHAKE }, { duration: 0.4, ease: "easeOut" }).then(() => setShaking(false));
  };

  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-backdrop"
        onClick={shake}
        className="bg-background/60 fixed inset-0 z-50 backdrop-blur-[3px]"
        render={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: dialog.open ? 1 : 0 }}
            transition={{ duration: dialog.open ? seconds * 0.8 : seconds * 0.6, ease: "easeOut" }}
          />
        }
      />
      <AlertDialogPrimitive.Popup
        ref={scope}
        data-slot="alert-dialog-content"
        data-shaking={shaking || undefined}
        initialFocus={initialFocus}
        finalFocus={finalFocus}
        className={`bg-background text-foreground border-border fixed inset-0 z-50 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border p-6 shadow-xl outline-none ${className ?? ""}`}
        render={
          <motion.div
            variants={{ open: { opacity: 1, scale: 1 }, closed: { opacity: 0, scale: 0.94 } }}
            initial="closed"
            animate={dialog.open ? "open" : "closed"}
            transition={transition}
            onAnimationComplete={(definition) => {
              if (definition === "closed") dialog.actionsRef.current?.unmount();
            }}
          />
        }
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

export interface AlertDialogTitleProps {
  className?: string;
  children?: ReactNode;
}

export function AlertDialogTitle({ className, children }: AlertDialogTitleProps) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={`text-lg leading-snug font-semibold ${className ?? ""}`}
    >
      {children}
    </AlertDialogPrimitive.Title>
  );
}

export interface AlertDialogDescriptionProps {
  className?: string;
  children?: ReactNode;
}

export function AlertDialogDescription({ className, children }: AlertDialogDescriptionProps) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={`text-muted-foreground mt-2 text-sm leading-relaxed ${className ?? ""}`}
    >
      {children}
    </AlertDialogPrimitive.Description>
  );
}

export interface AlertDialogFooterProps {
  className?: string;
  children?: ReactNode;
}

export function AlertDialogFooter({ className, children }: AlertDialogFooterProps) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={`mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

const buttonClass =
  "focus-visible:ring-ring/30 inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-[background-color,scale] duration-150 outline-none select-none focus-visible:ring-3 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

export type AlertDialogCancelProps = Omit<ComponentProps<typeof AlertDialogPrimitive.Close>, "className"> & {
  className?: string;
};

export function AlertDialogCancel({ className, ...props }: AlertDialogCancelProps) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      {...props}
      className={`${buttonClass} border-border bg-background hover:bg-muted border ${className ?? ""}`}
    />
  );
}

export type AlertDialogActionProps = Omit<ComponentProps<typeof AlertDialogPrimitive.Close>, "className"> & {
  /** `destructive` paints the action in the danger color for irreversible choices. */
  variant?: "default" | "destructive";
  className?: string;
};

export function AlertDialogAction({ variant = "default", className, ...props }: AlertDialogActionProps) {
  const variantClass =
    variant === "destructive"
      ? "bg-destructive text-background hover:bg-destructive/90"
      : "bg-foreground text-background hover:bg-foreground/90";

  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      data-variant={variant}
      {...props}
      className={`${buttonClass} ${variantClass} ${className ?? ""}`}
    />
  );
}
