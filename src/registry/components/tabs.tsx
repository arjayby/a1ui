"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import {
  animate,
  LayoutGroup,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

type TabsVariant = "pill" | "underline";

// One highlight follows the pointer. `at` is the tab it sits on, `on` is false while it fades out
// after the pointer leaves the list, and `glide` is true when it arrived from another visible spot.
type Hover = { at: string | null; on: boolean; glide: boolean };

const NO_HOVER: Hover = { at: null, on: false, glide: false };

type Rect = { left: number; top: number; width: number; height: number };
/** Where each trigger sits inside the list, or null before the first measurement. */
type Rects = Record<string, Rect> | null;

type TabsContextValue = {
  value: string | null;
  hover: Hover;
  enterTab: (value: string) => void;
  leaveList: () => void;
  clearHover: () => void;
  variant: TabsVariant;
  rects: Rects;
  setRects: Dispatch<SetStateAction<Rects>>;
  /** The tab under the pill while it is being dragged. */
  dragOver: string | null;
  setDragOver: (value: string | null) => void;
  /** Spring response in seconds for the indicator and the panels. */
  visualDuration: number;
  /** The hover highlight keeps up with the pointer, so it never travels slower than this. */
  hoverTransition: Transition;
  reducedMotion: boolean;
  /** True when the duration is zero. */
  instant: boolean;
};

// Triggers shrink the moment they are pressed and settle back without overshoot on release.
const PRESS: Transition = { type: "spring", visualDuration: 0.2, bounce: 0 };
// Reduced motion swaps travel for a short fade.
const FADE = 0.2;
// The pill follows the pointer only after it has clearly moved sideways, so a tap stays a tap.
const DRAG_THRESHOLD = 6;
// A flick throws the pill: its resting point is projected from the release velocity the way
// scrolling decelerates, and it lands on the tab nearest that point.
const DECELERATION = 0.99;
// Only a real flick earns a little overshoot when the pill lands.
const FLICK_SPEED = 400;

const INDICATOR_CLASS: Record<TabsVariant, string> = {
  pill: "bg-background ring-foreground/5 contrast-more:ring-foreground/60 pointer-events-none absolute -z-10 rounded-md shadow-sm ring-1",
  underline: "bg-primary pointer-events-none absolute bottom-0 -z-10 h-0.5 rounded-full",
};
// The underline bar sits this far inside its tab on each side.
const UNDERLINE_INSET = 4;

const TabsContext = createContext<TabsContextValue | null>(null);
// The trigger elements by value, so the list can measure them and the pill can be dropped on one.
const TriggersContext = createContext<RefObject<Map<string, HTMLElement>> | null>(null);
// Height of the panel on screen, so the next one can grow or shrink from it.
const PanelHeightContext = createContext<RefObject<number | null> | null>(null);

