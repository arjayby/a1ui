"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "@/components/ui/button";

export type SheetSide = "bottom" | "left" | "right";

// Springs are written as stiffness and damping because Motion drops `velocity` on duration-based
// springs, and a released drag hands its velocity to the spring.
// Critically damped, about a 0.4s response: opening, closing and detent changes never overshoot.
const SETTLE = { type: "spring", stiffness: 250, damping: 31.6, restDelta: 0.5, restSpeed: 10 } as const;
// Damping ratio 0.8, about a 0.35s response: the slight bounce a sheet earns only from a flick.
const FLICK = { type: "spring", stiffness: 320, damping: 28.6, restDelta: 0.5, restSpeed: 10 } as const;
/** Release speed, in pixels per second, above which a drag counts as a flick. */
const FLICK_SPEED = 500;
/** Samples older than this, in milliseconds, no longer describe how the pointer was moving at release. */
const VELOCITY_WINDOW = 100;
/** How far the pointer travels, in pixels, before a press becomes a drag. The handle needs less. */
const DRAG_SLOP = 6;
const HANDLE_SLOP = 2;
/** How much the page behind shrinks when the sheet is fully out. */
const PUSH_BACK = 0.05;
/** Reduced motion replaces every slide with a fade this long, in seconds. */
const FADE = 0.15;
// Presses that start on these keep their own behavior, such as selecting text or moving a range thumb.
const NO_DRAG =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-sheet-no-drag]';

const MATERIAL =
  "bg-background/85 backdrop-blur-xl backdrop-saturate-150 [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none contrast-more:bg-background contrast-more:border-foreground contrast-more:backdrop-filter-none";

// The `after` strip continues the surface past the screen edge, so a rubber-banded sheet never shows a gap.
const SIDES = {
  bottom: {
    popup:
      "inset-x-0 bottom-0 mx-auto w-full max-w-xl touch-none rounded-t-2xl border-b-0 after:-inset-x-px after:top-full after:h-screen after:border-x",
    fit: "max-h-[calc(100dvh-var(--sheet-gap,2.5rem))]",
    handle: "relative h-7 w-full shrink-0",
    pill: "h-1 w-9 group-active/handle:scale-x-125",
  },
  right: {
    popup:
      "inset-y-0 right-0 h-full touch-pan-y rounded-l-2xl border-r-0 after:-inset-y-px after:left-full after:w-screen after:border-y",
    fit: "w-96 max-w-[calc(100vw-var(--sheet-gap,2.5rem))]",
    handle: "absolute inset-y-0 left-0 z-10 w-5",
    pill: "h-9 w-1 group-active/handle:scale-y-125",
  },
  left: {
    popup:
      "inset-y-0 left-0 h-full touch-pan-y rounded-r-2xl border-l-0 after:-inset-y-px after:right-full after:w-screen after:border-y",
    fit: "w-96 max-w-[calc(100vw-var(--sheet-gap,2.5rem))]",
    handle: "absolute inset-y-0 right-0 z-10 w-5",
    pill: "h-9 w-1 group-active/handle:scale-y-125",
  },
} as const;

type ButtonVariant = NonNullable<ComponentProps<typeof Button>["variant"]>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Apple's rubber band: the further past the limit, the less the sheet follows. */
function rubberBand(overshoot: number, dimension: number) {
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * overshoot);
}

/** The pointer travel that produces a given rubber-banded distance, so a re-grabbed sheet does not jump. */
function rubberBandInverse(distance: number, dimension: number) {
  return (distance * dimension) / (0.55 * Math.max(1, dimension - distance));
}

