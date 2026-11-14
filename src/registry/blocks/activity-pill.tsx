"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ActivityStatus = "running" | "progress" | "success" | "error";

export interface Activity {
  /** Identifies one run. A new id always shows the pill again, even after a dismissal. */
  id?: string;
  status: ActivityStatus;
  /** The short label shown in the pill, such as "Deploying". */
  title: string;
  /** A longer line shown when the pill is expanded. */
  detail?: string;
  /** Progress from 0 to 100. Read when `status` is `"progress"`. */
  value?: number;
}

export interface ActivityPatch {
  /** When set, the call is ignored unless this is still the current activity. */
  id?: string;
  title?: string;
  detail?: string;
  /** A number switches to `"progress"`; `null` returns to indeterminate `"running"`. */
  value?: number | null;
}

export interface ActivityStart {
  title: string;
  detail?: string;
  /** Starts as `"progress"` when set, and as indeterminate `"running"` otherwise. */
  value?: number;
}

export interface ActivityController {
  get: () => Activity | null;
  subscribe: (listener: () => void) => () => void;
  /** Replaces whatever is showing with a new activity and returns its id. */
  start: (activity: string | ActivityStart) => string;
  /** Changes the running activity in place. Ignored once it has succeeded or failed. */
  update: (patch: ActivityPatch) => void;
  succeed: (patch?: string | ActivityPatch) => void;
  fail: (patch?: string | ActivityPatch) => void;
  /** Removes the activity, which hides the pill. */
  clear: () => void;
}

/** Creates a controller that can be driven from anywhere, including outside React. */
export function createActivityController(initial: Activity | null = null): ActivityController {
  let current = initial;
  let count = 0;
  const listeners = new Set<() => void>();
  const set = (next: Activity | null) => {
    current = next;
    listeners.forEach((listener) => listener());
  };
  const settle = (status: "success" | "error", input?: string | ActivityPatch) => {
    const patch = typeof input === "string" ? { title: input } : (input ?? {});
    if (patch.id !== undefined && patch.id !== current?.id) return;
    const title = patch.title ?? current?.title;
    if (title === undefined) return;
    const detail = patch.detail ?? current?.detail;
    set({ id: current?.id ?? `activity-${++count}`, status, title, detail });
  };

  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: (input) => {
      const { value, ...activity }: ActivityStart = typeof input === "string" ? { title: input } : input;
      const id = `activity-${++count}`;
      set({
        ...activity,
        id,
        ...(typeof value === "number" ? { status: "progress", value } : { status: "running" }),
      });
      return id;
    },
    update: ({ id, value, ...patch }) => {
      if (!current || (id !== undefined && id !== current.id)) return;
      if (current.status === "success" || current.status === "error") return;
      const next = { ...current, ...patch };
      if (typeof value === "number") set({ ...next, status: "progress", value });
      else if (value === null) set({ ...next, status: "running", value: undefined });
      else set(next);
    },
    succeed: (patch) => settle("success", patch),
    fail: (patch) => settle("error", patch),
    clear: () => set(null),
  };
}

/** Returns the current activity and the methods that change it. Pass a controller to share one. */
export function useActivity(controller?: ActivityController) {
  const [own] = useState(() => createActivityController());
  const source = controller ?? own;
  const activity = useSyncExternalStore(source.subscribe, source.get, source.get);
  return { ...source, activity };
}

export type ActivityPillPosition =
  "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export interface ActivityPillLabels {
  cancel: string;
  retry: string;
  view: string;
  dismiss: string;
  /** Accessible name of the expanded detail group. */
  details: string;
}

