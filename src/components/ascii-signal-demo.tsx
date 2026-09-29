"use client";

import { useState } from "react";

import { AsciiSignal, type AsciiSignalStatus } from "@/registry/ascii-signal";

const choices: { status: AsciiSignalStatus; label: string }[] = [
  { status: "idle", label: "Idle" },
  { status: "processing", label: "Processing" },
  { status: "complete", label: "Complete" },
];

export function AsciiSignalPreview() {
  return (
    <div className="not-prose demo-frame flex items-center justify-center p-4">
      <AsciiSignal status="processing" label="Generating preview" paused className="max-w-[19rem]" />
    </div>
  );
}

export function AsciiSignalDemo() {
  const [status, setStatus] = useState<AsciiSignalStatus>("idle");

  return (
    <div className="not-prose demo-frame flex min-h-[24rem] flex-col items-center justify-center gap-7 px-4 py-8">
      <AsciiSignal
        status={status}
        label={
          status === "idle"
            ? "Ready to generate"
            : status === "processing"
              ? "Generating preview"
              : "Preview is ready"
        }
      />
      <div
        role="group"
        aria-label="Signal status"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {choices.map((choice) => (
          <button
            key={choice.status}
            type="button"
            aria-pressed={status === choice.status}
            className="border-border text-foreground hover:bg-muted focus-visible:outline-ring aria-pressed:bg-foreground aria-pressed:text-background min-h-9 cursor-pointer rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
            onClick={() => setStatus(choice.status)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