/** Apple's momentum projection: where a value moving at `velocity` (px/s) would coast to a stop. */
function project(velocity: number, deceleration = 0.998) {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

type SheetContextValue = {
  open: boolean;
  /** Stays true while the exit animation plays, then the popup unmounts. */
  present: boolean;
  side: SheetSide;
  /** Ascending fractions of the available space, or null when the sheet fits its content. */
  detents: readonly number[] | null;
  detent: number;
  dismissible: boolean;
  pushBack: boolean | string;
  reducedMotion: boolean;
  requestOpen: (open: boolean) => void;
  requestDetent: (index: number) => void;
  finishExit: () => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet(part: string) {
  const context = useContext(SheetContext);
  if (!context) throw new Error(`${part} must be used within Sheet.`);
  return context;
}

export interface SheetProps {
  /** Whether the sheet is open when controlled by the caller. */
  open?: boolean;
  /** Whether the sheet starts open when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The edge the sheet enters from, leaves to, and is dragged toward to dismiss. */
  side?: SheetSide;
  /**
   * Resting sizes as ascending fractions of the available space, such as `[0.4, 1]`.
   * Leave it out for a sheet that fits its content.
   */
  detents?: readonly number[];
  /** Index of the active detent when controlled by the caller. */
  detent?: number;
  /** Index of the detent the sheet opens at when uncontrolled. */
  defaultDetent?: number;
  onDetentChange?: (index: number) => void;
  /** Close on an outside press or a drag toward the edge. Escape and close buttons always close. */
  dismissible?: boolean;
  /**
   * Scale the page behind as the sheet comes out. `true` targets the element marked
   * `data-sheet-page`; a string is a CSS selector for it.
   */
  pushBack?: boolean | string;
  children?: ReactNode;
}

export function Sheet({
  open,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  detents,
  detent,
  defaultDetent = 0,
  onDetentChange,
  dismissible = true,
  pushBack = false,
  children,
}: SheetProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalDetent, setInternalDetent] = useState(defaultDetent);
  const current = open ?? internalOpen;

  if (
    detents &&
    (detents.length === 0 ||
      detents.some(
        (value, index) =>
          !Number.isFinite(value) || value <= 0 || value > 1 || (index > 0 && value <= detents[index - 1]),
      ))
  ) {
    throw new Error("Sheet detents must be ascending fractions greater than 0 and at most 1.");
  }
  const last = detents ? detents.length - 1 : 0;
  const index = (value: number) => (Number.isFinite(value) ? clamp(Math.round(value), 0, last) : 0);

  // Keep the popup rendered after closing until its exit animation reports that it finished.
  const [present, setPresent] = useState(current);
  if (current && !present) {
    setPresent(true);
    // An uncontrolled sheet reopens at its default detent, not wherever it was dragged last time.
    setInternalDetent(defaultDetent);
  }

  const requestOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <SheetContext.Provider
      value={{
        open: current,
        present: present || current,
        side,
        detents: detents ?? null,
        detent: index(detent ?? internalDetent),
        dismissible,
        pushBack,
        reducedMotion,
        requestOpen,
        requestDetent: (next) => {
          if (detent === undefined) setInternalDetent(next);
          onDetentChange?.(next);
        },
        finishExit: () => setPresent(false),
      }}
    >
      <DialogPrimitive.Root open={current} disablePointerDismissal={!dismissible} onOpenChange={requestOpen}>
        {children}
      </DialogPrimitive.Root>
    </SheetContext.Provider>
  );
}

export type SheetTriggerProps = ComponentProps<typeof DialogPrimitive.Trigger> & {
  /** Button style when no `render` is given. */
  variant?: ButtonVariant;
};

export function SheetTrigger({ variant = "outline", render, ...props }: SheetTriggerProps) {
  useSheet("SheetTrigger");
  return (
    <DialogPrimitive.Trigger
      data-slot="sheet-trigger"
      render={render ?? <Button variant={variant} />}
      {...props}
    />
  );
}

export type SheetCloseProps = ComponentProps<typeof DialogPrimitive.Close> & {
  /** Button style when no `render` is given. */
  variant?: ButtonVariant;
};

export function SheetClose({ variant = "outline", render, ...props }: SheetCloseProps) {
  useSheet("SheetClose");
  return (
    <DialogPrimitive.Close
      data-slot="sheet-close"
      render={render ?? <Button variant={variant} />}
      {...props}
    />
  );
}

export interface SheetContentProps {
  /** Show the grab handle. With several detents it is also the keyboard control that moves between them. */
  showHandle?: boolean;
  /** Accessible name for the grab handle. */
  handleLabel?: string;
  /** The element focused on open. Defaults to the sheet itself, so a touch keyboard does not cover it. */
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  children?: ReactNode;
}

