"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Side = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
type Align = "start" | "center" | "end";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export interface TooltipContentProps {
  /** Preferred side of the trigger. Flips to stay in view. */
  side?: Side;
  /** Gap between the trigger and the tooltip, in pixels. */
  sideOffset?: number;
  align?: Align;
  alignOffset?: number;
  /** Shows a small arrow pointing at the trigger. */
  arrow?: boolean;
  /** Spring-out time in seconds. Defaults to the provider's duration. */
  duration?: number;
  className?: string;
  children?: ReactNode;
}

type Entry = { controlled: boolean; onOpenChange?: (open: boolean) => void };

type GroupContextValue = {
  handle: TooltipPrimitive.Handle<unknown>;
  setContent: (triggerId: string, content: TooltipContentProps | null) => void;
  register: (triggerId: string, entry: Entry) => () => void;
  sync: (triggerId: string, open: boolean) => void;
};

const GroupContext = createContext<GroupContextValue | null>(null);
const DurationContext = createContext(0.3);

type TooltipContextValue = { triggerId: string; disabled: boolean; group: GroupContextValue | null };
const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltip(part: string) {
  const context = useContext(TooltipContext);
  if (!context) throw new Error(`${part} must be used within Tooltip.`);
  return context;
}

function toSeconds(duration: number, reducedMotion: boolean | null) {
  if (reducedMotion) return 0;
  return Number.isFinite(duration) ? Math.max(0, duration) : 0.3;
}

export interface TooltipProviderProps {
  /** Hover time before the first tooltip opens, in milliseconds. */
  delay?: number;
  /** Time before a tooltip closes after the pointer leaves, in milliseconds. */
  closeDelay?: number;
  /** Window after a tooltip closes in which the next one opens instantly, in milliseconds. */
  timeout?: number;
  /** Glide and morph time in seconds, and the default spring-out time for every tooltip inside. */
  duration?: number;
  /** Shares one tooltip between every trigger inside so it glides from one to the next. */
  glide?: boolean;
  children?: ReactNode;
}

export function TooltipProvider({
  delay = 300,
  closeDelay = 0,
  timeout = 400,
  duration = 0.3,
  glide = true,
  children,
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider delay={delay} closeDelay={closeDelay} timeout={timeout}>
      <DurationContext.Provider value={duration}>
        {glide ? <TooltipGroup duration={duration}>{children}</TooltipGroup> : children}
      </DurationContext.Provider>
    </TooltipPrimitive.Provider>
  );
}

/**
 * One Base UI tooltip shared by every trigger in the group. Triggers are detached and linked by a
 * handle, so moving between them keeps the popup open and re-anchors it instead of reopening.
 */
function TooltipGroup({ duration, children }: { duration: number; children: ReactNode }) {
  const [handle] = useState(() => TooltipPrimitive.createHandle());
  const [contents, setContents] = useState<Record<string, TooltipContentProps>>({});
  const [active, setActive] = useState<{ open: boolean; triggerId: string | null }>({
    open: false,
    triggerId: null,
  });
  const entries = useRef(new Map<string, Entry>());

  const setContent = useCallback((triggerId: string, content: TooltipContentProps | null) => {
    setContents((current) => {
      if (content) return { ...current, [triggerId]: content };
      if (!(triggerId in current)) return current;
      const next = { ...current };
      delete next[triggerId];
      return next;
    });
  }, []);
  const register = useCallback((triggerId: string, entry: Entry) => {
    entries.current.set(triggerId, entry);
    return () => {
      entries.current.delete(triggerId);
    };
  }, []);
  const sync = useCallback((triggerId: string, open: boolean) => {
    setActive((current) => {
      if (open) return { open: true, triggerId };
      return current.triggerId === triggerId ? { ...current, open: false } : current;
    });
  }, []);
  const group = useMemo(() => ({ handle, setContent, register, sync }), [handle, setContent, register, sync]);

  const content = active.triggerId ? contents[active.triggerId] : undefined;

  return (
    <GroupContext.Provider value={group}>
      {children}
      <TooltipPrimitive.Root
        handle={handle}
        open={active.open && content !== undefined}
        triggerId={active.triggerId}
        onOpenChange={(open, details) => {
          const triggerId = (open ? details.trigger?.id : null) ?? active.triggerId;
          if (open && active.open && active.triggerId && active.triggerId !== triggerId) {
            entries.current.get(active.triggerId)?.onOpenChange?.(false);
          }
          const entry = triggerId ? entries.current.get(triggerId) : undefined;
          entry?.onOpenChange?.(open);
          // A controlled tooltip opens and closes when its `open` prop changes.
          if (!entry?.controlled) setActive({ open, triggerId });
        }}
      >
        {content && active.triggerId && (
          <TooltipSurface
            {...content}
            id={`${active.triggerId}-tooltip`}
            duration={content.duration ?? duration}
          />
        )}
      </TooltipPrimitive.Root>
    </GroupContext.Provider>
  );
}

