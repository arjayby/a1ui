"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { motion, useReducedMotion, type PanInfo, type Transition } from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";

export type ToastType = "default" | "success" | "error" | "loading";
export type ToastPosition =
  "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type ToastManager = ReturnType<typeof ToastPrimitive.createToastManager>;
type ToastObject = ToastPrimitive.Root.ToastObject;

/** Toasts visible in the collapsed deck. Older ones fade out behind them. */
const DECK_SIZE = 3;
/** How far each older toast peeks out from behind the one in front, in pixels. */
const PEEK = 12;
/** Space between toasts once the deck fans out, in pixels. */
const GAP = 10;
/** Drag distance or speed that dismisses a toast. */
const SWIPE_DISTANCE = 72;
const SWIPE_VELOCITY = 480;

const CHECK = "M6.5 10.5 L9 13 L13.75 7.5";
const CROSS = "M7.5 7.5 L12.5 12.5 M12.5 7.5 L7.5 12.5";

const positions: Record<ToastPosition, string> = {
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
};

/** Creates a toast manager to add toasts from outside React. Pass it to `ToastProvider`. */
export const createToastManager = ToastPrimitive.createToastManager;

/** Returns the toasts and the Base UI manager methods: `add`, `update`, `close`, and `promise`. */
export function useToast() {
  return ToastPrimitive.useToastManager();
}

export interface ToastProviderProps {
  children?: ReactNode;
  /** Default time in milliseconds before a toast closes itself. `0` keeps it open. */
  timeout?: number;
  /** Toasts kept active at once. Older ones are marked limited and fade out. */
  limit?: number;
  /** A manager from `createToastManager` for adding toasts outside React. */
  toastManager?: ToastManager;
}

export function ToastProvider({
  children,
  timeout = 5000,
  limit = DECK_SIZE,
  toastManager,
}: ToastProviderProps) {
  return (
    <ToastPrimitive.Provider timeout={timeout} limit={limit} toastManager={toastManager}>
      {children}
    </ToastPrimitive.Provider>
  );
}

export interface ToasterProps {
  /** Corner or edge the deck sits on. */
  position?: ToastPosition;
  /** Positions the deck inside the nearest positioned ancestor instead of the window. */
  contained?: boolean;
  /** Spring time in seconds for entering, stacking, and fanning out. */
  duration?: number;
  /** Accessible name for the toast region. */
  label?: string;
  className?: string;
}

export function Toaster({
  position = "bottom-right",
  contained = false,
  duration = 0.45,
  label = "Notifications",
  className,
}: ToasterProps) {
  const { toasts } = ToastPrimitive.useToastManager();
  const reducedMotion = useReducedMotion() ?? false;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.45;
  const top = position.startsWith("top");

  // Newest first. Closing toasts drop out of the order so the rest reflow at once.
  const layout = new Map<string, { index: number; offset: number }>();
  let offset = 0;
  for (const toast of toasts) {
    if (toast.transitionStatus === "ending") continue;
    layout.set(toast.id, { index: layout.size, offset });
    offset += (toast.height ?? 0) + GAP;
  }
  const front = toasts.find((toast) => toast.transitionStatus !== "ending");

  const viewport = (
    <ToastPrimitive.Viewport
      data-slot="toaster"
      data-position={position}
      aria-label={label}
      className={`${contained ? "absolute" : "fixed"} ${positions[position]} z-50 h-(--toast-frontmost-height) w-[min(22rem,calc(100%-2rem))] outline-none ${className ?? ""}`}
    >
      {toasts.map((toast, domIndex) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          layout={layout.get(toast.id)}
          zIndex={toasts.length - domIndex}
          frontHeight={front?.height}
          top={top}
          seconds={seconds}
        />
      ))}
    </ToastPrimitive.Viewport>
  );

  return contained ? viewport : <ToastPrimitive.Portal>{viewport}</ToastPrimitive.Portal>;
}