export function SheetContent(props: SheetContentProps) {
  const sheet = useSheet("SheetContent");
  if (!sheet.present) return null;
  return <SheetLayer {...props} sheet={sheet} />;
}

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  /** The sheet's offset under the pointer when it was pressed, with any rubber-banding undone. */
  startOffset: number;
  onHandle: boolean;
  scroller: HTMLElement | null;
  /** `native` means the press belongs to the content: a scroll, a text selection, a cross-axis swipe. */
  state: "pending" | "dragging" | "native";
  /** The press caught the sheet mid-animation and is holding it still. */
  interrupted: boolean;
  history: { time: number; offset: number }[];
  stop: () => void;
};

/** The nearest ancestor inside the sheet that can scroll along the drag axis. */
function findScroller(target: Element, popup: HTMLElement, vertical: boolean) {
  for (let element: Element | null = target; element && element !== popup; element = element.parentElement) {
    if (!(element instanceof HTMLElement)) continue;
    const range = vertical
      ? element.scrollHeight - element.clientHeight
      : element.scrollWidth - element.clientWidth;
    if (range <= 1) continue;
    const overflow = getComputedStyle(element)[vertical ? "overflowY" : "overflowX"];
    if (overflow === "auto" || overflow === "scroll") return element;
  }
  return null;
}