export interface ActivityPillProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** The one thing the system is doing. `null` hides the pill. */
  activity: Activity | null | undefined;
  /** Edge the pill is anchored to. It enters from, grows away from, and leaves by that edge. */
  position?: ActivityPillPosition;
  /** Positions the pill inside the nearest positioned ancestor instead of portaling it to the body and fixing it to the window. */
  contained?: boolean;
  /** Milliseconds a success stays before it leaves. `0` keeps it until dismissed. */
  successDuration?: number;
  /** Shows Cancel while the activity is running. */
  onCancel?: (activity: Activity) => void;
  /** Shows Retry after an error. */
  onRetry?: (activity: Activity) => void;
  /** Shows View in every state. */
  onView?: (activity: Activity) => void;
  /** Called when a success has lingered and left, or when the person dismisses the pill. */
  onDismiss?: (activity: Activity) => void;
  labels?: Partial<ActivityPillLabels>;
}

const defaultLabels: ActivityPillLabels = {
  cancel: "Cancel",
  retry: "Retry",
  view: "View",
  dismiss: "Dismiss",
  details: "Activity details",
};

/**
 * A critically damped spring: it settles without overshoot, in roughly `response` seconds. It is
 * defined by stiffness and damping, not by time, so retargeting it mid-flight keeps the live
 * velocity instead of restarting.
 */
const spring = (response: number) => ({
  type: "spring" as const,
  stiffness: ((2 * Math.PI) / response) ** 2,
  damping: (4 * Math.PI) / response,
});
const SIZE_SPRING = spring(0.35);
const MOVE_SPRING = spring(0.4);
/** How far the pill travels to and from its edge, in pixels: its own height plus the inset. */
const TRAVEL = 56;

const CHECK = "M6.25 10.5 L8.9 13.1 L13.9 7.4";
const BANG = "M10 6 L10 10.75 M10 13.9 L10 14";

const clampValue = (value: number | undefined) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value as number))) : 0;

const subscribeNever = () => () => {};

const keyOf = (activity: Activity) => `${activity.id ?? ""}|${activity.status}|${activity.title}`;

