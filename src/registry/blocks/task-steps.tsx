"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  type MotionStyle,
  type Transition,
} from "motion/react";
import {
  memo,
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

export type TaskStepStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface TaskStep {
  /** Stable identity. Timing and the open state follow it across renders. */
  id: string;
  label: string;
  status: TaskStepStatus;
  /** Supporting text shown in the step's panel. */
  detail?: ReactNode;
  /** Log lines shown in the step's panel, oldest first. */
  logs?: string[];
  /** When the step started, in epoch milliseconds. Omit it and the block measures the step itself. */
  startedAt?: number;
  /** How long the step took, in milliseconds. Omit it and the block measures the step itself. */
  durationMs?: number;
}

export interface TaskStepsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  steps: TaskStep[];
  /** Names the list for assistive technology. */
  "aria-label"?: string;
  /** The word for each status, shown or read in every row and used in announcements. */
  statusLabels?: Partial<Record<TaskStepStatus, string>>;
  /** Formats a time. `running` is true while the step's clock is still ticking. */
  formatDuration?: (milliseconds: number, running: boolean) => string;
}

const STATUS_LABELS: Record<TaskStepStatus, string> = {
  pending: "Pending",
  running: "Running",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
};

const twoDigits = (value: number) => String(value).padStart(2, "0");

