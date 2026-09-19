"use client";

import { clsx as cn } from "clsx";
import { Check, ChevronDown, CircleAlert, File, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type StatusCapsuleState = "ready" | "running" | "success" | "error";

export interface StatusCapsuleTask {
  /** Stable and unique within this capsule. */
  id: string;
  label: string;
  status: StatusCapsuleState;
  detail?: string;
  icon?: ReactNode;
}

export interface StatusCapsuleProps {
  status: StatusCapsuleState;
  tasks: readonly StatusCapsuleTask[];
  title?: string;
  description?: string;
  /** A percentage from 0 to 100. Omit for indeterminate running progress. */
  progress?: number;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  footer?: ReactNode;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

const labels: Record<StatusCapsuleState, string> = {
  ready: "Ready",
  running: "In progress",
  success: "Complete",
  error: "Needs attention",
};

const theme = {
  "--status-capsule-background": "var(--background, #f7f7f5)",
  "--status-capsule-foreground": "var(--foreground, #222320)",
  "--status-capsule-muted": "var(--muted-foreground, #6e706a)",
  "--status-capsule-border": "var(--border, #d6d7d1)",
  "--status-capsule-highlight":
    "color-mix(in oklab, var(--status-capsule-background) 94%, var(--status-capsule-foreground))",
} as CSSProperties;

export function StatusCapsule({
  status,
  tasks,
  title = labels[status],
  description,
  progress,
  action,
  footer,
  expanded,
  defaultExpanded = true,
  onExpandedChange,
  className,
  style,
}: StatusCapsuleProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? localExpanded;
  const value =
    status === "success"
      ? 100
      : status === "ready"
        ? 0
        : typeof progress === "number" && Number.isFinite(progress)
          ? Math.min(100, Math.max(0, progress))
          : undefined;
  const indeterminate = status === "running" && value === undefined;
  const completed = tasks.filter((task) => task.status === "success").length;
  const summary = description ?? `${completed} of ${tasks.length} complete`;
  const announcement = title === labels[status] ? title : `${title}. ${labels[status]}.`;

  function changeExpanded(next: boolean) {
    if (!next && detailsRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    if (expanded === undefined) setLocalExpanded(next);
    onExpandedChange?.(next);
  }

  useEffect(() => {
    // A parent can collapse the controlled component while an action has focus.
    if (!isExpanded && detailsRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [isExpanded]);

  return (
    <div
      data-slot="status-capsule"
      data-state={status}
      data-expanded={isExpanded}
      className={cn(
        "w-full border border-[var(--status-capsule-border)] bg-[var(--status-capsule-background)] font-mono text-xs leading-normal text-[var(--status-capsule-foreground)] transition-[max-width,border-radius] duration-300 ease-out motion-reduce:transition-none",
        isExpanded ? "max-w-[25rem] rounded" : "max-w-[20rem] rounded-[2rem]",
        className,
      )}
      style={{ ...theme, ...style }}
    >
      <div className="flex items-center gap-3 px-4">
        <div
          role="progressbar"
          aria-label={`${title} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={
            status === "running" && value !== undefined ? `${Math.round(value)}% complete` : labels[status]
          }
          className="relative flex size-8 shrink-0 items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-0 rounded-full",
              indeterminate && "animate-spin motion-reduce:animate-none",
            )}
            style={{
              background: `conic-gradient(var(--status-capsule-foreground) ${indeterminate ? 24 : (value ?? 0)}%, var(--status-capsule-border) 0)`,
            }}
          />
          <span
            aria-hidden="true"
            className="relative flex size-[26px] items-center justify-center rounded-full bg-[var(--status-capsule-background)] [&_svg]:size-3.5"
          >
            {status === "success" ? (
              <Check />
            ) : status === "error" ? (
              <CircleAlert />
            ) : (
              <span className="size-1 rounded-full bg-[var(--status-capsule-foreground)]" />
            )}
          </span>
        </div>
        <button
          ref={triggerRef}
          type="button"
          id={`${id}-trigger`}
          data-slot="status-capsule-trigger"
          aria-expanded={isExpanded}
          aria-controls={`${id}-details`}
          className="flex min-h-[76px] min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm py-4 text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--status-capsule-foreground)]"
          onClick={() => changeExpanded(!isExpanded)}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="wrap-anywhere">{title}</span>
            <span className="text-[10px] wrap-anywhere text-[var(--status-capsule-muted)] tabular-nums">
              {summary}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 text-[var(--status-capsule-muted)] transition-transform duration-300 motion-reduce:transition-none",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      </div>
      <div
        ref={detailsRef}
        id={`${id}-details`}
        data-slot="status-capsule-details"
        role="region"
        aria-labelledby={`${id}-trigger`}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        className={cn(
          "grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none",
          isExpanded ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
        )}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.defaultPrevented) return;
          event.preventDefault();
          changeExpanded(false);
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <ul aria-label="Tasks" className="m-0 list-none px-4 pb-1">
            {tasks.map((task) => (
              <li
                key={task.id}
                data-state={task.status}
                className="flex items-center gap-2.5 border-t border-[var(--status-capsule-border)] py-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center text-[var(--status-capsule-muted)] [&_svg]:size-3.5"
                >
                  {task.icon ?? <File />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[11px] wrap-anywhere">{task.label}</span>
                  {task.detail ? (
                    <span className="text-[10px] wrap-anywhere text-[var(--status-capsule-muted)]">
                      {task.detail}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-[var(--status-capsule-muted)] [&_svg]:size-3">
                  {task.status === "running" ? (
                    <span aria-hidden="true" className="animate-spin motion-reduce:animate-none">
                      <LoaderCircle />
                    </span>
                  ) : task.status === "success" ? (
                    <Check aria-hidden="true" />
                  ) : task.status === "error" ? (
                    <CircleAlert aria-hidden="true" />
                  ) : null}
                  {labels[task.status]}
                </span>
              </li>
            ))}
          </ul>
          {footer || action ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-2 pb-4">
              {footer ? (
                <div className="min-w-0 text-[10px] wrap-anywhere text-[var(--status-capsule-muted)]">
                  {footer}
                </div>
              ) : null}
              {action ? (
                <button
                  type="button"
                  disabled={action.disabled}
                  className="ms-auto min-h-8 max-w-full cursor-pointer rounded border border-[var(--status-capsule-border)] bg-[var(--status-capsule-highlight)] px-3 py-1.5 text-[10px] wrap-anywhere transition-colors outline-none hover:bg-[var(--status-capsule-foreground)] hover:text-[var(--status-capsule-background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--status-capsule-foreground)] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <span role="status" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