function useTabs(part: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${part} must be used within Tabs.`);
  return context;
}

export interface TabsProps {
  /** The selected tab when controlled by the caller. */
  value?: string;
  /** The initially selected tab when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `pill` slides a raised surface that can also be dragged; `underline` slides a bar under the active tab. */
  variant?: TabsVariant;
  /** Indicator travel and panel transition time in seconds. */
  duration?: number;
  className?: string;
  children?: ReactNode;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  variant = "pill",
  duration = 0.35,
  className,
  children,
}: TabsProps) {
  const id = useId();
  const reducedMotion = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null);
  const [hover, setHover] = useState<Hover>(NO_HOVER);
  const [rects, setRects] = useState<Rects>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const triggersRef = useRef(new Map<string, HTMLElement>());
  const panelHeightRef = useRef<number | null>(null);
  const current = value ?? internalValue;
  const visualDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const instant = visualDuration === 0;
  const hoverTransition: Transition = instant
    ? { duration: 0 }
    : reducedMotion
      ? { duration: 0, opacity: { duration: 0.15 } }
      : {
          type: "spring",
          visualDuration: Math.min(visualDuration, 0.25),
          bounce: 0,
          opacity: { duration: 0.15 },
        };

  return (
    <LayoutGroup id={id}>
      <TabsContext.Provider
        value={{
          value: current,
          hover,
          enterTab: (next) =>
            setHover((prev) =>
              prev.on && prev.at === next
                ? prev
                : { at: next, on: true, glide: prev.on && prev.at !== null && prev.at !== current },
            ),
          // Nothing is showing on the active tab, so there is no fade to wait for.
          leaveList: () =>
            setHover((prev) => (!prev.on ? prev : prev.at === current ? NO_HOVER : { ...prev, on: false })),
          clearHover: () => setHover((prev) => (prev.on ? prev : NO_HOVER)),
          variant,
          rects,
          setRects,
          dragOver,
          setDragOver,
          visualDuration,
          hoverTransition,
          reducedMotion,
          instant,
        }}
      >
        <TabsPrimitive.Root
          data-slot="tabs"
          data-variant={variant}
          value={current}
          onValueChange={(next: string) => {
            if (value === undefined) setInternalValue(next);
            onValueChange?.(next);
          }}
          // Relative so a leaving panel can be pinned in place while the next one takes its spot.
          className={`relative flex flex-col gap-3 ${className ?? ""}`}
        >
          <TriggersContext.Provider value={triggersRef}>
            <PanelHeightContext.Provider value={panelHeightRef}>{children}</PanelHeightContext.Provider>
          </TriggersContext.Provider>
        </TabsPrimitive.Root>
      </TabsContext.Provider>
    </LayoutGroup>
  );
}

type Stop = { value: string; element: HTMLElement; center: number; width: number };

type Drag = {
  pointerId: number;
  startX: number;
  /** False until the pointer passes the threshold; a press that never does is a plain tap. */
  active: boolean;
  /** Pointer position and pill center when the drag took hold, so the pill keeps its grab offset. */
  originX: number;
  originCenter: number;
  stops: Stop[];
  over: string | null;
  /** Recent pointer positions, for the release velocity. */
  samples: { x: number; time: number }[];
};

type Handoff = { velocity: number; bounce: number };

function nearestStop(stops: Stop[], center: number) {
  return stops.reduce((best, stop) =>
    Math.abs(stop.center - center) < Math.abs(best.center - center) ? stop : best,
  );
}

function sameRects(a: Rects, b: Record<string, Rect>) {
  if (!a) return false;
  const keys = Object.keys(b);
  return (
    keys.length === Object.keys(a).length &&
    keys.every((key) => {
      const [p, q] = [a[key], b[key]];
      return p && p.left === q.left && p.top === q.top && p.width === q.width && p.height === q.height;
    })
  );
}

export interface TabsListProps {
  /** Select a tab as soon as arrow keys move focus to it. */
  activateOnFocus?: boolean;
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

export function TabsList({ activateOnFocus = false, className, children, ...props }: TabsListProps) {
  const tabs = useTabs("TabsList");
  const triggersRef = useContext(TriggersContext);
  const listRef = useRef<HTMLDivElement>(null);
  const { value, rects, setRects, setDragOver, leaveList, visualDuration, instant, reducedMotion } = tabs;
  const pill = tabs.variant === "pill";
  const variantClass = pill ? "bg-muted h-9 rounded-lg p-[3px]" : "border-border h-10 gap-1 border-b";

  // One indicator lives in the list and is moved by springs. Retargeting a spring keeps its
  // velocity, so quick switches and a release mid-drag flow on instead of restarting.
  const active = value !== null ? rects?.[value] : undefined;
  const inset = pill ? 0 : UNDERLINE_INSET;
  const targetCenter = active ? active.left + active.width / 2 : null;
  const targetWidth = active ? active.width - inset * 2 : null;
  const center = useMotionValue(0);
  const width = useMotionValue(0);
  const opacity = useMotionValue(1);
  const x = useTransform(() => center.get() - width.get() / 2);
  const [pressed, setPressed] = useState(false);

  const dragRef = useRef<Drag | null>(null);
  const handoffRef = useRef<Handoff | null>(null);
  const targetRef = useRef<{ center: number; width: number } | null>(null);
  const placedRef = useRef<string | null | undefined>(undefined);
  const moveRef = useRef(0);

  // Measure after layout and whenever the list or a trigger resizes (fonts, wrapping, new labels).
  useEffect(() => {
    const list = listRef.current;
    if (!list || !triggersRef || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const next: Record<string, Rect> = {};
      for (const [key, element] of triggersRef.current) {
        next[key] = {
          left: element.offsetLeft,
          top: element.offsetTop,
          width: element.offsetWidth,
          height: element.offsetHeight,
        };
      }
      setRects((prev) => (sameRects(prev, next) ? prev : next));
    });
    observer.observe(list);
    for (const element of triggersRef.current.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [triggersRef, setRects]);

  const moveTo = useCallback(
    (nextCenter: number, nextWidth: number, how: "jump" | "travel", handoff?: Handoff) => {
      const move = ++moveRef.current;
      // After a drag the pill is already under the pointer, so reduced motion just seats it.
      if (how === "jump" || instant || (reducedMotion && handoff)) {
        center.jump(nextCenter);
        width.jump(nextWidth);
        opacity.jump(1);
        return;
      }
      if (reducedMotion) {
        // No travel: fade out where it was and back in on the new tab.
        animate(opacity, 0, { duration: FADE / 2 }).then(() => {
          if (moveRef.current !== move) return;
          center.jump(nextCenter);
          width.jump(nextWidth);
          animate(opacity, 1, { duration: FADE / 2 });
        });
        return;
      }
      opacity.jump(1);
      animate(center, nextCenter, {
        type: "spring",
        visualDuration,
        bounce: handoff?.bounce ?? 0,
        ...(handoff ? { velocity: handoff.velocity } : null),
      });
      animate(width, nextWidth, { type: "spring", visualDuration, bounce: 0 });
    },
    [center, width, opacity, visualDuration, instant, reducedMotion],
  );

  useLayoutEffect(() => {
    if (targetCenter === null || targetWidth === null) return;
    targetRef.current = { center: targetCenter, width: targetWidth };
    // While the pill is held, the pointer owns it.
    if (dragRef.current?.active) return;
    const handoff = handoffRef.current;
    handoffRef.current = null;
    // Travel only for a change of tab; the first placement and a resize put it straight in place.
    const changed = placedRef.current !== undefined && placedRef.current !== value;
    placedRef.current = value;
    moveTo(targetCenter, targetWidth, changed || handoff ? "travel" : "jump", handoff ?? undefined);
  }, [targetCenter, targetWidth, value, moveTo]);

  const endPress = () => {
    dragRef.current = null;
    setPressed(false);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!pill || event.button !== 0 || value === null || !triggersRef) return;
    const trigger = triggersRef.current.get(value);
    if (!trigger || !(event.target instanceof Node) || !trigger.contains(event.target)) return;
    setPressed(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      active: false,
      originX: 0,
      originCenter: 0,
      stops: [],
      over: value,
      samples: [],
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !triggersRef) return;
    if (!drag.active) {
      if (Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD) return;
      const stops = [...triggersRef.current]
        .filter(([, element]) => !element.matches(":disabled, [aria-disabled='true'], [data-disabled]"))
        .map(([key, element]) => ({
          value: key,
          element,
          center: element.offsetLeft + element.offsetWidth / 2,
          width: element.offsetWidth,
        }))
        .sort((a, b) => a.center - b.center);
      if (stops.length < 2) return endPress();
      // Take hold from wherever the pill is right now, even mid-flight, and keep the pointer on
      // the list so tracking continues outside it.
      center.stop();
      width.stop();
      drag.active = true;
      drag.originX = event.clientX;
      drag.originCenter = center.get();
      drag.stops = stops;
      event.currentTarget.setPointerCapture(event.pointerId);
      leaveList();
    }
    const { stops } = drag;
    const next = Math.min(
      Math.max(drag.originCenter + event.clientX - drag.originX, stops[0].center),
      stops[stops.length - 1].center,
    );
    center.set(next);
    const over = nearestStop(stops, next);
    if (over.value !== drag.over) {
      drag.over = over.value;
      setDragOver(over.value);
      // The pill takes the shape of the tab it is over.
      if (reducedMotion || instant) width.jump(over.width);
      else animate(width, over.width, PRESS);
    }
    drag.samples.push({ x: event.clientX, time: event.timeStamp });
    while (event.timeStamp - drag.samples[0].time > 100) drag.samples.shift();
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    endPress();
    if (!drag.active) return;
    setDragOver(null);

    // Velocity over the last moments of the drag, or none if the pointer had come to rest.
    const [first, last] = [drag.samples[0], drag.samples[drag.samples.length - 1]];
    const moving = event.type === "pointerup" && last && event.timeStamp - last.time < 80;
    const velocity =
      moving && last.time > first.time ? ((last.x - first.x) / (last.time - first.time)) * 1000 : 0;
    const projected = center.get() + ((velocity / 1000) * DECELERATION) / (1 - DECELERATION);
    const target = nearestStop(drag.stops, projected);

    // Carry the release velocity into the settle so there is no seam between dragging and landing.
    handoffRef.current = { velocity, bounce: Math.abs(velocity) > FLICK_SPEED ? 0.15 : 0 };
    if (target.value !== value) target.element.click();
    // Selecting moves the pill from the layout effect. If the selection did not change (dropped on
    // the same tab, or a controlled parent declined), send it home from here.
    requestAnimationFrame(() => {
      const handoff = handoffRef.current;
      const home = targetRef.current;
      if (!handoff || !home) return;
      handoffRef.current = null;
      moveTo(home.center, home.width, "travel", handoff);
    });
  };

  return (
    <TabsPrimitive.List
      {...props}
      ref={listRef}
      data-slot="tabs-list"
      activateOnFocus={activateOnFocus}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={() => {
        leaveList();
        if (dragRef.current && !dragRef.current.active) endPress();
      }}
      // The list can scroll sideways; this keeps the traveling hover highlight measured correctly.
      render={<motion.div layoutScroll />}
      className={`text-muted-foreground relative isolate inline-flex w-fit items-center ${variantClass} ${className ?? ""}`}
    >
      {children}
      {active && (
        <motion.span
          aria-hidden="true"
          data-slot="tabs-indicator"
          initial={false}
          // Pressing the active tab presses the pill itself.
          animate={{ scale: pressed && !instant && !reducedMotion ? 0.97 : 1 }}
          transition={PRESS}
          style={{ x, width, opacity, ...(pill ? { top: active.top, height: active.height } : null) }}
          className={`left-0 ${INDICATOR_CLASS[tabs.variant]}`}
        />
      )}
    </TabsPrimitive.List>
  );
}

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function TabsTrigger({ value, disabled, className, children }: TabsTriggerProps) {
  const tabs = useTabs("TabsTrigger");
  const triggersRef = useContext(TriggersContext);
  const active = tabs.value === value;
  const hoverHere = tabs.hover.at === value;
  const hoverVisible = hoverHere && tabs.hover.on && !active;
  const pill = tabs.variant === "pill";
  // While the pill is dragged, the label under it reads as selected.
  const lit = tabs.dragOver !== null ? tabs.dragOver === value : active;

  const register = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !triggersRef) return;
      const triggers = triggersRef.current;
      triggers.set(value, element);
      return () => {
        triggers.delete(value);
      };
    },
    [triggersRef, value],
  );

  return (
    <TabsPrimitive.Tab
      ref={register}
      value={value}
      disabled={disabled}
      data-slot="tabs-trigger"
      data-lit={lit ? "" : undefined}
      onPointerEnter={(event) => {
        // Touch has no hover; a highlight there would stick after the tap.
        if (event.pointerType !== "touch") tabs.enterTab(value);
      }}
      render={
        <motion.button
          whileTap={tabs.instant || tabs.reducedMotion ? undefined : { scale: 0.97 }}
          transition={PRESS}
        />
      }
      // The active pill can be dragged sideways, so a touch that starts on it only scrolls the page vertically.
      className={`data-lit:text-foreground hover:text-foreground focus-visible:ring-ring/30 relative inline-flex h-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${pill ? "data-active:touch-pan-y" : ""} ${className ?? ""}`}
    >
      {/* Stays mounted (faded out) on the active tab and while leaving the list, so the highlight
          glides on from where it was instead of blinking out and back in. */}
      {hoverHere && (
        <motion.span
          aria-hidden="true"
          data-slot="tabs-hover"
          data-visible={hoverVisible ? "" : undefined}
          layoutId="tabs-hover"
          // One highlight travels between tabs; crossfading two copies would dim it on every hop.
          layoutCrossfade={false}
          initial={tabs.hover.glide ? false : { opacity: 0 }}
          animate={{ opacity: hoverVisible ? 1 : 0 }}
          transition={tabs.hoverTransition}
          onAnimationComplete={tabs.clearHover}
          className={`pointer-events-none absolute -z-20 rounded-md ${pill ? "bg-background/50 inset-0" : "bg-muted inset-x-0 inset-y-1.5"}`}
        />
      )}
      {/* Stands in for the list's indicator until the triggers are measured, so the selected tab is
          marked in server-rendered HTML. */}
      {active && !tabs.rects && (
        <span
          aria-hidden="true"
          data-slot="tabs-indicator"
          className={`${pill ? "inset-0" : "inset-x-1"} ${INDICATOR_CLASS[tabs.variant]}`}
        />
      )}
      {children}
    </TabsPrimitive.Tab>
  );
}

export interface TabsContentProps {
  value: string;
  className?: string;
  children?: ReactNode;
}

// The new panel fades in while the old one fades out in half the time, so the two never read as a
// muddle. Motion preferences are handled in CSS rather than in React, so server-rendered markup is
// already right: reduced motion keeps this short cross-fade and drops the travel below.
const PANEL_FADE =
  "transition-[opacity,translate,filter] duration-(--tabs-panel-duration) ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:opacity-0 data-ending-style:pointer-events-none data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--tabs-panel-duration)/2)] motion-reduce:duration-200 motion-reduce:data-ending-style:duration-100";
// The new panel arrives from the side you moved toward and the old one leaves the opposite way,
// so going back retraces the same path.
const PANEL_TRAVEL =
  "motion-safe:data-starting-style:blur-[2px] motion-safe:data-ending-style:blur-[2px] motion-safe:data-[activation-direction=right]:data-starting-style:translate-x-3 motion-safe:data-[activation-direction=left]:data-starting-style:-translate-x-3 motion-safe:data-[activation-direction=right]:data-ending-style:-translate-x-3 motion-safe:data-[activation-direction=left]:data-ending-style:translate-x-3";

export function TabsContent({ value, className, children }: TabsContentProps) {
  const tabs = useTabs("TabsContent");
  const ref = useRef<HTMLDivElement>(null);
  const boxRef = useRef<{ top: number; left: number; width: number } | null>(null);
  const panelHeightRef = useContext(PanelHeightContext);
  const active = tabs.value === value;
  const { visualDuration } = tabs;
  const { instant } = tabs;
  // Reduced motion keeps the cross-fade and drops the resize.
  const resize = !instant && !tabs.reducedMotion;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !panelHeightRef) return;

    if (!active) {
      // Still on screen while it fades out: hold it where it was, out of flow, so the next panel
      // takes its place underneath instead of being pushed down.
      const box = boxRef.current;
      if (!box || instant) return;
      element.style.position = "absolute";
      element.style.top = `${box.top}px`;
      element.style.left = `${box.left}px`;
      element.style.width = `${box.width}px`;
      return () => {
        element.style.position = "";
        element.style.top = "";
        element.style.left = "";
        element.style.width = "";
      };
    }

    const record = () => {
      if (element.offsetHeight === 0) return;
      panelHeightRef.current = element.offsetHeight;
      boxRef.current = { top: element.offsetTop, left: element.offsetLeft, width: element.offsetWidth };
    };

    // Grow or shrink from the previous panel's height so whatever sits below the tabs moves smoothly.
    const from = panelHeightRef.current;
    const to = element.offsetHeight;
    record();

    let controls: ReturnType<typeof animate> | undefined;
    if (resize && from !== null && to > 0 && Math.abs(from - to) > 1) {
      element.style.overflow = "hidden";
      element.style.height = `${from}px`;
      // Animate a plain number rather than the element, so nothing keeps writing a height after
      // the animation ends.
      controls = animate(from, to, {
        type: "spring",
        visualDuration,
        bounce: 0,
        onUpdate: (height) => {
          element.style.height = `${height}px`;
        },
        onComplete: () => {
          // Let the panel resize with its content again.
          element.style.height = "";
          element.style.overflow = "";
        },
      });
    }

    // Track the box as it changes, including mid-animation, so an interrupting panel starts from
    // what is on screen.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(record);
    observer?.observe(element);

    return () => {
      observer?.disconnect();
      controls?.stop();
      element.style.height = "";
      element.style.overflow = "";
    };
  }, [active, instant, resize, visualDuration, panelHeightRef]);

  return (
    <TabsPrimitive.Panel
      ref={ref}
      value={value}
      data-slot="tabs-content"
      // A critically damped spring is visually done at its response time; the eased curve needs
      // about half as long again to look the same.
      style={{ "--tabs-panel-duration": `${Math.round(visualDuration * 1500)}ms` } as CSSProperties}
      className={`focus-visible:ring-ring/30 rounded-md outline-none focus-visible:ring-3 ${
        instant ? "data-ending-style:hidden" : `${PANEL_FADE} ${PANEL_TRAVEL}`
      } ${className ?? ""}`}
    >
      {children}
    </TabsPrimitive.Panel>
  );
}
