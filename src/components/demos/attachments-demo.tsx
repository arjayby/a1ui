"use client";

import { useEffect, useRef, useState } from "react";
import { Attachments, type ChatAttachment } from "@/registry/attachments";
import { Button } from "@/components/ui/button";

export function AttachmentsDemo() {
  const [items, setItems] = useState<ChatAttachment[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>());
  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach(clearInterval);
      active.clear();
    };
  }, []);
  function upload(id: string, fail = false) {
    clearInterval(timers.current.get(id));
    let progress = 0;
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "uploading", progress: 0, error: undefined } : item,
      ),
    );
    timers.current.set(
      id,
      setInterval(() => {
        progress += 20;
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  progress,
                  status: progress === 100 ? (fail ? "error" : "done") : "uploading",
                  error:
                    fail && progress === 100
                      ? "Simulated connection failure. Retry to finish the demo."
                      : undefined,
                }
              : item,
          ),
        );
        if (progress === 100) {
          clearInterval(timers.current.get(id));
          timers.current.delete(id);
        }
      }, 250),
    );
  }
  return (
    <div className="not-prose flex flex-col gap-4">
      <Attachments
        items={items}
        onFilesSelected={(files) =>
          setItems((current) => [
            ...current,
            ...files.map((file) => ({ id: crypto.randomUUID(), file, status: "idle" as const })),
          ])
        }
        onRemove={(id) => {
          clearInterval(timers.current.get(id));
          timers.current.delete(id);
          setItems((current) => current.filter((item) => item.id !== id));
        }}
        onRetry={(id) => upload(id)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!items.some((item) => item.status === "idle")}
          onClick={() => items.filter((item) => item.status === "idle").forEach((item) => upload(item.id))}
        >
          Simulate upload
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!items.some((item) => item.status === "idle")}
          onClick={() =>
            items.filter((item) => item.status === "idle").forEach((item) => upload(item.id, true))
          }
        >
          Simulate failure
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Files and image previews stay on this device. Progress and failures are simulated; nothing is
        uploaded. Removing a file cancels its simulation.
      </p>
    </div>
  );
}