export interface TooltipProps {
  /** Whether the tooltip is shown, when controlled by the caller. */
  open?: boolean;
  /** Whether the tooltip starts shown, when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Keeps the tooltip from opening. */
  disabled?: boolean;
  children?: ReactNode;
}

export function Tooltip(props: TooltipProps) {
  const group = useContext(GroupContext);
  return group ? <GroupedTooltip {...props} group={group} /> : <StandaloneTooltip {...props} />;
}

function StandaloneTooltip({ open, defaultOpen, onOpenChange, disabled = false, children }: TooltipProps) {
  const triggerId = useId();
  return (
    <TooltipPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => onOpenChange?.(next)}
      disabled={disabled}
    >
      <TooltipContext.Provider value={{ triggerId, disabled, group: null }}>
        {children}
      </TooltipContext.Provider>
    </TooltipPrimitive.Root>
  );
}

function GroupedTooltip({
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  group,
  children,
}: TooltipProps & { group: GroupContextValue }) {
  const triggerId = useId();
  const { register, sync } = group;
  const controlled = open !== undefined;
  const [initiallyOpen] = useState(defaultOpen);

  useEffect(
    () => register(triggerId, { controlled, onOpenChange }),
    [register, triggerId, controlled, onOpenChange],
  );
  useEffect(() => {
    if (open !== undefined) sync(triggerId, open && !disabled);
  }, [sync, triggerId, open, disabled]);
  useEffect(() => {
    if (initiallyOpen) sync(triggerId, true);
  }, [sync, triggerId, initiallyOpen]);

  return <TooltipContext.Provider value={{ triggerId, disabled, group }}>{children}</TooltipContext.Provider>;
}

export type TooltipTriggerProps = Omit<TooltipPrimitive.Trigger.Props, "handle" | "payload" | "id">;

export function TooltipTrigger({ disabled, ...props }: TooltipTriggerProps) {
  const tooltip = useTooltip("TooltipTrigger");
  const group = tooltip.group;

  return (
    <TooltipPrimitive.Trigger
      aria-describedby={`${tooltip.triggerId}-tooltip`}
      {...props}
      data-slot="tooltip-trigger"
      id={tooltip.triggerId}
      handle={group?.handle}
      // Base UI re-measures the shared popup, and animates its size, when the payload changes.
      payload={group ? tooltip.triggerId : undefined}
      disabled={disabled || (group !== null && tooltip.disabled)}
    />
  );
}

export function TooltipContent({
  side,
  sideOffset,
  align,
  alignOffset,
  arrow,
  duration,
  className,
  children,
}: TooltipContentProps) {
  const { triggerId, group } = useTooltip("TooltipContent");
  const groupDuration = useContext(DurationContext);
  const setContent = group?.setContent;

  // Inside a gliding provider the shared tooltip renders this content when its trigger is active.
  useEffect(() => {
    setContent?.(triggerId, { side, sideOffset, align, alignOffset, arrow, duration, className, children });
  }, [setContent, triggerId, side, sideOffset, align, alignOffset, arrow, duration, className, children]);
  useEffect(() => () => setContent?.(triggerId, null), [setContent, triggerId]);

  if (group) return null;

  return (
    <TooltipSurface
      id={`${triggerId}-tooltip`}
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      arrow={arrow}
      duration={duration ?? groupDuration}
      className={className}
    >
      {children}
    </TooltipSurface>
  );
}

// The popup starts nudged toward its trigger and springs outward.
function nudge(side: Side) {
  const distance = 5;
  return {
    x:
      side === "left" || side === "inline-start"
        ? distance
        : side === "right" || side === "inline-end"
          ? -distance
          : 0,
    y: side === "top" ? distance : side === "bottom" ? -distance : 0,
  };
}