export function ActivityPill({
  activity,
  position = "top-center",
  contained = false,
  successDuration = 2500,
  onCancel,
  onRetry,
  onView,
  onDismiss,
  labels,
  className,
  ...props
}: ActivityPillProps) {
  const current = activity ?? null;
  const key = current ? keyOf(current) : null;
  // A success that has lingered, or a dismissed error, hides until the activity changes.
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (dismissed !== null && dismissed !== key) setDismissed(null);
  const shown = current !== null && dismissed !== key;

  // The body only exists on the client, so a portaled pill renders after hydration.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const top = position.startsWith("top");
  const justify = position.endsWith("left")
    ? "justify-start"
    : position.endsWith("right")
      ? "justify-end"
      : "justify-center";

  const root = (
    <div
      data-slot="activity-pill-root"
      data-position={position}
      className={`pointer-events-none inset-x-4 z-50 flex ${contained ? "absolute" : "fixed"} ${top ? "top-4" : "bottom-4"} ${justify} ${className ?? ""}`}
      {...props}
    >
      {/* Both live regions stay mounted so screen readers pick up the first change too. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {shown && current.status !== "error" ? current.title : ""}
      </div>
      <div role="alert" aria-atomic="true" className="sr-only">
        {shown && current.status === "error"
          ? [current.title, current.detail].filter(Boolean).join(". ")
          : ""}
      </div>
      <AnimatePresence>
        {shown && (
          <Pill
            key="pill"
            activity={current}
            top={top}
            align={`${justify} ${top ? "items-start" : "items-end"}`}
            successDuration={successDuration}
            labels={{ ...defaultLabels, ...labels }}
            onCancel={onCancel}
            onRetry={onRetry}
            onView={onView}
            onLeave={() => {
              setDismissed(key);
              onDismiss?.(current);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );

  if (contained) return root;
  return hydrated ? createPortal(root, document.body) : null;
}

function Pill({
  activity,
  top,
  align,
  successDuration,
  labels,
  onCancel,
  onRetry,
  onView,
  onLeave,
}: {
  activity: Activity;
  top: boolean;
  align: string;
  successDuration: number;
  labels: ActivityPillLabels;
  onCancel?: (activity: Activity) => void;
  onRetry?: (activity: Activity) => void;
  onView?: (activity: Activity) => void;
  onLeave: () => void;
}) {
  const { status, title, detail } = activity;
  const present = useIsPresent();
  const reducedMotion = useReducedMotion() ?? false;
  const panelId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const activityKey = keyOf(activity);
  // The state the pill was last toggled in, so the check draws in once and not on every toggle.
  const [toggledIn, setToggledIn] = useState<string | null>(null);

  const busy = status === "running" || status === "progress";
  const value = clampValue(activity.value);

  // One shell, two motion values, one spring. A new size retargets the spring from wherever the
  // shell is and however fast it is moving, so a state change mid-morph never restarts it.
  const width = useMotionValue(0);
  const height = useMotionValue(0);
  const size = useRef<{ width: number; height: number } | null>(null);
  const resize = useCallback(
    (content: HTMLElement) => {
      const shell = content.closest<HTMLElement>('[data-slot="activity-pill"]');
      if (!shell) return;
      const next = {
        width: content.offsetWidth + shell.offsetWidth - shell.clientWidth,
        height: content.offsetHeight + shell.offsetHeight - shell.clientHeight,
      };
      const previous = size.current;
      if (previous?.width === next.width && previous.height === next.height) return;
      size.current = next;
      if (!previous || reducedMotion) {
        width.jump(next.width);
        height.jump(next.height);
        return;
      }
      animate(width, next.width, SIZE_SPRING);
      animate(height, next.height, SIZE_SPRING);
    },
    [reducedMotion, width, height],
  );

  // The size is written straight to the shell. The first layer measures itself before this runs,
  // so applying the current values here lands the first size before the first paint.
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const apply = () => {
      shell.style.width = `${width.get()}px`;
      shell.style.height = `${height.get()}px`;
    };
    apply();
    const stopWidth = width.on("change", apply);
    const stopHeight = height.on("change", apply);
    return () => {
      stopWidth();
      stopHeight();
    };
  }, [width, height]);

  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  });

  // Success lingers, then leaves. The clock waits while the pointer or keyboard focus is on it.
  useEffect(() => {
    if (!present || status !== "success" || successDuration <= 0 || hovered || keyboardFocused) return;
    const timer = window.setTimeout(() => leave.current(), successDuration);
    return () => window.clearTimeout(timer);
  }, [present, status, activityKey, successDuration, hovered, keyboardFocused]);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && shellRef.current?.contains(event.target)) return;
      setExpanded(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // The actions are about to fade out, so focus returns to the pill itself.
      if (shellRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
      setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  const act = (handler: (activity: Activity) => void) => {
    handler(activity);
    // An action usually replaces the content it sits in. If that took focus with it, keep the
    // keyboard on the pill.
    window.requestAnimationFrame(() => {
      const active = document.activeElement;
      const shell = shellRef.current;
      if (!shell || shell.inert) return;
      if (active === document.body || (active && shell.contains(active) && active.closest("[inert]"))) {
        toggleRef.current?.focus({ preventScroll: true });
      }
    });
  };

  const header = (
    <div
      aria-hidden="true"
      className="flex h-10 items-center gap-2.5 pr-4 pl-3 whitespace-nowrap pointer-coarse:h-11"
    >
      <Glyph
        status={status}
        value={value}
        draw={!reducedMotion && toggledIn !== activityKey}
        still={reducedMotion}
      />
      <span data-slot="activity-pill-title" className="min-w-0 flex-1 truncate">
        {title}
      </span>
      {status === "progress" && (
        // The hidden "100%" reserves the widest value, so the label never shifts as digits change.
        <span
          data-slot="activity-pill-value"
          className="text-muted-foreground inline-grid justify-items-end tabular-nums"
        >
          <span className="invisible col-start-1 row-start-1">100%</span>
          <span className="col-start-1 row-start-1">{value}%</span>
        </span>
      )}
    </div>
  );

  const actions: ReactNode[] = [];
  if (!busy) {
    actions.push(
      <Action key="dismiss" data-slot="activity-pill-dismiss" onClick={() => act(onLeave)}>
        {labels.dismiss}
      </Action>,
    );
  }
  if (onView) {
    actions.push(
      <Action
        key="view"
        data-slot="activity-pill-view"
        primary={status === "success"}
        onClick={() => act(onView)}
      >
        {labels.view}
      </Action>,
    );
  }
  if (busy && onCancel) {
    actions.push(
      <Action key="cancel" data-slot="activity-pill-cancel" onClick={() => act(onCancel)}>
        {labels.cancel}
      </Action>,
    );
  }
  if (status === "error" && onRetry) {
    actions.push(
      <Action key="retry" data-slot="activity-pill-retry" primary onClick={() => act(onRetry)}>
        {labels.retry}
      </Action>,
    );
  }

  return (
    <motion.div
      ref={shellRef}
      data-slot="activity-pill"
      data-status={status}
      data-state={expanded ? "expanded" : "compact"}
      inert={!present}
      className="border-border bg-popover/80 text-popover-foreground has-[[data-slot=activity-pill-toggle]:focus-visible]:ring-ring/30 data-[status=error]:border-destructive/40 contrast-more:border-foreground contrast-more:bg-popover [@media(prefers-reduced-transparency:reduce)]:bg-popover pointer-events-auto relative shrink-0 overflow-hidden rounded-[22px] border text-sm leading-5 font-medium shadow-lg backdrop-blur-xl backdrop-saturate-150 transition-[scale] duration-200 ease-out select-none has-[[data-slot=activity-pill-toggle]:active]:scale-[0.97] has-[[data-slot=activity-pill-toggle]:active]:duration-75 has-[[data-slot=activity-pill-toggle]:focus-visible]:ring-3 motion-reduce:scale-100! motion-reduce:transition-none contrast-more:backdrop-filter-none [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none"
      // In from the anchored edge, and back out the way it came.
      initial={{ opacity: 0, y: reducedMotion ? 0 : (top ? -1 : 1) * TRAVEL }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : (top ? -1 : 1) * TRAVEL }}
      transition={
        reducedMotion ? { duration: 0.2 } : { ...MOVE_SPRING, opacity: { duration: 0.2, ease: "easeOut" } }
      }
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => {
        let visible = true;
        try {
          visible = event.target.matches(":focus-visible");
        } catch {
          // Engines without :focus-visible treat every focus as keyboard focus.
        }
        setKeyboardFocused(visible);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocused(false);
      }}
    >
      {/* The whole surface is one button. Content sits above it and lets presses through. */}
      <button
        ref={toggleRef}
        type="button"
        data-slot="activity-pill-toggle"
        aria-label={title}
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        className="hover:bg-foreground/4 active:bg-foreground/8 absolute inset-0 cursor-pointer rounded-[inherit] outline-none"
        onClick={() => {
          setExpanded((open) => !open);
          setToggledIn(activityKey);
        }}
      />
      {busy && (
        <div
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={status === "progress" ? value : undefined}
          aria-valuetext={status === "progress" ? `${value}%` : undefined}
          className="sr-only"
        />
      )}
      <AnimatePresence initial={false}>
        <Layer
          key={`${expanded ? "expanded" : "compact"}|${status}|${title}`}
          align={align}
          blur={!reducedMotion}
          onSize={resize}
        >
          {expanded ? (
            <div
              id={panelId}
              role="group"
              aria-label={labels.details}
              data-slot="activity-pill-panel"
              className="w-[min(18rem,calc(100vw-2rem))]"
            >
              {header}
              {(detail || busy || actions.length > 0) && (
                <div className="grid gap-3 px-3.5 pt-0.5 pb-3.5">
                  {detail && (
                    <p
                      data-slot="activity-pill-detail"
                      className="text-muted-foreground text-[0.8125rem] font-normal"
                    >
                      {detail}
                    </p>
                  )}
                  {busy && (
                    <div aria-hidden="true" className="bg-foreground/10 h-1 overflow-hidden rounded-full">
                      {status === "progress" ? (
                        <div
                          className="bg-foreground h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
                          style={{ width: `${value}%` }}
                        />
                      ) : reducedMotion ? (
                        <div className="bg-foreground/50 h-full animate-pulse" />
                      ) : (
                        <motion.div
                          className="bg-foreground h-full w-2/5 rounded-full"
                          animate={{ x: ["-100%", "250%"] }}
                          transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity }}
                        />
                      )}
                    </div>
                  )}
                  {actions.length > 0 && (
                    <div className="pointer-events-auto flex justify-end gap-2">{actions}</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div data-slot="activity-pill-compact" className="max-w-[min(22rem,calc(100vw-2rem))]">
              {header}
            </div>
          )}
        </Layer>
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * One state of the pill's content, laid out at its natural size from the first frame. The shell
 * reads that size and springs toward it while the layers cross-fade, so text is never squeezed or
 * reflowed by the morph. Layers hold to the anchored edge, so they stay still as the shell grows.
 */
function Layer({
  align,
  blur,
  onSize,
  children,
}: {
  align: string;
  blur: boolean;
  onSize: (content: HTMLElement) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const present = useIsPresent();

  useLayoutEffect(() => {
    const content = ref.current;
    if (!content || !present) return;
    onSize(content);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => onSize(content));
    observer.observe(content);
    return () => observer.disconnect();
  }, [present, onSize]);

  const away = blur ? { opacity: 0, filter: "blur(6px)" } : { opacity: 0 };

  return (
    <motion.div
      data-slot="activity-pill-layer"
      inert={!present}
      className={`pointer-events-none absolute inset-0 flex ${align}`}
      initial={away}
      animate={{
        ...(blur ? { opacity: 1, filter: "blur(0px)" } : { opacity: 1 }),
        transition: { duration: 0.24, delay: 0.04, ease: "easeOut" },
      }}
      exit={{ ...away, transition: { duration: 0.14, ease: "easeOut" } }}
    >
      <div ref={ref} className="shrink-0">
        {children}
      </div>
    </motion.div>
  );
}

function Action({
  primary,
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={`focus-visible:ring-ring/30 inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-[scale,background-color] duration-200 ease-out outline-none focus-visible:ring-3 active:scale-[0.96] active:duration-75 motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-70 pointer-coarse:h-9 pointer-coarse:px-3.5 ${
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border hover:bg-muted border"
      } ${className ?? ""}`}
      {...props}
    />
  );
}

/** A ring that spins while running, fills with progress, and holds a check or a mark at the end. */
function Glyph({
  status,
  value,
  draw,
  still,
}: {
  status: ActivityStatus;
  value: number;
  draw: boolean;
  still: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      data-slot="activity-pill-glyph"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-[18px] shrink-0 ${
        status === "error"
          ? "text-destructive"
          : status === "success"
            ? "text-[var(--status-success,#15803d)]"
            : ""
      } ${status === "running" ? (still ? "animate-pulse" : "animate-spin") : ""}`}
    >
      <circle cx={10} cy={10} r={8} opacity={status === "error" ? 0.35 : 0.2} />
      {status === "running" && <circle cx={10} cy={10} r={8} pathLength={1} strokeDasharray="0.28 1" />}
      {status === "progress" && (
        <circle
          cx={10}
          cy={10}
          r={8}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - value / 100}
          transform="rotate(-90 10 10)"
          className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
        />
      )}
      {status === "success" && (
        <motion.path
          d={CHECK}
          initial={draw ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: [0.65, 0, 0.35, 1] }}
        />
      )}
      {status === "error" && <path d={BANG} />}
    </svg>
  );
}