// A running clock counts whole seconds; a finished step under ten seconds keeps one decimal.
function defaultFormatDuration(milliseconds: number, running: boolean) {
  const total = Math.max(0, milliseconds);
  const tenths = Math.round(total / 100);
  if (!running && tenths < 100) return `${(tenths / 10).toFixed(1)}s`;
  const seconds = running ? Math.floor(total / 1000) : Math.round(total / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${twoDigits(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${twoDigits(minutes % 60)}m`;
}

// The reduced-motion preference is unknown on the server, so it applies only after hydration.
const subscribeNever = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

type Timing = { startedAt?: number; durationMs?: number };
type Announcement = { key: number; text: string };
type TrackerSnapshot = {
  timings: ReadonlyMap<string, Timing>;
  polite: Announcement;
  assertive: Announcement;
};

/**
 * Watches the statuses between renders. It stamps the moment a step starts and stops, and words
 * the announcement for each change. Every change in one render lands in one update, so a jump
 * across several steps is a single retarget and a single announcement.
 */
function createTracker() {
  let seen = new Map<string, TaskStepStatus>();
  let mounted = false;
  let snapshot: TrackerSnapshot = {
    timings: new Map(),
    polite: { key: 0, text: "" },
    assertive: { key: 0, text: "" },
  };
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    sync(steps: TaskStep[], describe: (step: TaskStep, durationMs: number | undefined) => string) {
      const now = Date.now();
      const timings = new Map(snapshot.timings);
      const polite: string[] = [];
      const assertive: string[] = [];
      const next = new Map<string, TaskStepStatus>();
      let timed = false;

      for (const step of steps) {
        next.set(step.id, step.status);
        const before = seen.get(step.id);
        if (before === step.status) continue;

        if (step.status === "running") {
          timings.set(step.id, { startedAt: now });
          timed = true;
        } else if (before === "running" && (step.status === "done" || step.status === "failed")) {
          const startedAt = step.startedAt ?? timings.get(step.id)?.startedAt;
          timings.set(step.id, startedAt === undefined ? {} : { durationMs: Math.max(0, now - startedAt) });
          timed = true;
        } else if (timings.delete(step.id)) {
          timed = true;
        }

        // Steps already under way on mount are not news.
        if (!mounted || step.status === "pending") continue;
        const finished = step.status === "done" || step.status === "failed";
        const durationMs = finished ? (step.durationMs ?? timings.get(step.id)?.durationMs) : undefined;
        (step.status === "failed" ? assertive : polite).push(describe(step, durationMs));
      }

      for (const id of timings.keys()) {
        if (!next.has(id)) {
          timings.delete(id);
          timed = true;
        }
      }
      seen = next;
      mounted = true;
      if (!timed && polite.length === 0 && assertive.length === 0) return;

      snapshot = {
        timings: timed ? timings : snapshot.timings,
        polite: polite.length ? { key: snapshot.polite.key + 1, text: polite.join(". ") } : snapshot.polite,
        assertive: assertive.length
          ? { key: snapshot.assertive.key + 1, text: assertive.join(". ") }
          : snapshot.assertive,
      };
      listeners.forEach((listener) => listener());
    },
  };
}

export function TaskSteps({
  steps,
  "aria-label": ariaLabel = "Task progress",
  "aria-labelledby": ariaLabelledBy,
  statusLabels,
  formatDuration = defaultFormatDuration,
  className,
  ...props
}: TaskStepsProps) {
  const hydrated = useHydrated();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = hydrated && prefersReducedMotion === true;
  const baseId = useId();
  const [tracker] = useState(createTracker);
  const { timings, polite, assertive } = useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getSnapshot,
  );
  // A person's choice to open or close a step holds until that step changes status.
  const [choices, setChoices] = useState<Record<string, { status: TaskStepStatus; open: boolean }>>({});

  // Before paint, so a step's clock and its row change in the same frame.
  useLayoutEffect(() => {
    tracker.sync(steps, (step, durationMs) => {
      const status = statusLabels?.[step.status] ?? STATUS_LABELS[step.status];
      const time = durationMs === undefined ? "" : `, ${formatDuration(durationMs, false)}`;
      return `${step.label}: ${status}${time}`;
    });
  }, [tracker, steps, statusLabels, formatDuration]);

  // The furthest step the job has reached. A skipped step before it was passed over; one after it never ran.
  const reached = steps.reduce(
    (last, { status }, index) => (status !== "pending" && status !== "skipped" ? index : last),
    -1,
  );

  return (
    <div data-slot="task-steps" className={`text-foreground w-full ${className ?? ""}`} {...props}>
      {/* Tailwind removes list markers, and Safari then drops the list role unless it is explicit. */}
      <ol
        role="list"
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="m-0 flex list-none flex-col p-0"
      >
        {steps.map((step, index) => {
          const choice = choices[step.id];
          // A running step shows its work, and a failed one keeps the reason on screen.
          const open =
            choice?.status === step.status
              ? choice.open
              : step.status === "running" || step.status === "failed";
          const timing = timings.get(step.id);

          return (
            <StepRow
              key={step.id}
              step={step}
              id={`${baseId}${index}`}
              last={index === steps.length - 1}
              passed={step.status === "done" || (step.status === "skipped" && index < reached)}
              open={open}
              onToggle={() =>
                setChoices((current) => ({ ...current, [step.id]: { status: step.status, open: !open } }))
              }
              startedAt={step.startedAt ?? timing?.startedAt}
              durationMs={step.durationMs ?? timing?.durationMs}
              statusLabel={statusLabels?.[step.status] ?? STATUS_LABELS[step.status]}
              formatDuration={formatDuration}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </ol>
      {/* A new node per message, so the same words are read again when a step is retried. */}
      <div role="status" aria-live="polite" data-slot="task-steps-status-message" className="sr-only">
        <span key={polite.key}>{polite.text}</span>
      </div>
      <div role="alert" data-slot="task-steps-alert-message" className="sr-only">
        <span key={assertive.key}>{assertive.text}</span>
      </div>
    </div>
  );
}

// Every part of a step moves on this one spring, so a change of status reads as a single change
// and anything caught mid-way carries on from where it is. Critically damped: nothing here is
// thrown, so nothing overshoots.
const SPRING: Transition = { type: "spring", visualDuration: 0.3, bounce: 0 };
// Reduced motion keeps opacity and colour, as a short cross-fade, and holds everything else still.
const FADE: Transition = { duration: 0.15, ease: "linear" };
const INSTANT: Transition = { duration: 0 };
const springFor = (reducedMotion: boolean) => (reducedMotion ? FADE : SPRING);

// How far a row dims while it is held.
const PRESSED = 0.7;

// The label and the clock mix their colour from a 0 to 1 custom property on the row. Motion springs
// the number and CSS turns it into a colour, so the text changes with the icon in any colour format.
const LABEL_INK =
  "text-[color-mix(in_oklab,var(--color-foreground)_calc(var(--task-steps-ink)*100%),var(--color-muted-foreground))]";
const CLOCK_INK =
  "text-[color-mix(in_oklab,var(--color-foreground)_calc(var(--task-steps-clock)*100%),var(--color-muted-foreground))]";

function StepRow({
  step,
  id,
  last,
  passed,
  open,
  onToggle,
  startedAt,
  durationMs,
  statusLabel,
  formatDuration,
  reducedMotion,
}: {
  step: TaskStep;
  id: string;
  last: boolean;
  /** The job has moved on from this step, so its connector is filled. */
  passed: boolean;
  open: boolean;
  onToggle: () => void;
  startedAt: number | undefined;
  durationMs: number | undefined;
  statusLabel: string;
  formatDuration: (milliseconds: number, running: boolean) => string;
  reducedMotion: boolean;
}) {
  const { status, label, detail, logs } = step;
  const hasLogs = Boolean(logs?.length);
  const hasDetail = detail !== undefined && detail !== null && detail !== false;
  const hasPanel = hasLogs || hasDetail;
  const quiet = status === "pending" || status === "skipped";
  // Failed and skipped rows say so in words; the other statuses are read out but not drawn.
  const worded = status === "failed" || status === "skipped";
  const transition = springFor(reducedMotion);
  // The button owns the press and the row shows it, so both are bound to this one value. It drops
  // the moment the pointer goes down, before the click lands, and springs back from wherever it is.
  const dim = useMotionValue(1);
  useEffect(() => {
    // A step that loses its detail while it is held has no button left to let go of it.
    if (!hasPanel) dim.jump(1);
  }, [hasPanel, dim]);
  const labelText = (
    <span data-slot="task-steps-label" className={`min-w-0 text-sm leading-5 ${LABEL_INK}`}>
      {label}
    </span>
  );

  return (
    <li
      data-slot="task-steps-step"
      data-status={status}
      aria-current={status === "running" ? "step" : undefined}
      className="relative pb-2 last:pb-0"
    >
      {!last && (
        <span
          aria-hidden="true"
          data-slot="task-steps-connector"
          data-filled={passed ? "" : undefined}
          className="bg-border contrast-more:bg-muted-foreground absolute top-[1.875rem] -bottom-0.5 left-[1.0625rem] w-0.5 overflow-hidden rounded-full"
        >
          <motion.span
            data-slot="task-steps-connector-fill"
            className="bg-foreground absolute inset-0 origin-top rounded-full"
            initial={false}
            // The line reaches the next step once this one is behind it. It only fades under reduced motion.
            animate={
              passed
                ? { scaleY: 1, opacity: 1 }
                : { scaleY: reducedMotion ? 1 : 0, opacity: reducedMotion ? 0 : 1 }
            }
            transition={transition}
          />
        </span>
      )}
      <motion.div
        data-slot="task-steps-row"
        // The hover tint is a colour-only CSS transition. Everything else on the row is Motion's.
        className={`relative isolate flex items-start gap-3 rounded-md px-2 py-1.5 ${
          hasPanel ? "hover:bg-muted transition-[background-color] duration-150" : ""
        }`}
        style={{ opacity: dim }}
        initial={false}
        animate={{ "--task-steps-ink": quiet ? 0 : 1, "--task-steps-clock": status === "running" ? 1 : 0 }}
        transition={transition}
      >
        <StepIcon status={status} reducedMotion={reducedMotion} />
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-2">
          <span className="flex min-w-0 items-start gap-1.5">
            {hasPanel ? (
              <motion.button
                type="button"
                id={`${id}-trigger`}
                data-slot="task-steps-trigger"
                aria-expanded={open}
                aria-controls={`${id}-panel`}
                onClick={onToggle}
                style={{ "--task-steps-dim": dim } as MotionStyle}
                initial={false}
                animate={{ "--task-steps-dim": 1 }}
                whileTap={{ "--task-steps-dim": PRESSED, transition: INSTANT }}
                transition={transition}
                // The button's overlay makes the whole row the target and carries the focus ring. It
                // sits above the parts that fade, which would otherwise stack over it.
                className="focus-visible:after:ring-ring flex min-w-0 cursor-pointer items-start text-left outline-none after:absolute after:inset-0 after:z-1 after:rounded-md focus-visible:after:ring-2"
              >
                {labelText}
              </motion.button>
            ) : (
              labelText
            )}
            {/* The chevron arrives with a step's first detail and leaves the way it came. */}
            <AnimatePresence initial={false}>
              {hasPanel && (
                <motion.span
                  key="chevron"
                  aria-hidden="true"
                  className="text-muted-foreground flex h-5 shrink-0 items-center"
                  initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.5 }}
                  transition={transition}
                >
                  <motion.svg
                    data-slot="task-steps-chevron"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                    initial={false}
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={reducedMotion ? INSTANT : transition}
                  >
                    <path d="M6 4 L10 8 L6 12" />
                  </motion.svg>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          {/* One cell, so a word that replaces another cross-fades in place. */}
          <span className="grid">
            <AnimatePresence initial={false}>
              {worded && (
                <StatusWord key={status} failed={status === "failed"} transition={transition}>
                  {statusLabel}
                </StatusWord>
              )}
            </AnimatePresence>
          </span>
          {!worded && (
            <span data-slot="task-steps-status" className="sr-only">
              {statusLabel}
            </span>
          )}
        </div>
        <StepTime
          status={status}
          startedAt={startedAt}
          durationMs={durationMs}
          formatDuration={formatDuration}
          transition={transition}
        />
      </motion.div>
      {/* Detail can arrive after its row, with a step's first log line, and can be taken away again. */}
      <AnimatePresence initial={false}>
        {hasPanel && (
          <StepPanel key="panel" id={id} open={open} reducedMotion={reducedMotion}>
            {hasDetail && (
              <div data-slot="task-steps-detail" className="text-muted-foreground text-sm leading-5">
                {detail}
              </div>
            )}
            {hasLogs && <StepLog labelledBy={`${id}-trigger`} lines={logs ?? []} transition={transition} />}
          </StepPanel>
        )}
      </AnimatePresence>
    </li>
  );
}

// The drawn status word fades in and out on the step's spring. A word on its way out is no longer
// read: the row's current status is.
function StatusWord({
  failed,
  transition,
  children,
}: {
  failed: boolean;
  transition: Transition;
  children: ReactNode;
}) {
  const present = useIsPresent();

  return (
    <motion.span
      data-slot="task-steps-status"
      aria-hidden={present ? undefined : true}
      className={`col-start-1 row-start-1 text-xs leading-5 ${
        failed ? "text-destructive" : "text-muted-foreground"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
    >
      {children}
    </motion.span>
  );
}

/**
 * One icon that changes in place. The spinner's arc closes into a ring, the ring fills, and the
 * check or cross is drawn on top. Each part springs to its own target on the step's spring, so a
 * status that changes again mid-way just retargets from wherever the part is.
 */
function StepIcon({ status, reducedMotion }: { status: TaskStepStatus; reducedMotion: boolean }) {
  const filled = status === "done" || status === "failed";
  const transition = springFor(reducedMotion);
  // Marks are drawn in and retraced on the way out. Under reduced motion they only cross-fade.
  const mark = {
    initial: { pathLength: reducedMotion ? 1 : 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    exit: { pathLength: reducedMotion ? 1 : 0, opacity: 0 },
    transition,
  };
  // One disc per colour. They share a size, so done to failed is a cross-fade, and each keeps its
  // own colour while it leaves.
  const disc = (shown: boolean) => ({
    initial: false as const,
    animate: { scale: filled || reducedMotion ? 1 : 0.5, opacity: shown ? 1 : 0 },
    transition,
  });

  return (
    <span aria-hidden="true" data-slot="task-steps-icon" className="relative block size-5 shrink-0">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5 overflow-visible"
      >
        <motion.circle
          data-slot="task-steps-ring"
          cx={10}
          cy={10}
          r={7.25}
          className="stroke-muted-foreground contrast-more:stroke-foreground"
          initial={false}
          animate={{ opacity: filled ? 0 : status === "running" ? 0.25 : 0.5 }}
          transition={transition}
        />
        <motion.circle
          data-slot="task-steps-disc"
          cx={10}
          cy={10}
          r={8}
          className="fill-foreground"
          {...disc(status === "done")}
        />
        <motion.circle
          data-slot="task-steps-disc"
          cx={10}
          cy={10}
          r={8}
          className="fill-destructive"
          {...disc(status === "failed")}
        />
        <AnimatePresence initial={false}>
          {status === "running" && <StepSpinner key="spinner" reducedMotion={reducedMotion} />}
          {status === "done" && (
            <motion.path
              key="check"
              data-slot="task-steps-check"
              d="M6.25 10.4 8.9 13 13.75 7.4"
              strokeWidth={1.75}
              className="stroke-background"
              {...mark}
            />
          )}
          {status === "failed" && (
            <motion.path
              key="cross"
              data-slot="task-steps-cross"
              d="M7.25 7.25 12.75 12.75 M12.75 7.25 7.25 12.75"
              strokeWidth={1.75}
              className="stroke-background"
              {...mark}
            />
          )}
          {status === "skipped" && (
            <motion.path
              key="skip"
              data-slot="task-steps-skip"
              d="M6.75 10h6.5"
              className="stroke-muted-foreground contrast-more:stroke-foreground"
              {...mark}
            />
          )}
        </AnimatePresence>
      </svg>
    </span>
  );
}

/**
 * The running arc. It is drawn in when a step starts and closes into the ring when the step
 * stops, turning until it has gone. The turn is a loop started in an effect rather than an
 * `animate` prop: the icon skips animation on its first render, and a step that is already running
 * when the block mounts must still turn. Under reduced motion the arc holds still, and the step's
 * clock is what shows it is running.
 */
function StepSpinner({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reducedMotion || !group.current) return;
    const turn = animate(
      group.current,
      { transform: ["rotate(0deg)", "rotate(360deg)"] },
      { duration: 1, ease: "linear", repeat: Infinity },
    );
    return () => turn.stop();
  }, [reducedMotion]);

  return (
    <g ref={group} data-slot="task-steps-spinner" className="origin-center">
      <motion.circle
        cx={10}
        cy={10}
        r={7.25}
        className="stroke-foreground"
        initial={{ pathLength: reducedMotion ? 0.28 : 0, opacity: 0 }}
        animate={{ pathLength: 0.28, opacity: 1 }}
        exit={{ pathLength: reducedMotion ? 0.28 : 1, opacity: 0 }}
        transition={springFor(reducedMotion)}
      />
    </g>
  );
}

// Whole seconds since `startedAt`, re-rendering on each second boundary rather than on a drifting interval.
function useElapsedSeconds(startedAt: number | undefined) {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (startedAt === undefined) return () => {};
      let timer: ReturnType<typeof setTimeout>;
      const schedule = () => {
        const elapsed = Math.max(0, Date.now() - startedAt);
        timer = setTimeout(
          () => {
            notify();
            schedule();
          },
          1000 - (elapsed % 1000),
        );
      };
      schedule();
      return () => clearTimeout(timer);
    },
    [startedAt],
  );

  return useSyncExternalStore(
    subscribe,
    () => (startedAt === undefined ? 0 : Math.max(0, Math.floor((Date.now() - startedAt) / 1000))),
    () => 0,
  );
}

