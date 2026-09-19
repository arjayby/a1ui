"use client";

import { Braces, FileCode, Image as ImageIcon, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusCapsule, type StatusCapsuleState, type StatusCapsuleTask } from "@/registry/status-capsule";

const files = [
  { id: "thumbnails", label: "thumbnails.svg", detail: "96 KB", icon: <ImageIcon /> },
  { id: "tokens", label: "tokens.json", detail: "12 KB", icon: <Braces /> },
  { id: "component", label: "component.tsx", detail: "36 KB", icon: <FileCode /> },
];

const previewTasks: StatusCapsuleTask[] = files.map((file, index) => ({
  ...file,
  detail: undefined,
  status: index === 0 ? "success" : index === 1 ? "running" : "ready",
}));

export function StatusCapsulePreview() {
  return (
    <div className="not-prose demo-frame flex items-center justify-center" style={{ padding: "0.5rem" }}>
      <div className="pointer-events-none w-[290px] shrink-0 scale-[0.85]" inert>
        <StatusCapsule
          title="Exporting files"
          description="1 of 3 files · 48%"
          status="running"
          progress={48}
          tasks={previewTasks}
        />
      </div>
    </div>
  );
}

export function StatusCapsuleDemo() {
  const [status, setStatus] = useState<StatusCapsuleState>("ready");
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    },
    [],
  );

  function run(fail: boolean) {
    if (timerRef.current !== null) return;
    let nextProgress = 0;
    setProgress(0);
    setStatus("running");
    timerRef.current = setInterval(() => {
      nextProgress = Math.min(100, nextProgress + 4);
      setProgress(nextProgress);
      if ((fail && nextProgress >= 52) || nextProgress === 100) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setStatus(fail ? "error" : "success");
      }
    }, 100);
  }

  const tasks: StatusCapsuleTask[] = files.map((file, index) => ({
    ...file,
    status:
      status === "success" || progress >= ((index + 1) * 100) / files.length
        ? "success"
        : index === Math.floor((progress / 100) * files.length) && status !== "ready"
          ? status
          : "ready",
  }));
  const done = tasks.filter((task) => task.status === "success").length;
  const titles: Record<StatusCapsuleState, string> = {
    ready: "Export ready",
    running: "Exporting files",
    success: "Export complete",
    error: "Export interrupted",
  };

  return (
    <>
      <div className="not-prose demo-frame flex min-h-[26rem] flex-col p-4 sm:p-6">
        <div className="flex min-h-[21rem] flex-1 items-center justify-center py-5">
          <StatusCapsule
            title={titles[status]}
            description={status === "ready" ? "3 files · 144 KB" : `${done} of 3 files · ${progress}%`}
            status={status}
            progress={progress}
            tasks={tasks}
            expanded={expanded}
            onExpandedChange={setExpanded}
            footer={status === "error" ? "Connection lost. Try again." : "Simulated export"}
            action={{
              label:
                status === "running"
                  ? "Exporting..."
                  : status === "success"
                    ? "Run again"
                    : status === "error"
                      ? "Retry export"
                      : "Run preview",
              onClick: () => run(false),
              disabled: status === "running",
            }}
          />
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-[10px]">
          <button
            type="button"
            className="text-foreground min-h-8 cursor-pointer py-1"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Collapse" : "Expand"} details
          </button>
          <button
            type="button"
            disabled={status === "running"}
            className="text-foreground inline-flex min-h-8 cursor-pointer items-center gap-1.5 py-1 disabled:cursor-default disabled:opacity-45 [&_svg]:size-3"
            onClick={() => {
              setExpanded(true);
              run(true);
            }}
          >
            <RotateCcw aria-hidden="true" />
            Preview interruption
          </button>
        </div>
      </div>
      <p className="demo-caption">
        Run the export, then collapse it to keep just the summary. Preview an interruption to try the retry
        state.
      </p>
    </>
  );
}