// Mounted fresh for every opening, so each opening starts from a hidden sheet and a clean gesture.
function SheetLayer({
  sheet,
  showHandle = true,
  handleLabel = "Resize sheet",
  initialFocus,
  className,
  children,
}: SheetContentProps & { sheet: SheetContextValue }) {
  const { open, side, detents, detent, pushBack, reducedMotion } = sheet;
  const vertical = side === "bottom";
  // Offsets grow toward the sheet's own edge; on the left edge that is the negative screen direction.
  const sign = side === "left" ? -1 : 1;
  const largest = detents ? detents[detents.length - 1] : 1;
  const smallest = detents ? detents[0] : 1;

  // Base UI's portal mounts the popup a commit after this layer, so effects wait for the node.
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [far] = useState(() =>
    typeof window === "undefined" ? 4000 : Math.max(window.innerWidth, window.innerHeight),
  );
  /** The sheet's size along the drag axis. */
  const extent = useMotionValue(far);
  /** How far the sheet is pushed toward its edge: 0 at the largest detent, `extent` when hidden. */
  const offset = useMotionValue(far);
  /** Reduced motion fades the sheet in place instead of sliding it. */
  const fade = useMotionValue(reducedMotion ? 0 : 1);
  const translate = useTransform(() => offset.get() * sign);
  // The scrim is at full strength from the smallest detent up and thins as the sheet is dragged away.
  const scrim = useTransform(() => {
    const shown = extent.get() - offset.get();
    const full = (extent.get() * smallest) / largest;
    return fade.get() * (full > 0 ? clamp(shown / full, 0, 1) : 1);
  });
  // Between detents the content area ends at the screen edge, so a footer stays in view at every detent.
  // Past the smallest detent the sheet leaves whole instead of squeezing its content.
  const inset = useTransform(() => {
    const hidden = clamp(offset.get(), 0, extent.get() * (1 - smallest / largest));
    return vertical ? `calc(${hidden}px + env(safe-area-inset-bottom, 0px))` : `${hidden}px`;
  });

  const gesture = useRef<Gesture | null>(null);
  const animation = useRef<AnimationPlaybackControls | null>(null);
  const moving = useRef(false);
  /** Where the sheet is heading, so a re-render does not restart the animation already taking it there. */
  const heading = useRef<{ value: number; open: boolean } | null>(null);
  /** The next sync places the sheet without animating, as after a resize. */
  const snap = useRef(false);
  // Bumped after a release, so the sync re-checks the sheet even when a controlled caller changed nothing.
  const [, setTick] = useState(0);
  const latest = useRef(sheet);
  useLayoutEffect(() => {
    latest.current = sheet;
  });

  /** Resting offsets, one per detent. */
  function rests() {
    const stops = latest.current.detents;
    if (!stops) return [0];
    const size = extent.get();
    return stops.map((value) => size * (1 - value / stops[stops.length - 1]));
  }

  /** The furthest the sheet travels toward its edge before it resists. */
  function limit() {
    return latest.current.dismissible ? extent.get() : rests()[0];
  }

  function settle(
    value: number,
    opening: boolean,
    { velocity, flick }: { velocity?: number; flick?: boolean } = {},
  ) {
    heading.current = { value, open: opening };
    animation.current?.stop();
    moving.current = true;
    const done = () => {
      moving.current = false;
      animation.current = null;
      if (!latest.current.open) latest.current.finishExit();
    };
    if (latest.current.reducedMotion) {
      if (opening) offset.jump(value);
      animation.current = animate(fade, opening ? 1 : 0, {
        duration: FADE,
        ease: "easeOut",
        onComplete: done,
      });
      return;
    }
    // Without a release velocity the spring continues at whatever speed the sheet already has.
    const speed = velocity ?? offset.getVelocity();
    if (Math.abs(offset.get() - value) < 0.5 && Math.abs(speed) < 10) {
      offset.jump(value);
      done();
      return;
    }
    animation.current = animate(offset, value, {
      ...(flick && opening ? FLICK : SETTLE),
      velocity: speed,
      onComplete: done,
    });
  }

  /** Sends the sheet to what its props ask for, from wherever it is and however fast it is moving. */
  function sync() {
    const active = gesture.current;
    if (!heading.current || active?.state === "dragging" || active?.interrupted) return;
    const opening = latest.current.open;
    const value = opening ? rests()[latest.current.detent] : extent.get();
    const place = snap.current && opening && heading.current.open;
    snap.current = false;
    if (heading.current.value === value && heading.current.open === opening) return;
    if (place) {
      heading.current = { value, open: opening };
      offset.jump(value);
    } else {
      settle(value, opening);
    }
  }

  // Measure the sheet, start it hidden past its edge, and keep it in place when it resizes.
  useLayoutEffect(() => {
    if (!popup) return;
    const measure = () => {
      const size = vertical ? popup.offsetHeight : popup.offsetWidth;
      if (heading.current && size === extent.get()) return;
      extent.jump(size);
      if (!heading.current) {
        offset.jump(size);
        heading.current = { value: size, open: false };
      } else if (!moving.current) {
        snap.current = true;
      }
      sync();
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(popup);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sync` reads the latest props through a ref.
  }, [popup, vertical, extent, offset]);

  // Follow the open state and the active detent.
  useLayoutEffect(() => {
    sync();
  });

  useEffect(
    () => () => {
      animation.current?.stop();
      gesture.current?.stop();
    },
    [],
  );

  // Push the page behind back as the sheet comes out, and put it back exactly as it was.
  useEffect(() => {
    if (!popup || !pushBack || reducedMotion) return;
    const page = document.querySelector<HTMLElement>(pushBack === true ? "[data-sheet-page]" : pushBack);
    if (!page) return;
    const { scale, transformOrigin } = page.style;
    // Shrink toward the middle of the visible page, wherever the document is scrolled to.
    const bounds = page.getBoundingClientRect();
    page.style.transformOrigin = `${window.innerWidth / 2 - bounds.left}px ${window.innerHeight / 2 - bounds.top}px`;
    const apply = () => {
      const size = extent.get();
      const shown = size > 0 ? clamp((size - offset.get()) / size, 0, 1) : 0;
      page.style.scale = String(1 - PUSH_BACK * shown);
    };
    apply();
    const stopOffset = offset.on("change", apply);
    const stopExtent = extent.on("change", apply);
    return () => {
      stopOffset();
      stopExtent();
      page.style.scale = scale;
      page.style.transformOrigin = transformOrigin;
    };
  }, [popup, pushBack, reducedMotion, extent, offset]);

  /** Whether a movement of `along` pixels toward the edge moves the sheet rather than scrolling content. */
  function ownsGesture(scroller: HTMLElement | null, along: number) {
    if (!scroller) return true;
    const position = vertical ? scroller.scrollTop : scroller.scrollLeft;
    const range = vertical
      ? scroller.scrollHeight - scroller.clientHeight
      : scroller.scrollWidth - scroller.clientWidth;
    // A finger moving down or right scrolls content back toward its start.
    const canScroll = along * sign > 0 ? position > 0 : position < range - 1;
    if (!canScroll) return true;
    // Below the largest detent, content resting at its start grows the sheet before it scrolls.
    return along < 0 && position <= 0 && offset.get() > 1;
  }

  /** Undoes the rubber band, giving the offset the pointer itself is asking for. */
  function unresisted(shown: number) {
    const size = extent.get();
    const max = limit();
    if (shown < 0) return -rubberBandInverse(-shown, size);
    if (shown > max) return max + rubberBandInverse(shown - max, size);
    return shown;
  }

  function beginDrag(active: Gesture, along: number) {
    if (!popup) return;
    active.state = "dragging";
    // A new animation may have started since the press; continue from where the sheet is now.
    if (moving.current) active.startOffset = unresisted(offset.get()) - along;
    animation.current?.stop();
    animation.current = null;
    moving.current = false;
    try {
      popup.setPointerCapture(active.pointerId);
    } catch {
      // The pointer is already gone; the document listeners still finish the gesture.
    }
    popup.setAttribute("data-dragging", "");
    popup.ownerDocument.getSelection()?.removeAllRanges();
    // Grabbed on its way out: the sheet is open again and follows the pointer.
    if (!latest.current.open) latest.current.requestOpen(true);
  }

  /** A press that held a moving sheet and then let go without dragging it: carry on as before. */
  function resume(active: Gesture) {
    active.interrupted = false;
    if (heading.current) heading.current = { value: Number.NaN, open: heading.current.open };
    sync();
  }

  /** Decides who owns a press once it has moved, starts the drag if the sheet does, and returns the travel. */
  function resolve(active: Gesture, clientX: number, clientY: number, force = false) {
    const dx = clientX - active.startX;
    const dy = clientY - active.startY;
    const along = (vertical ? dy : dx) * sign;
    const across = vertical ? dx : dy;
    if (active.state !== "pending") return along;
    const slop = force ? 0 : active.onHandle ? HANDLE_SLOP : DRAG_SLOP;
    if (Math.abs(along) < slop && Math.abs(across) < slop) return along;
    if (active.onHandle || (Math.abs(along) > Math.abs(across) && ownsGesture(active.scroller, along))) {
      beginDrag(active, along);
    } else {
      active.state = "native";
      if (active.interrupted) resume(active);
    }
    return along;
  }

  function track(event: PointerEvent) {
    const active = gesture.current;
    if (!active) return;
    const along = resolve(active, event.clientX, event.clientY);
    if (active.state !== "dragging") return;
    // The sheet never stops dead: it resists past the largest detent, and past the smallest
    // when it cannot be dismissed.
    const size = extent.get();
    const max = limit();
    const wanted = active.startOffset + along;
    const shown =
      wanted < 0 ? -rubberBand(-wanted, size) : wanted > max ? max + rubberBand(wanted - max, size) : wanted;
    offset.set(shown);
    active.history.push({ time: event.timeStamp, offset: shown });
    if (active.history.length > 8) active.history.shift();
  }

  function release(event: PointerEvent, cancelled: boolean) {
    const active = gesture.current;
    if (!active) return;
    active.stop();
    gesture.current = null;
    if (active.state !== "dragging") {
      if (active.interrupted) resume(active);
      return;
    }
    try {
      popup?.releasePointerCapture(active.pointerId);
    } catch {
      // Capture was already lost, as when the pointer was cancelled.
    }
    popup?.removeAttribute("data-dragging");

    // Velocity over the last few samples; a pointer that paused before lifting throws nothing.
    const recent = active.history.filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW);
    const from = recent[0];
    const to = recent[recent.length - 1];
    const velocity =
      cancelled || !from || to.time === from.time
        ? 0
        : ((to.offset - from.offset) / (to.time - from.time)) * 1000;

    // Rest where the throw is heading, not where the pointer let go.
    const landing = offset.get() + project(velocity);
    const stops = rests();
    const nearest = stops.reduce(
      (best, stop, index) => (Math.abs(stop - landing) < Math.abs(stops[best] - landing) ? index : best),
      0,
    );
    const hidden = extent.get();
    const dismiss =
      !latest.current.open ||
      (latest.current.dismissible && Math.abs(hidden - landing) < Math.abs(stops[nearest] - landing));
    if (dismiss) {
      settle(hidden, false, { velocity });
      if (latest.current.open) latest.current.requestOpen(false);
    } else {
      settle(stops[nearest], true, { velocity, flick: Math.abs(velocity) > FLICK_SPEED });
      if (nearest !== latest.current.detent) latest.current.requestDetent(nearest);
    }
    // A controlled caller may refuse the change; the next sync then returns the sheet to its props.
    setTick((count) => count + 1);
  }

  function press(event: ReactPointerEvent<HTMLDivElement>) {
    if (!popup || !event.isPrimary || event.button !== 0 || gesture.current) return;
    const target = event.target as Element;
    if (!popup.contains(target) || target.closest(NO_DRAG)) return;
    // Catch a moving sheet the moment it is pressed. It is not dragged until the pointer moves,
    // so a press on a button inside it still clicks.
    const interrupted = moving.current && !latest.current.reducedMotion;
    if (interrupted) {
      animation.current?.stop();
      animation.current = null;
      moving.current = false;
    }
    const doc = popup.ownerDocument;
    const pointerId = event.pointerId;
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId === pointerId) track(moveEvent);
    };
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId === pointerId) release(upEvent, false);
    };
    const cancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) release(cancelEvent, true);
    };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up);
    doc.addEventListener("pointercancel", cancel);
    gesture.current = {
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: unresisted(offset.get()),
      onHandle: target.closest('[data-slot="sheet-handle"]') !== null,
      scroller: findScroller(target, popup, vertical),
      state: "pending",
      interrupted,
      history: [{ time: event.timeStamp, offset: offset.get() }],
      stop: () => {
        doc.removeEventListener("pointermove", move);
        doc.removeEventListener("pointerup", up);
        doc.removeEventListener("pointercancel", cancel);
      },
    };
  }

  // A browser that starts panning cancels the pointer, so veto the pan whenever the sheet owns the touch.
  // React attaches touchmove passively; this has to be a native, cancelable listener.
  useEffect(() => {
    if (!popup) return;
    const guard = (event: TouchEvent) => {
      const active = gesture.current;
      if (!active || !event.cancelable) return;
      const touch = event.touches[0];
      if (touch) resolve(active, touch.clientX, touch.clientY, true);
      if (active.state === "dragging") event.preventDefault();
    };
    popup.addEventListener("touchmove", guard, { passive: false });
    return () => popup.removeEventListener("touchmove", guard);
  });

  function handleKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!detents) return;
    const last = detents.length - 1;
    const grow = side === "left" ? "ArrowRight" : "ArrowLeft";
    const shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
    const next =
      event.key === "ArrowUp" || (!vertical && event.key === grow)
        ? Math.min(last, detent + 1)
        : event.key === "ArrowDown" || (!vertical && event.key === shrink)
          ? Math.max(0, detent - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : event.key === "Enter" || event.key === " "
                ? (detent + 1) % detents.length
                : null;
    if (next === null) return;
    event.preventDefault();
    if (next !== detent) sheet.requestDetent(next);
  }

  const percent = (value: number) => Math.round(value * 100);
  const resizable = detents !== null && detents.length > 1;
  const size = detents
    ? vertical
      ? { height: `calc((100dvh - var(--sheet-gap, 2.5rem)) * ${largest})` }
      : { width: `calc((100vw - var(--sheet-gap, 2.5rem)) * ${largest})` }
    : undefined;

  return (
    <DialogPrimitive.Portal keepMounted>
      <DialogPrimitive.Backdrop
        data-slot="sheet-backdrop"
        hidden={false}
        // A fading scrim lets presses through, so the page is usable while the sheet finishes leaving.
        style={{ pointerEvents: open ? undefined : "none" }}
        className="bg-background/60 fixed inset-0 z-50"
        render={<motion.div style={{ opacity: scrim }} />}
      />
      <DialogPrimitive.Viewport
        data-slot="sheet-viewport"
        hidden={false}
        className="fixed inset-0 z-50 overflow-hidden"
      >
        <DialogPrimitive.Popup
          ref={(node: HTMLDivElement | null) => {
            popupRef.current = node;
            setPopup(node);
          }}
          data-slot="sheet-content"
          data-side={side}
          data-state={open ? "open" : "closed"}
          data-detent={detents ? detent : undefined}
          hidden={false}
          aria-hidden={open ? undefined : true}
          initialFocus={initialFocus ?? popupRef}
          onPointerDown={press}
          // Base UI stops pointer events on a closing dialog; the sheet keeps them so it can be caught on its way out.
          className={`text-foreground border-border pointer-events-auto absolute flex flex-col border shadow-lg outline-none after:pointer-events-none after:absolute after:border-inherit after:bg-inherit data-dragging:cursor-grabbing data-dragging:select-none ${MATERIAL} ${SIDES[side].popup} ${detents ? "" : SIDES[side].fit} ${className ?? ""}`}
          render={
            <motion.div
              style={{
                ...size,
                ...(vertical ? { y: translate } : { x: translate }),
                opacity: fade,
              }}
            />
          }
        >
          <motion.div
            data-slot="sheet-frame"
            // Side sheets have no handle row above the header, so the frame supplies the top spacing.
            className={`flex min-h-0 min-w-0 flex-1 flex-col ${vertical ? (resizable ? "" : "pb-[env(safe-area-inset-bottom)]") : "pt-5"}`}
            style={
              resizable
                ? vertical
                  ? { paddingBottom: inset }
                  : side === "right"
                    ? { paddingRight: inset }
                    : { paddingLeft: inset }
                : undefined
            }
          >
            {showHandle && (
              <div
                data-slot="sheet-handle"
                {...(detents && detents.length > 1
                  ? {
                      role: "slider",
                      tabIndex: 0,
                      "aria-label": handleLabel,
                      "aria-orientation": vertical ? "vertical" : "horizontal",
                      "aria-valuemin": percent(smallest),
                      "aria-valuemax": percent(largest),
                      "aria-valuenow": percent(detents[detent]),
                      "aria-valuetext": `${percent(detents[detent])}%`,
                      onKeyDown: handleKey,
                      // A press that never became a drag steps to the next detent, wrapping at the largest.
                      onClick: () => sheet.requestDetent((detent + 1) % detents.length),
                    }
                  : { "aria-hidden": true })}
                className={`group/handle flex cursor-grab touch-none items-center justify-center outline-none ${SIDES[side].handle}`}
              >
                <span
                  className={`bg-muted-foreground/40 group-hover/handle:bg-muted-foreground/60 group-focus-visible/handle:ring-ring/50 group-active/handle:bg-muted-foreground/80 contrast-more:bg-foreground rounded-full transition-[scale,background-color] duration-150 ease-out group-focus-visible/handle:ring-3 ${SIDES[side].pill}`}
                />
              </div>
            )}
            {children}
          </motion.div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      data-slot="sheet-header"
      className={`grid shrink-0 gap-1.5 px-6 pt-1 pb-4 text-left ${className ?? ""}`}
    />
  );
}

/** The scrolling region. It gives a drag to the sheet only when it rests at its start. */
export function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      data-slot="sheet-body"
      className={`min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-6 ${className ?? ""}`}
    />
  );
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      data-slot="sheet-footer"
      className={`flex shrink-0 flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end ${className ?? ""}`}
    />
  );
}

export type SheetTitleProps = Omit<ComponentProps<typeof DialogPrimitive.Title>, "className"> & {
  className?: string;
};

export function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <DialogPrimitive.Title
      {...props}
      data-slot="sheet-title"
      className={`text-lg leading-6 font-semibold tracking-tight ${className ?? ""}`}
    />
  );
}

export type SheetDescriptionProps = Omit<ComponentProps<typeof DialogPrimitive.Description>, "className"> & {
  className?: string;
};

export function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <DialogPrimitive.Description
      {...props}
      data-slot="sheet-description"
      className={`text-muted-foreground text-sm leading-relaxed ${className ?? ""}`}
    />
  );
}
