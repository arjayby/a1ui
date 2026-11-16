"use client";

import {
  animate,
  AnimatePresence,
  motion,
  motionValue,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationOptions,
  type DOMKeyframesDefinition,
  type HTMLMotionProps,
  type MotionValue,
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
// Opacity and blur ride springs as well, so a fade that is turned around keeps its pace. Content
// arrives in step with the shell and leaves a little faster, so two labels never read at once.
const ENTER_SPRING = spring(0.35);
const EXIT_SPRING = spring(0.2);
/** The shell's own fade as it arrives and leaves. */
const FADE_SPRING = spring(0.3);
// A press lands at once and lets go a little slower.
const PRESS_SPRING = spring(0.15);
const RELEASE_SPRING = spring(0.3);
const PROGRESS_SPRING = spring(0.3);
const DRAW_SPRING = spring(0.4);
/** How far the pill travels to and from its edge, in pixels: its own height plus the inset. */
const TRAVEL = 56;

// The two loops that run while there is no value to show. Nothing can interrupt or retarget a
// loop, so these keep a set pace, and they animate `transform` alone so the compositor can run
// them while the main thread is busy with the work they stand for.
const SPIN: DOMKeyframesDefinition = { transform: ["rotate(0deg)", "rotate(360deg)"] };
const SPIN_LOOP: AnimationOptions = { duration: 1, ease: "linear", repeat: Infinity };
const SWEEP: DOMKeyframesDefinition = { transform: ["translateX(-100%)", "translateX(250%)"] };
const SWEEP_LOOP: AnimationOptions = { duration: 1.3, ease: "easeInOut", repeat: Infinity };

const CHECK = "M6.25 10.5 L8.9 13.1 L13.9 7.4";
const BANG = "M10 6 L10 10.75 M10 13.9 L10 14";
/** Circumference of the glyph's ring, which has a radius of 8. */
const RING = 2 * Math.PI * 8;

const clampValue = (value: number | undefined) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value as number))) : 0;

const subscribeNever = () => () => {};

const keyOf = (activity: Activity) => `${activity.id ?? ""}|${activity.status}|${activity.title}`;

/**
 * Runs a loop on an element for as long as `enabled` holds. It is started by hand because the
 * first layer mounts inside an `AnimatePresence` with `initial={false}`, which also holds back the
 * mount animation of everything inside that layer.
 */
function useLoop<T extends Element>(
  keyframes: DOMKeyframesDefinition,
  options: AnimationOptions,
  enabled: boolean,
) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    const controls = animate(element, keyframes, options);
    return () => controls.stop();
  }, [keyframes, options, enabled]);
  return ref;
}

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
  const [pressed, setPressed] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const activityKey = keyOf(activity);
  // The state the pill was last toggled in, so the check draws in once and not on every toggle.
  const [toggledIn, setToggledIn] = useState<string | null>(null);

  const busy = status === "running" || status === "progress";
  const value = clampValue(activity.value);

  // Progress as a fraction, shared by the ring and the bar so they fill as one. Each state of the
  // activity gets its own value: a new run starts at its own figure instead of unwinding from the
  // last one, and a layer on its way out keeps the figure it was showing.
  const [progress, setProgress] = useState(() => ({ key: activityKey, fraction: motionValue(value / 100) }));
  if (progress.key !== activityKey) setProgress({ key: activityKey, fraction: motionValue(value / 100) });
  const { fraction } = progress;
  useEffect(() => {
    if (reducedMotion) return fraction.jump(value / 100);
    if (fraction.get() === value / 100) return;
    // A figure that arrives mid-flight retargets the spring, which keeps the speed it has.
    const controls = animate(fraction, value / 100, PROGRESS_SPRING);
    return () => controls.stop();
  }, [fraction, value, reducedMotion]);

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
        progress={fraction}
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
      <Action
        key="dismiss"
        data-slot="activity-pill-dismiss"
        still={reducedMotion}
        onClick={() => act(onLeave)}
      >
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
        still={reducedMotion}
        onClick={() => act(onView)}
      >
        {labels.view}
      </Action>,
    );
  }
  if (busy && onCancel) {
    actions.push(
      <Action
        key="cancel"
        data-slot="activity-pill-cancel"
        still={reducedMotion}
        onClick={() => act(onCancel)}
      >
        {labels.cancel}
      </Action>,
    );
  }
  if (status === "error" && onRetry) {
    actions.push(
      <Action
        key="retry"
        data-slot="activity-pill-retry"
        primary
        still={reducedMotion}
        onClick={() => act(onRetry)}
      >
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
      className="border-border bg-popover/80 text-popover-foreground has-[[data-slot=activity-pill-toggle]:focus-visible]:ring-ring/30 data-[status=error]:border-destructive/40 contrast-more:border-foreground contrast-more:bg-popover [@media(prefers-reduced-transparency:reduce)]:bg-popover pointer-events-auto relative shrink-0 overflow-hidden rounded-[22px] border text-sm leading-5 font-medium shadow-lg backdrop-blur-xl backdrop-saturate-150 select-none has-[[data-slot=activity-pill-toggle]:focus-visible]:ring-3 contrast-more:backdrop-filter-none [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none"
      // In from the anchored edge, and back out the way it came. With reduced motion it fades in
      // place. The whole shell gives a little under a press, from the moment the pointer lands.
      initial={{ opacity: 0, y: reducedMotion ? 0 : (top ? -1 : 1) * TRAVEL }}
      animate={{ opacity: 1, y: 0, scale: pressed && !reducedMotion ? 0.97 : 1 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : (top ? -1 : 1) * TRAVEL }}
      transition={{
        ...MOVE_SPRING,
        opacity: FADE_SPRING,
        scale: pressed ? PRESS_SPRING : RELEASE_SPRING,
      }}
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
      <motion.button
        ref={toggleRef}
        type="button"
        data-slot="activity-pill-toggle"
        aria-label={title}
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        className="hover:bg-foreground/4 active:bg-foreground/8 absolute inset-0 cursor-pointer rounded-[inherit] outline-none"
        // Motion's press starts on pointer-down, or on Enter, and ends wherever the pointer lifts.
        onTapStart={() => setPressed(true)}
        onTap={() => setPressed(false)}
        onTapCancel={() => setPressed(false)}
        onKeyDown={(event) => {
          if (event.key === " ") setPressed(true);
        }}
        onKeyUp={() => setPressed(false)}
        onBlur={() => setPressed(false)}
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
                    <Track determinate={status === "progress"} progress={fraction} still={reducedMotion} />
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
      // Out the way it came in: the same fade and blur in both directions, each on a spring, so
      // a layer called back while it is leaving turns around from where it is.
      initial={away}
      animate={{
        ...(blur ? { opacity: 1, filter: "blur(0px)" } : { opacity: 1 }),
        transition: ENTER_SPRING,
      }}
      exit={{ ...away, transition: EXIT_SPRING }}
    >
      <div ref={ref} className="shrink-0">
        {children}
      </div>
    </motion.div>
  );
}

