"use client";

import { useEffect, useRef } from "react";

import { ToastQueue, useToastQueue, type ToastQueueMessage } from "@/registry/toast-queue";

const events: ToastQueueMessage[] = [
  { tone: "success", title: "Component copied", description: "Ready to paste into your project." },
  { tone: "info", title: "Preview published", description: "The latest build is available." },
  { tone: "success", title: "Changes saved", description: "All edits are up to date." },
  { tone: "error", title: "Export interrupted", description: "Check the connection and try again." },
];

function useDemoQueue() {
  const queue = useToastQueue({ limit: 3 });
  const { push } = queue;
  const index = useRef(0);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    push(events[1]);
    push(events[0]);
  }, [push]);

  function trigger() {
    push(events[index.current++ % events.length]);
  }

  return { queue, trigger };
}

export function ToastQueuePreview() {
  const { queue } = useDemoQueue();

  return (
    <div className="not-prose demo-frame flex items-center justify-center p-3">
      <div className="pointer-events-none w-full max-w-[19rem] scale-[0.83]" inert>
        <ToastQueue {...queue} />
      </div>
    </div>
  );
}

export function ToastQueueDemo() {
  const { queue, trigger } = useDemoQueue();

  return (
    <>
      <div className="not-prose demo-frame flex min-h-[25rem] flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b pb-3 font-mono text-[11px]">
          <span className="text-muted-foreground">Event feedback</span>
          <button
            type="button"
            className="border-foreground text-foreground hover:bg-foreground hover:text-background min-h-8 cursor-pointer border px-3 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
            onClick={trigger}
          >
            Trigger event +
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center py-6">
          <ToastQueue {...queue} />
        </div>
      </div>
      <p className="demo-caption">
        Trigger more events to see new toasts enter and older ones leave. Dismiss any toast to try the exit
        animation.
      </p>
    </>
  );
}
