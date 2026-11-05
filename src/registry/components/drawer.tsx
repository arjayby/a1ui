"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type Transition,
} from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
} from "react";

type DrawerSide = "bottom" | "right";

// Presses on controls never start a drag, and `data-drawer-no-drag` opts any region out.
const NO_DRAG =
  'button,a,input,select,textarea,label,[role="button"],[contenteditable],[data-drawer-no-drag]';
// Share of the sheet a drag must cover, or the speed in px/s a flick must reach, to dismiss.
const DISMISS_RATIO = 0.3;
const DISMISS_VELOCITY = 500;

/** Progress of the open sheet, 0 closed to 1 open, shared with the nearest DrawerScaleWrapper. */
const ScaleContext = createContext<MotionValue<number> | null>(null);

type DrawerContextValue = {
  open: boolean;
  /** True from opening until the exit animation finishes. */
  present: boolean;
  side: DrawerSide;
  transition: Transition;
  /** True when moves should land instantly: reduced motion or a zero duration. */
  instant: boolean;
  reducedMotion: boolean;
  /** Drag offset of the sheet in px along its dismiss direction. */
  offset: MotionValue<number>;
  /** Drag progress toward dismissal, 0 at rest to 1 fully dragged out. */
  progress: MotionValue<number>;
  background: MotionValue<number> | null;
  close: () => void;
  onExitComplete: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawer(part: string) {
  const context = useContext(DrawerContext);
  if (!context) throw new Error(`${part} must be used within Drawer.`);
  return context;
}

/** iOS-style resistance: the further past the edge, the less each pixel moves the sheet. */
function rubberBand(distance: number, size: number) {
  const dimension = Math.max(size, 1);
  return (1 - 1 / ((distance * 0.55) / dimension + 1)) * dimension;
}

export interface DrawerProps {
  /** Whether the drawer is open when controlled by the caller. */
  open?: boolean;
  /** Whether the drawer starts open when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Edge the sheet slides in from. Dragging toward that edge dismisses it. */
  side?: DrawerSide;
  /** Slide time in seconds. Zero moves the sheet instantly. */
  duration?: number;
  /** Scales and rounds the nearest DrawerScaleWrapper while open, like an iOS sheet. */
  scaleBackground?: boolean;
  /** Whether focus is trapped and the page is inert while open. */
  modal?: boolean;
  children?: ReactNode;
}

export function Drawer({
  open,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  duration = 0.5,
  scaleBackground = false,
  modal = true,
  children,
}: DrawerProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.5;
  const transition: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.12 };

  // Keep the sheet rendered after closing until its exit animation finishes.
  const [exiting, setExiting] = useState(false);
  const [wasOpen, setWasOpen] = useState(current);
  if (wasOpen !== current) {
    setWasOpen(current);
    setExiting(!current && seconds > 0);
  }

  const offset = useMotionValue(0);
  const progress = useMotionValue(0);
  const wrapper = useContext(ScaleContext);
  const background = scaleBackground ? wrapper : null;
  const actionsRef = useRef<DrawerPrimitive.Root.Actions | null>(null);

  useEffect(() => {
    if (current) {
      offset.set(0);
      progress.set(0);
    }
  }, [current, offset, progress]);

  useEffect(() => {
    if (!background) return;
    if (seconds === 0) {
      background.set(current ? 1 : 0);
      return;
    }
    const controls = animate(background, current ? 1 : 0, {
      type: "spring",
      visualDuration: seconds,
      bounce: 0,
    });
    return () => controls.stop();
  }, [background, current, seconds]);

  useEffect(() => {
    if (!background) return;
    return () => background.set(0);
  }, [background]);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <DrawerContext.Provider
      value={{
        open: current,
        present: current || exiting,
        side,
        transition,
        instant: seconds === 0,
        reducedMotion,
        offset,
        progress,
        background,
        close: () => actionsRef.current?.close(),
        onExitComplete: () => setExiting(false),
      }}
    >
      <DrawerPrimitive.Root
        open={current}
        onOpenChange={setOpen}
        modal={modal}
        actionsRef={actionsRef}
        swipeDirection={side === "bottom" ? "down" : "right"}
      >
        {children}
      </DrawerPrimitive.Root>
    </DrawerContext.Provider>
  );
}