function ToastItem({
  toast,
  layout,
  zIndex,
  frontHeight,
  top,
  seconds,
}: {
  toast: ToastObject;
  layout: { index: number; offset: number } | undefined;
  zIndex: number;
  frontHeight: number | undefined;
  top: boolean;
  seconds: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { close } = ToastPrimitive.useToastManager();
  const ending = toast.transitionStatus === "ending";
  const [swipe, setSwipe] = useState(0);
  // A closing toast keeps the slot it had so it leaves from where it was.
  const [slot, setSlot] = useState({ index: 0, offset: 0, zIndex });
  if (layout && (slot.index !== layout.index || slot.offset !== layout.offset || slot.zIndex !== zIndex)) {
    setSlot({ ...layout, zIndex });
  }

  // Base UI removes a closing toast once the root's Web Animations finish. Motion runs the exit
  // on the main thread, so an empty placeholder animation holds the toast until it is done.
  const exitSeconds = seconds * 0.6;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!ending || exitSeconds === 0 || typeof element?.animate !== "function") return;
    const hold = element.animate(null, { duration: exitSeconds * 1000 + 60 });
    return () => hold.cancel();
  }, [ending, exitSeconds]);

  // Up the screen for a bottom deck, down for a top one.
  const away = top ? 1 : -1;
  const spring: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.2 };

  return (
    <ToastPrimitive.Root
      ref={ref}
      toast={toast}
      swipeDirection={[]}
      render={(props, state) => {
        const { index, offset } = slot;
        const expanded = state.expanded;
        const behind = index > 0 && !expanded;
        const hidden = toast.limited || (behind && index >= DECK_SIZE);
        const height = behind ? frontHeight : toast.height;
        const resting = {
          x: 0,
          y: expanded ? away * offset : away * PEEK * index,
          scale: behind ? 1 - index * 0.05 : 1,
          opacity: hidden ? 0 : 1,
          height: height ?? "auto",
        };
        const exit = swipe
          ? { ...resting, x: swipe * 420, opacity: 0 }
          : { ...resting, y: resting.y - away * 12, scale: resting.scale * 0.92, opacity: 0 };
        const { ref: rootRef, style, ...rest } = props;

        return (
          <motion.div
            {...(rest as object)}
            ref={rootRef as Ref<HTMLDivElement>}
            data-slot="toast"
            data-type={toast.type ?? "default"}
            data-index={index}
            data-swiped={swipe ? (swipe > 0 ? "right" : "left") : undefined}
            style={{ ...(style as object), zIndex: slot.zIndex, transformOrigin: top ? "bottom" : "top" }}
            className={`border-border bg-background text-foreground focus-visible:ring-ring/30 absolute inset-x-0 cursor-grab rounded-xl border shadow-lg outline-none select-none focus-visible:ring-3 active:cursor-grabbing ${top ? "top-0" : "bottom-0"} ${hidden ? "pointer-events-none" : ""} after:absolute after:inset-x-0 after:h-2.5 ${top ? "after:bottom-full" : "after:top-full"}`}
            initial={{ x: 0, y: -away * 72, scale: 1, opacity: 0, height: toast.height ?? "auto" }}
            animate={ending ? exit : resting}
            transition={
              ending
                ? { duration: exitSeconds, ease: [0.32, 0.72, 0, 1] }
                : { ...spring, opacity: { duration: seconds * 0.5 } }
            }
            drag={ending || behind ? false : "x"}
            dragSnapToOrigin
            dragElastic={0.5}
            onDragEnd={(_: unknown, info: PanInfo) => {
              const distance = Math.abs(info.offset.x);
              const speed = Math.abs(info.velocity.x);
              if (distance < SWIPE_DISTANCE && speed < SWIPE_VELOCITY) return;
              setSwipe(Math.sign(speed >= SWIPE_VELOCITY ? info.velocity.x : info.offset.x) || 1);
              close(toast.id);
            }}
          />
        );
      }}
    >
      <div className="h-full overflow-hidden rounded-[inherit]">
        <ToastPrimitive.Content
          data-slot="toast-content"
          className="flex items-start gap-3 p-4 pr-10 transition-opacity duration-200 data-behind:not-data-expanded:opacity-0"
        >
          <ToastIcon type={toast.type} seconds={seconds} />
          <div className="grid min-w-0 flex-1 gap-1">
            <ToastPrimitive.Title
              data-slot="toast-title"
              render={<div />}
              className="text-sm leading-5 font-medium"
            >
              {toast.title}
            </ToastPrimitive.Title>
            {toast.description && (
              <ToastPrimitive.Description
                data-slot="toast-description"
                render={<div />}
                className="text-muted-foreground text-sm leading-5"
              >
                {toast.description}
              </ToastPrimitive.Description>
            )}
            {toast.actionProps && (
              <ToastPrimitive.Action
                data-slot="toast-action"
                className="border-border hover:bg-muted focus-visible:ring-ring/30 mt-2 inline-flex h-7 w-fit items-center rounded-md border px-2.5 text-xs font-medium outline-none focus-visible:ring-3"
              />
            )}
          </div>
        </ToastPrimitive.Content>
      </div>
      <ToastPrimitive.Close
        data-slot="toast-close"
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 absolute top-3 right-3 grid size-6 place-items-center rounded-md outline-none focus-visible:ring-3"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          className="size-3.5"
        >
          <path d={CROSS} />
        </svg>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

function ToastIcon({ type, seconds }: { type: string | undefined; seconds: number }) {
  if (type !== "loading" && type !== "success" && type !== "error") return null;
  const loading = type === "loading";
  const draw = { duration: seconds * 0.8, ease: [0.65, 0, 0.35, 1] as const };

  // One ring and two marks: the spinning arc closes into a ring while the check or cross draws in.
  return (
    <span
      data-slot="toast-icon"
      data-type={type}
      className={`mt-px grid size-[18px] shrink-0 place-items-center ${type === "error" ? "text-destructive" : "text-foreground"}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-[18px] ${loading && seconds > 0 ? "animate-spin" : ""}`}
      >
        <motion.circle
          data-slot="toast-icon-ring"
          cx={10}
          cy={10}
          r={8.25}
          transform="rotate(-90 10 10)"
          initial={false}
          animate={{ pathLength: loading ? 0.3 : 1, opacity: loading ? 1 : 0.35 }}
          transition={draw}
        />
        <motion.path
          data-slot="toast-icon-check"
          d={CHECK}
          initial={false}
          animate={{ pathLength: type === "success" ? 1 : 0, opacity: type === "success" ? 1 : 0 }}
          transition={{ pathLength: { ...draw, delay: seconds * 0.2 }, opacity: { duration: 0 } }}
        />
        <motion.path
          data-slot="toast-icon-cross"
          d={CROSS}
          initial={false}
          animate={{ pathLength: type === "error" ? 1 : 0, opacity: type === "error" ? 1 : 0 }}
          transition={{ pathLength: { ...draw, delay: seconds * 0.2 }, opacity: { duration: 0 } }}
        />
      </svg>
    </span>
  );
}
