"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "motion/react";
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";

// Radii in pixels so Motion can blend the trigger's pill into the panel's corners.
const TRIGGER_RADIUS = 18;
const PANEL_RADIUS = 16;

type PopoverContextValue = {
  open: boolean;
  morph: boolean;
  seconds: number;
  surfaceId: string;
  anchorRef: RefObject<HTMLDivElement | null>;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopover(part: string) {
  const context = useContext(PopoverContext);
  if (!context) throw new Error(`${part} must be used within Popover.`);
  return context;
}

function spring(seconds: number, bounce = 0.2): Transition {
  return seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce };
}

export interface PopoverProps {
  /** Whether the popover is open when controlled by the caller. */
  open?: boolean;
  /** Whether the popover starts open when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The trigger morphs into the panel instead of the panel growing out of it. */
  morph?: boolean;
  /** Opening time in seconds. */
  duration?: number;
  /** `true` locks scroll and outside clicks; `"trap-focus"` only traps focus. */
  modal?: boolean | "trap-focus";
  children?: ReactNode;
}

export function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  morph = false,
  duration = 0.3,
  modal,
  children,
}: PopoverProps) {
  const surfaceId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;

  const root = (
    <PopoverPrimitive.Root
      open={current}
      modal={modal}
      onOpenChange={(next) => {
        if (open === undefined) setInternalOpen(next);
        onOpenChange?.(next);
      }}
    >
      {children}
    </PopoverPrimitive.Root>
  );

  return (
    <LayoutGroup id={surfaceId}>
      <PopoverContext.Provider value={{ open: current, morph, seconds, surfaceId, anchorRef }}>
        {morph ? (
          // The morph panel renders inside this box so it sits exactly where the trigger is.
          <div ref={anchorRef} data-slot="popover-anchor" className="relative inline-flex">
            {root}
          </div>
        ) : (
          root
        )}
      </PopoverContext.Provider>
    </LayoutGroup>
  );
}

export type PopoverTriggerProps = Omit<ComponentProps<typeof PopoverPrimitive.Trigger>, "className"> & {
  className?: string;
};

export function PopoverTrigger({ className, children, ...props }: PopoverTriggerProps) {
  const popover = usePopover("PopoverTrigger");

  if (!popover.morph) {
    return (
      <PopoverPrimitive.Trigger {...props} data-slot="popover-trigger" className={className}>
        {children}
      </PopoverPrimitive.Trigger>
    );
  }

  return (
    <PopoverPrimitive.Trigger
      {...props}
      data-slot="popover-trigger"
      className={`focus-visible:ring-ring/30 relative isolate inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${className ?? ""}`}
    >
      {!popover.open && (
        <motion.span
          aria-hidden="true"
          data-slot="popover-surface"
          layoutId={popover.seconds === 0 ? undefined : `${popover.surfaceId}-surface`}
          layoutCrossfade={false}
          transition={spring(popover.seconds, 0.15)}
          style={{ borderRadius: TRIGGER_RADIUS }}
          className="bg-background border-border pointer-events-none absolute inset-0 -z-10 border shadow-sm"
        />
      )}
      <motion.span
        initial={false}
        animate={{ opacity: popover.open ? 0 : 1 }}
        transition={{
          duration: popover.seconds * (popover.open ? 0.3 : 0.5),
          delay: popover.open ? 0 : popover.seconds * 0.6,
        }}
        className="inline-flex items-center gap-2"
      >
        {children}
      </motion.span>
    </PopoverPrimitive.Trigger>
  );
}

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