export type DrawerTriggerProps = ComponentProps<typeof DrawerPrimitive.Trigger>;

export function DrawerTrigger({ className, ...props }: DrawerTriggerProps) {
  return (
    <DrawerPrimitive.Trigger
      data-slot="drawer-trigger"
      className={
        typeof className === "function"
          ? className
          : `bg-foreground text-background focus-visible:ring-ring/30 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-medium outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 ${className ?? ""}`
      }
      {...props}
    />
  );
}

export interface DrawerContentProps {
  /** Hides the grab handle. Dragging still works anywhere on the sheet. */
  hideHandle?: boolean;
  /** Accessible name when there is no DrawerTitle. */
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

export function DrawerContent({ hideHandle = false, className, children, ...props }: DrawerContentProps) {
  const drawer = useDrawer("DrawerContent");
  const { side, offset, progress, background, transition, instant, reducedMotion } = drawer;
  const bottom = side === "bottom";
  const hidden = bottom ? { y: "100%" } : { x: "100%" };
  const shown = bottom ? { y: 0 } : { x: 0 };
  const dim = useTransform(progress, [0, 1], [1, 0]);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; start: number; size: number; active: boolean } | null>(null);

  const point = (event: PointerEvent) => (bottom ? event.clientY : event.clientX);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!drawer.open || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(NO_DRAG)) return;
    // Catch the sheet mid-spring: stop the running animation so it cannot overwrite the drag.
    offset.stop();
    progress.stop();
    background?.stop();
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      id: event.pointerId,
      start: point(event) - offset.get(),
      size: Math.max(bottom ? rect.height : rect.width, 1),
      active: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const delta = point(event) - state.start;
    if (!state.active) {
      if (Math.abs(delta) < 4) return;
      state.active = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
    // Toward the edge the sheet follows the pointer; away from it, it resists and springs back.
    const next = delta >= 0 ? delta : reducedMotion ? 0 : -rubberBand(-delta, state.size);
    const share = Math.min(Math.max(next / state.size, 0), 1);
    offset.set(next);
    progress.set(share);
    background?.set(1 - share);
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    if (!state.active) return;
    setDragging(false);
    const distance = offset.get();
    const velocity = offset.getVelocity();
    if (event.type === "pointerup" && distance > 0) {
      if (distance > state.size * DISMISS_RATIO || velocity > DISMISS_VELOCITY) {
        drawer.close();
        return;
      }
    }
    for (const [value, target] of [
      [offset, 0],
      [progress, 0],
      [background, 1],
    ] as const) {
      if (!value) continue;
      if (instant) value.set(target);
      else animate(value, target, transition);
    }
  };

  if (!drawer.present) return null;

  return (
    <DrawerPrimitive.Portal keepMounted>
      <DrawerPrimitive.Backdrop
        data-slot="drawer-backdrop"
        hidden={false}
        className="fixed inset-0 z-50"
        render={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: drawer.open ? 1 : 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
          />
        }
      >
        <motion.div aria-hidden="true" className="absolute inset-0 bg-black/40" style={{ opacity: dim }} />
      </DrawerPrimitive.Backdrop>
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        hidden={false}
        className={`pointer-events-none fixed inset-0 z-50 flex ${bottom ? "items-end justify-center" : "items-stretch justify-end"}`}
      >
        <DrawerPrimitive.Popup
          {...props}
          data-slot="drawer"
          data-side={side}
          data-base-ui-swipe-ignore="true"
          hidden={false}
          className={`pointer-events-auto relative outline-none ${bottom ? "max-h-[calc(100dvh-3rem)] w-full max-w-lg" : "h-full w-[min(24rem,calc(100vw-3rem))]"}`}
          render={
            <motion.div
              initial={hidden}
              animate={drawer.open ? shown : hidden}
              transition={transition}
              onAnimationComplete={() => {
                if (!drawer.open) drawer.onExitComplete();
              }}
            />
          }
        >
          <motion.div
            data-slot="drawer-surface"
            data-dragging={dragging ? "" : undefined}
            style={bottom ? { y: offset } : { x: offset }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            className={`bg-background text-foreground border-border relative flex h-full max-h-[inherit] flex-col border shadow-lg data-dragging:cursor-grabbing data-dragging:select-none ${
              bottom
                ? "touch-pan-x rounded-t-2xl border-b-0 pb-[env(safe-area-inset-bottom)] after:absolute after:inset-x-[-1px] after:top-full after:h-[50vh] after:border-x after:border-inherit after:bg-inherit"
                : "touch-pan-y rounded-l-2xl border-r-0 after:absolute after:inset-y-[-1px] after:left-full after:w-[50vw] after:border-y after:border-inherit after:bg-inherit"
            } ${className ?? ""}`}
          >
            {!hideHandle && (
              <div
                aria-hidden="true"
                data-slot="drawer-handle"
                className={`bg-muted-foreground/30 shrink-0 cursor-grab rounded-full ${
                  bottom ? "mx-auto mt-3 h-1.5 w-12" : "absolute top-1/2 left-2 h-12 w-1.5 -translate-y-1/2"
                }`}
              />
            )}
            {children}
          </motion.div>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

export function DrawerHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="drawer-header" className={`grid gap-1.5 p-4 pb-2 ${className ?? ""}`} {...props} />;
}

export function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={`mt-auto flex flex-col gap-2 p-4 ${className ?? ""}`}
      {...props}
    />
  );
}