/** The expanded track: a fill that follows progress, or a sweep while there is no value yet. */
function Track({
  determinate,
  progress,
  still,
}: {
  determinate: boolean;
  progress: MotionValue<number>;
  still: boolean;
}) {
  // The fill is as wide as the track and slides in from the left, so only `transform` changes and
  // its leading end stays round.
  const x = useTransform(progress, (fraction) => `${(fraction - 1) * 100}%`);
  const sweep = useLoop<HTMLDivElement>(SWEEP, SWEEP_LOOP, !determinate && !still);

  return (
    <div
      aria-hidden="true"
      data-slot="activity-pill-track"
      className="bg-foreground/10 h-1 overflow-hidden rounded-full"
    >
      {determinate ? (
        <motion.div
          data-slot="activity-pill-fill"
          className="bg-foreground h-full rounded-full"
          style={{ x }}
        />
      ) : still ? (
        // Reduced motion holds a dimmed, full bar still.
        <div className="bg-foreground/50 h-full" />
      ) : (
        <div
          ref={sweep}
          className="bg-foreground h-full w-2/5 rounded-full"
          style={{ transform: "translateX(-100%)" }}
        />
      )}
    </div>
  );
}

function Action({
  primary,
  still,
  className,
  ...props
}: HTMLMotionProps<"button"> & { primary?: boolean; still: boolean }) {
  return (
    <motion.button
      type="button"
      className={`focus-visible:ring-ring/30 inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-[background-color] duration-200 ease-out outline-none focus-visible:ring-3 pointer-coarse:h-9 pointer-coarse:px-3.5 ${
        primary
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border hover:bg-muted border"
      } ${className ?? ""}`}
      // Feedback lands on pointer-down; the click still commits on release over the button.
      // Reduced motion dims the button instead of shrinking it.
      whileTap={{ ...(still ? { opacity: 0.7 } : { scale: 0.96 }), transition: PRESS_SPRING }}
      transition={RELEASE_SPRING}
      {...props}
    />
  );
}

/**
 * A ring that spins while running, fills with progress, and holds a check or a mark at the end.
 * With reduced motion the running arc holds still.
 */
function Glyph({
  status,
  progress,
  draw,
  still,
}: {
  status: ActivityStatus;
  progress: MotionValue<number>;
  draw: boolean;
  still: boolean;
}) {
  const spinner = useLoop<SVGSVGElement>(SPIN, SPIN_LOOP, status === "running" && !still);
  const offset = useTransform(progress, (fraction) => RING * (1 - fraction));

  return (
    <svg
      ref={spinner}
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
      }`}
    >
      <circle cx={10} cy={10} r={8} opacity={status === "error" ? 0.35 : 0.2} />
      {status === "running" && <circle cx={10} cy={10} r={8} pathLength={1} strokeDasharray="0.28 1" />}
      {status === "progress" && (
        <g transform="rotate(-90 10 10)">
          <motion.circle
            data-slot="activity-pill-ring"
            cx={10}
            cy={10}
            r={8}
            strokeDasharray={RING}
            strokeDashoffset={offset}
          />
        </g>
      )}
      {status === "success" && (
        <motion.path
          d={CHECK}
          initial={draw ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          // It starts a beat late, once the layer it sits in has begun to show.
          transition={{ ...DRAW_SPRING, delay: 0.1 }}
        />
      )}
      {status === "error" && <path d={BANG} />}
    </svg>
  );
}