function StepTime({
  status,
  startedAt,
  durationMs,
  formatDuration,
  transition,
}: {
  status: TaskStepStatus;
  startedAt: number | undefined;
  durationMs: number | undefined;
  formatDuration: (milliseconds: number, running: boolean) => string;
  transition: Transition;
}) {
  const running = status === "running";
  const seconds = useElapsedSeconds(running ? startedAt : undefined);
  const text = running
    ? formatDuration(seconds * 1000, true)
    : durationMs !== undefined && (status === "done" || status === "failed")
      ? formatDuration(durationMs, false)
      : "";

  return (
    <span
      data-slot="task-steps-time"
      // A fixed column of tabular figures: the row does not move as the digits change.
      className={`w-[7ch] shrink-0 text-right font-mono text-xs leading-5 whitespace-nowrap tabular-nums ${CLOCK_INK}`}
    >
      {/* The time fades in when the step starts and out when it is reset; the digits themselves just tick. */}
      <AnimatePresence initial={false}>
        {text !== "" && (
          <motion.span
            key="time"
            className="block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * The panel's height follows its measured content on a spring, so opening, closing, and a log
 * that grows a line at a time are all the same motion and can interrupt one another. Each starts
 * from the height on screen, and the panel fades in and out with the same height it opens to.
 */
function StepPanel({
  id,
  open,
  reducedMotion,
  children,
}: {
  id: string;
  open: boolean;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  // False once the step has lost its detail and the panel is closing for good.
  const present = useIsPresent();
  const transition = springFor(reducedMotion);
  const closed = { height: 0, opacity: 0 };

  useLayoutEffect(() => {
    const element = content.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? element.offsetHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      id={`${id}-panel`}
      role="group"
      aria-labelledby={`${id}-trigger`}
      data-slot="task-steps-panel"
      data-open={open ? "" : undefined}
      className="overflow-hidden"
      // A panel that arrives after its row opens from nothing, and one that is taken away closes the same way.
      initial={closed}
      animate={open ? { height: height ?? "auto", opacity: 1 } : closed}
      exit={closed}
      // Under reduced motion the height changes at once and the content cross-fades.
      transition={reducedMotion ? { ...transition, height: INSTANT } : transition}
    >
      {/* A closed panel stays mounted for measuring, but out of reach of focus and screen readers. */}
      <div ref={content} inert={!open || !present} className="pt-1 pr-2 pb-2 pl-10">
        {children}
      </div>
    </motion.div>
  );
}

// A log only grows, so a line fades in once and is not rendered again as more arrive.
const LogLine = memo(function LogLine({
  line,
  fresh,
  transition,
}: {
  line: string;
  fresh: boolean;
  transition: Transition;
}) {
  return (
    <motion.div
      className="break-words whitespace-pre-wrap"
      initial={fresh ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={transition}
    >
      {line}
    </motion.div>
  );
});

function StepLog({
  labelledBy,
  lines,
  transition,
}: {
  labelledBy: string;
  lines: string[];
  transition: Transition;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  // Follow the newest line until the reader scrolls up to look at an older one.
  const pinned = useRef(true);
  // Lines already there when the log mounts arrive with its panel; only later ones fade in.
  const [mountedWith] = useState(lines.length);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && pinned.current) element.scrollTop = element.scrollHeight;
  }, [lines.length]);

  return (
    <div
      ref={scroller}
      // A log by role, but quiet: the block already announces each step, so lines are not read as they arrive.
      role="log"
      aria-live="off"
      aria-labelledby={labelledBy}
      tabIndex={0}
      data-slot="task-steps-log"
      onScroll={(event) => {
        const element = event.currentTarget;
        pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 8;
      }}
      className="bg-muted text-muted-foreground focus-visible:ring-ring max-h-40 overflow-y-auto rounded-md px-3 py-2 font-mono text-xs leading-5 outline-none not-first:mt-2 focus-visible:ring-2"
    >
      {lines.map((line, index) => (
        <LogLine key={index} line={line} fresh={index >= mountedWith} transition={transition} />
      ))}
    </div>
  );
}