export type DrawerTitleProps = ComponentProps<typeof DrawerPrimitive.Title>;

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={
        typeof className === "function"
          ? className
          : `text-foreground text-base font-semibold ${className ?? ""}`
      }
      {...props}
    />
  );
}

export type DrawerDescriptionProps = ComponentProps<typeof DrawerPrimitive.Description>;

export function DrawerDescription({ className, ...props }: DrawerDescriptionProps) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={
        typeof className === "function" ? className : `text-muted-foreground text-sm ${className ?? ""}`
      }
      {...props}
    />
  );
}

export type DrawerCloseProps = ComponentProps<typeof DrawerPrimitive.Close>;

export function DrawerClose({ className, ...props }: DrawerCloseProps) {
  return (
    <DrawerPrimitive.Close
      data-slot="drawer-close"
      className={
        typeof className === "function"
          ? className
          : `border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring/30 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors outline-none select-none focus-visible:ring-3 ${className ?? ""}`
      }
      {...props}
    />
  );
}

export interface DrawerScaleWrapperProps {
  /** Scale of the wrapped content while a drawer with `scaleBackground` is open. */
  scale?: number;
  /** Corner radius in px the wrapped content rounds to while scaled. */
  radius?: number;
  className?: string;
  children?: ReactNode;
}

/** Wraps the content behind a drawer so `scaleBackground` can shrink and round it. */
export function DrawerScaleWrapper({
  scale = 0.94,
  radius = 16,
  className,
  children,
}: DrawerScaleWrapperProps) {
  const sheet = useMotionValue(0);
  const scaled = useTransform(sheet, [0, 1], [1, scale]);
  const rounded = useTransform(sheet, [0, 1], [0, radius]);
  const y = useTransform(sheet, [0, 1], [0, 8]);

  return (
    <ScaleContext.Provider value={sheet}>
      <motion.div
        data-slot="drawer-scale-wrapper"
        style={{ scale: scaled, borderRadius: rounded, y }}
        className={`origin-top overflow-hidden ${className ?? ""}`}
      >
        {children}
      </motion.div>
    </ScaleContext.Provider>
  );
}
