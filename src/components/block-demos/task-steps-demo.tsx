"use client";

import { ArrowCounterClockwiseIcon, FastForwardIcon, PlayIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useReducer } from "react";

import { Button } from "@/components/ui/button";
import { TaskSteps, type TaskStep } from "@/registry/blocks/task-steps";

// Each step waits `ticks` beats, or prints one log line per beat, and then finishes.
const script: { id: string; label: string; detail?: string; lines: string[]; ticks?: number }[] = [
  { id: "queue", label: "Queue", detail: "Waiting for a free build machine.", lines: [], ticks: 3 },
  {
    id: "install",
    label: "Install dependencies",
    lines: [
      "pnpm install --frozen-lockfile",
      "Lockfile is up to date, resolution step is skipped",
      "Packages: +412",
      "Done in 3.1s",
    ],
  },
  {
    id: "build",
    label: "Build",
    detail: "Compiling the app and prerendering its static pages.",
    lines: [
      "next build",
      "Creating an optimized production build",
      "Compiled successfully",
      "Checking validity of types",
      "Collecting page data",
      "Generating static pages (48/48)",
      "Finalizing page optimization",
      "Collecting build traces",
    ],
  },
  {
    id: "checks",
    label: "Run checks",
    lines: ["vitest run", "212 unit tests passed", "playwright test", "96 browser tests passed"],
  },
  { id: "deploy", label: "Deploy", lines: ["Uploading build outputs", "Assigning domains", "Ready"] },
];

type Job = { steps: TaskStep[]; beat: number };
type Action = { type: "start" | "tick" | "fail" | "finish" | "reset" };

const idle = (): Job => ({
  steps: script.map(({ id, label, detail }) => ({ id, label, detail, status: "pending", logs: [] })),
  beat: 0,
});

function reduce(job: Job, action: Action): Job {
  const current = job.steps.findIndex((step) => step.status === "running");

  switch (action.type) {
    case "reset":
      return idle();
    case "start": {
      const fresh = idle();
      fresh.steps[0].status = "running";
      return fresh;
    }
    case "tick": {
      if (current === -1) return job;
      const { lines, ticks = lines.length } = script[current];
      if (job.beat < ticks) {
        return {
          beat: job.beat + 1,
          steps: job.steps.map((step, index) =>
            index === current && lines[job.beat]
              ? { ...step, logs: [...(step.logs ?? []), lines[job.beat]] }
              : step,
          ),
        };
      }
      return {
        beat: 0,
        steps: job.steps.map((step, index) =>
          index === current
            ? { ...step, status: "done" }
            : index === current + 1
              ? { ...step, status: "running" }
              : step,
        ),
      };
    }
    case "fail":
      if (current === -1) return job;
      return {
        beat: 0,
        steps: job.steps.map((step, index) =>
          index === current
            ? { ...step, status: "failed", logs: [...(step.logs ?? []), "Error: exited with code 1"] }
            : index > current
              ? { ...step, status: "skipped" }
              : step,
        ),
      };
    case "finish":
      if (current === -1) return job;
      return {
        beat: 0,
        steps: job.steps.map((step, index) => (index >= current ? { ...step, status: "done" } : step)),
      };
  }
}

export function TaskStepsDemo() {
  const [job, dispatch] = useReducer(reduce, undefined, idle);
  const running = job.steps.some((step) => step.status === "running");
  const untouched = job.steps.every((step) => step.status === "pending");

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => dispatch({ type: "tick" }), 500);
    return () => window.clearInterval(timer);
  }, [running]);

  return (
    <div className="not-prose demo-frame">
      {/* Top-aligned in a fixed-height stage, so the list grows downwards and the page below stays put. */}
      <div className="flex min-h-124 justify-center px-4 py-10 sm:px-6">
        <TaskSteps aria-label="Deployment" steps={job.steps} className="max-w-sm" />
      </div>
      <div className="component-demo-controls">
        <Button variant="outline" size="sm" disabled={running} onClick={() => dispatch({ type: "start" })}>
          <PlayIcon aria-hidden="true" weight="bold" />
          {untouched ? "Run job" : "Run again"}
        </Button>
        <Button variant="outline" size="sm" disabled={!running} onClick={() => dispatch({ type: "finish" })}>
          <FastForwardIcon aria-hidden="true" weight="bold" />
          Finish all
        </Button>
        <Button variant="outline" size="sm" disabled={!running} onClick={() => dispatch({ type: "fail" })}>
          <XIcon aria-hidden="true" weight="bold" />
          Fail this step
        </Button>
        <Button variant="ghost" size="sm" disabled={untouched} onClick={() => dispatch({ type: "reset" })}>
          <ArrowCounterClockwiseIcon aria-hidden="true" weight="bold" />
          Reset
        </Button>
      </div>
    </div>
  );
}