export interface PopoverContentProps {
  /** Side of the trigger to open on. Morph panels support `top` and `bottom`. */
  side?: Side;
  align?: Align;
  /** Gap between trigger and panel in pixels. Ignored by morph panels, which cover the trigger. */
  sideOffset?: number;
  alignOffset?: number;
  /** Element to focus on open. Defaults to the first focusable element in the panel. */
  initialFocus?: ComponentProps<typeof PopoverPrimitive.Popup>["initialFocus"];
  /** Element to focus on close. Defaults to the trigger. */
  finalFocus?: ComponentProps<typeof PopoverPrimitive.Popup>["finalFocus"];
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

const morphSide: Record<Side, string> = {
  top: "top-auto! bottom-0!",
  bottom: "top-0! bottom-auto!",
  left: "top-0! bottom-auto!",
  right: "top-0! bottom-auto!",
};

const morphAlign: Record<Align, string> = {
  start: "left-0! right-auto!",
  center: "left-1/2! right-auto! -translate-x-1/2",
  end: "left-auto! right-0!",
};

export function PopoverContent({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  initialFocus,
  finalFocus,
  className,
  children,
  ...props
}: PopoverContentProps) {
  const popover = usePopover("PopoverContent");
  const { seconds } = popover;

  if (popover.morph) {
    return (
      <AnimatePresence>
        {popover.open && (
          <PopoverPrimitive.Portal keepMounted container={popover.anchorRef}>
            {/* Pinned over the trigger: Base UI's floating position lands a frame late for a shared layout. */}
            <PopoverPrimitive.Positioner
              side={side}
              align={align}
              className={`absolute! z-50 w-max! transform-none! ${morphSide[side]} ${morphAlign[align]}`}
            >
              <PopoverPrimitive.Popup
                {...props}
                initialFocus={initialFocus}
                finalFocus={finalFocus}
                data-slot="popover-content"
                data-morph=""
                className={`text-foreground relative isolate w-72 max-w-[calc(100vw-2rem)] p-4 text-sm outline-none ${className ?? ""}`}
                render={
                  // Base UI keeps the popup visible only while the popup itself animates.
                  // `animate` restores opacity when reopened mid-exit; without it the panel stays invisible.
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1, transition: { duration: seconds * 0.2 } }}
                    exit={{ opacity: 0, transition: { duration: seconds * 0.35, ease: [0.4, 0, 1, 1] } }}
                  />
                }
              >
                <motion.span
                  aria-hidden="true"
                  data-slot="popover-surface"
                  layoutId={seconds === 0 ? undefined : `${popover.surfaceId}-surface`}
                  layoutCrossfade={false}
                  transition={spring(seconds, 0.15)}
                  style={{ borderRadius: PANEL_RADIUS }}
                  className="bg-background border-border pointer-events-none absolute inset-0 -z-10 border shadow-lg"
                />
                <motion.div
                  data-slot="popover-body"
                  // Mirror the panel's layout so `className` gaps and flex/grid apply to the children.
                  className="[display:inherit] [grid-template-columns:inherit] [grid-template-rows:inherit] [flex-direction:inherit] [flex-wrap:inherit] [align-items:inherit] [justify-content:inherit] [gap:inherit]"
                  initial={seconds === 0 ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: seconds * 0.6, delay: seconds * 0.45, ease: [0.2, 0.7, 0.3, 1] },
                  }}
                  exit={{
                    filter: seconds === 0 ? "blur(0px)" : "blur(4px)",
                    transition: { duration: seconds * 0.35 },
                  }}
                >
                  {children}
                </motion.div>
              </PopoverPrimitive.Popup>
            </PopoverPrimitive.Positioner>
          </PopoverPrimitive.Portal>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {popover.open && (
        <PopoverPrimitive.Portal keepMounted>
          <PopoverPrimitive.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            className="z-50"
          >
            <PopoverPrimitive.Popup
              {...props}
              initialFocus={initialFocus}
              finalFocus={finalFocus}
              data-slot="popover-content"
              className={`bg-background text-foreground border-border w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border p-4 text-sm shadow-lg outline-none ${className ?? ""}`}
              render={
                <motion.div
                  initial={seconds === 0 ? false : { opacity: 0, scale: 0.88, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: spring(seconds) }}
                  exit={{
                    opacity: 0,
                    scale: seconds === 0 ? 1 : 0.94,
                    filter: seconds === 0 ? "blur(0px)" : "blur(2px)",
                    transition: { duration: seconds * 0.5, ease: [0.4, 0, 1, 1] },
                  }}
                />
              }
            >
              {children}
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export type PopoverCloseProps = Omit<ComponentProps<typeof PopoverPrimitive.Close>, "className"> & {
  className?: string;
};

export function PopoverClose({ className, ...props }: PopoverCloseProps) {
  usePopover("PopoverClose");
  return <PopoverPrimitive.Close {...props} data-slot="popover-close" className={className} />;
}

export interface PopoverTitleProps {
  className?: string;
  children?: ReactNode;
}

export function PopoverTitle({ className, children }: PopoverTitleProps) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      render={<div />}
      className={`text-sm font-medium ${className ?? ""}`}
    >
      {children}
    </PopoverPrimitive.Title>
  );
}

export function PopoverDescription({ className, children }: PopoverTitleProps) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      render={<div />}
      className={`text-muted-foreground text-sm ${className ?? ""}`}
    >
      {children}
    </PopoverPrimitive.Description>
  );
}
