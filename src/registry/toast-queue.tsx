"use client";

import { clsx as cn } from "clsx";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type ToastQueueTone = "success" | "info" | "error";

export interface ToastQueueMessage {
  title: string;
  description?: string;
  tone?: ToastQueueTone;
  /** Set to a positive number to dismiss automatically; omitted messages stay until dismissed. */
  durationMs?: number;
}

export interface ToastQueueItem extends ToastQueueMessage {
  id: string;
  phase: "open" | "exiting";
}

export interface ToastQueueController {
  toasts: ToastQueueItem[];
  announcement: { id: string; text: string } | null;
  push: (message: ToastQueueMessage) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  removeExited: (id: string) => void;
}

export interface ToastQueueProps extends Pick<
  ToastQueueController,
  "toasts" | "announcement" | "dismiss" | "removeExited"
> {
  className?: string;
  style?: CSSProperties;
  /** A label for the notification list. */
  label?: string;
}

const EXIT_MS = 220;

const styles = `
  @keyframes a1ui-toast-queue-in {
    from { max-height: 0; opacity: 0; transform: translateY(-8px); margin-bottom: 0; }
    to { max-height: 12rem; opacity: 1; transform: translateY(0); margin-bottom: 0; }
  }
  @keyframes a1ui-toast-queue-out {
    from { max-height: 12rem; opacity: 1; transform: translateY(0); margin-bottom: 0; }
    to { max-height: 0; opacity: 0; transform: translateY(-8px); margin-bottom: -0.5rem; }
  }
  [data-slot="toast-queue-item"][data-state="open"] { animation: a1ui-toast-queue-in 260ms ease-out both; }
  [data-slot="toast-queue-item"][data-state="exiting"] { animation: a1ui-toast-queue-out ${EXIT_MS}ms ease-in both; pointer-events: none; }
  @media (prefers-reduced-motion: reduce) {
    [data-slot="toast-queue-item"] { animation: none !important; }
  }
`;

/** Keep the latest messages visible while older messages leave with an exit animation. */
export function useToastQueue({ limit = 3 }: { limit?: number } = {}): ToastQueueController {
  const [toasts, setToasts] = useState<ToastQueueItem[]>([]);
  const [announcement, setAnnouncement] = useState<ToastQueueController["announcement"]>(null);
  const nextId = useRef(0);
  const timers = useRef(
    new Map<string, { phase: ToastQueueItem["phase"]; timer: ReturnType<typeof setTimeout> }>(),
  );
  const limitCount = Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 3));

  const removeExited = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, phase: "exiting" } : toast)),
    );
  }, []);

  const clear = useCallback(() => {
    setToasts((current) => current.map((toast) => ({ ...toast, phase: "exiting" })));
  }, []);

  const push = useCallback(
    (message: ToastQueueMessage) => {
      const id = `toast-${++nextId.current}`;
      setToasts((current) => {
        const open = current.filter((toast) => toast.phase === "open");
        const overflow = Math.max(0, open.length + 1 - limitCount);
        const evicted = new Set((overflow ? open.slice(-overflow) : []).map((toast) => toast.id));
        return [
          { ...message, id, phase: "open" },
          ...current.map((toast) =>
            evicted.has(toast.id) ? { ...toast, phase: "exiting" as const } : toast,
          ),
        ];
      });
      setAnnouncement({ id, text: [message.title, message.description].filter(Boolean).join(". ") });
      return id;
    },
    [limitCount],
  );

  useEffect(() => {
    const ids = new Set(toasts.map((toast) => toast.id));
    for (const [id, pending] of timers.current) {
      if (!ids.has(id)) {
        clearTimeout(pending.timer);
        timers.current.delete(id);
      }
    }
    for (const toast of toasts) {
      const pending = timers.current.get(toast.id);
      if (pending?.phase === toast.phase) continue;
      if (pending) clearTimeout(pending.timer);
      if (toast.phase === "exiting") {
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        timers.current.set(toast.id, {
          phase: toast.phase,
          timer: setTimeout(() => removeExited(toast.id), reduced ? 0 : EXIT_MS),
        });
      } else if (toast.durationMs && toast.durationMs > 0) {
        timers.current.set(toast.id, {
          phase: toast.phase,
          timer: setTimeout(() => dismiss(toast.id), toast.durationMs),
        });
      }
    }
  }, [toasts, dismiss, removeExited]);

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      for (const pending of pendingTimers.values()) clearTimeout(pending.timer);
      pendingTimers.clear();
    };
  }, []);

  return { toasts, announcement, push, dismiss, clear, removeExited };
}

const icons = { success: Check, info: Info, error: CircleAlert };

export function ToastQueue({
  toasts,
  announcement,
  dismiss,
  removeExited,
  className,
  style,
  label = "Notifications",
}: ToastQueueProps) {
  return (
    <div
      data-slot="toast-queue"
      className={cn("w-full max-w-[22rem] font-mono text-xs", className)}
      style={style}
    >
      <style>{styles}</style>
      <ol aria-label={label} className="m-0 flex list-none flex-col gap-2 p-0">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone ?? "info"];
          return (
            <li
              key={toast.id}
              data-slot="toast-queue-item"
              data-state={toast.phase}
              data-tone={toast.tone ?? "info"}
              aria-hidden={toast.phase === "exiting"}
              className="min-w-0 overflow-hidden"
              onAnimationEnd={(event) => {
                if (event.target === event.currentTarget && toast.phase === "exiting") {
                  removeExited(toast.id);
                }
              }}
            >
              <div className="bg-background text-foreground border-foreground flex min-w-0 items-start gap-2.5 border p-3 shadow-[4px_4px_0_color-mix(in_srgb,var(--foreground)_8%,transparent)]">
                <span
                  aria-hidden="true"
                  className="border-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5"
                >
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold wrap-anywhere">{toast.title}</span>
                  {toast.description ? (
                    <span className="text-muted-foreground mt-1 block text-[11px] leading-snug wrap-anywhere">
                      {toast.description}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  aria-label={`Dismiss ${toast.title}`}
                  disabled={toast.phase === "exiting"}
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-foreground flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none [&_svg]:size-3.5"
                  onClick={(event) => {
                    const item = event.currentTarget.closest("li");
                    const neighbor = Array.from(item?.parentElement?.children ?? [])
                      .find(
                        (candidate) => candidate !== item && candidate.getAttribute("data-state") === "open",
                      )
                      ?.querySelector<HTMLButtonElement>("button");
                    neighbor?.focus();
                    if (!neighbor) event.currentTarget.blur();
                    dismiss(toast.id);
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement ? <span key={announcement.id}>{announcement.text}</span> : null}
      </span>
    </div>
  );
}