function TooltipSurface({
  id,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  arrow = true,
  duration = 0.3,
  className,
  children,
}: TooltipContentProps & { id: string }) {
  const reducedMotion = useReducedMotion();
  const seconds = toSeconds(duration, reducedMotion);

  return (
    <TooltipPrimitive.Portal>
      {/* Position and size glide with CSS transitions on the values Base UI writes when the
          shared tooltip re-anchors; data-instant turns them off for the first placement. */}
      <TooltipPrimitive.Positioner
        data-slot="tooltip-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={8}
        style={{ "--tooltip-duration": `${seconds}s`, "--tooltip-ease": EASE } as CSSProperties}
        className="z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-(--tooltip-duration) ease-(--tooltip-ease) data-instant:transition-none"
      >
        <TooltipPrimitive.Popup
          id={id}
          role="tooltip"
          data-slot="tooltip-content"
          className={`bg-foreground text-background relative h-(--popup-height,auto) w-(--popup-width,auto) max-w-[min(20rem,var(--available-width))] origin-(--transform-origin) rounded-md text-xs font-medium shadow-md transition-[width,height] duration-(--tooltip-duration) ease-(--tooltip-ease) outline-none data-instant:transition-none ${className ?? ""}`}
          render={(props, state) => {
            const hidden = { opacity: 0, scale: 0.88, ...nudge(state.side) };
            const instant = seconds === 0 || state.instant === "dismiss";
            return (
              <motion.div
                {...(props as HTMLMotionProps<"div">)}
                initial={seconds === 0 ? false : hidden}
                animate={state.open ? { opacity: 1, scale: 1, x: 0, y: 0 } : hidden}
                transition={
                  instant
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        visualDuration: seconds,
                        bounce: 0.3,
                        opacity: { duration: seconds * (state.open ? 0.5 : 0.7), ease: "easeOut" },
                      }
                }
              />
            );
          }}
        >
          {arrow && (
            <TooltipPrimitive.Arrow
              data-slot="tooltip-arrow"
              className="bg-foreground absolute size-2.5 rotate-45 rounded-[2px] transition-[left,top] duration-(--tooltip-duration) ease-(--tooltip-ease) data-instant:transition-none data-[side=bottom]:-top-1 data-[side=inline-end]:-left-1 data-[side=inline-start]:-right-1 data-[side=left]:-right-1 data-[side=right]:-left-1 data-[side=top]:-bottom-1"
            />
          )}
          {/* The viewport keeps the outgoing text while the new text slides in from the side the
              pointer came from, and Base UI animates the popup's width and height between them. */}
          <TooltipPrimitive.Viewport
            data-slot="tooltip-viewport"
            className="relative h-full w-full overflow-clip px-2.5 py-1.5 [--tooltip-pad:--spacing(2.5)] data-instant:[&>*]:transition-none [&>[data-current]]:w-[calc(var(--popup-width)-2*var(--tooltip-pad))] [&>[data-current]]:transition-[translate,opacity,filter] [&>[data-current]]:duration-(--tooltip-duration) [&>[data-current]]:ease-(--tooltip-ease) [&>[data-current][data-starting-style]]:opacity-0 [&>[data-current][data-starting-style]]:blur-[2px] data-[activation-direction~=down]:[&>[data-current][data-starting-style]]:translate-y-2 data-[activation-direction~=left]:[&>[data-current][data-starting-style]]:-translate-x-3 data-[activation-direction~=right]:[&>[data-current][data-starting-style]]:translate-x-3 data-[activation-direction~=up]:[&>[data-current][data-starting-style]]:-translate-y-2 [&>[data-previous]]:w-[calc(var(--popup-width)-2*var(--tooltip-pad))] [&>[data-previous]]:transition-[translate,opacity,filter] [&>[data-previous]]:duration-(--tooltip-duration) [&>[data-previous]]:ease-(--tooltip-ease) [&>[data-previous][data-ending-style]]:opacity-0 [&>[data-previous][data-ending-style]]:blur-[2px] data-[activation-direction~=down]:[&>[data-previous][data-ending-style]]:-translate-y-2 data-[activation-direction~=left]:[&>[data-previous][data-ending-style]]:translate-x-3 data-[activation-direction~=right]:[&>[data-previous][data-ending-style]]:-translate-x-3 data-[activation-direction~=up]:[&>[data-previous][data-ending-style]]:translate-y-2"
          >
            {children}
          </TooltipPrimitive.Viewport>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
