"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

import { AsciiCloth } from "@/registry/ascii-cloth";

export function AsciiClothPreview() {
  return (
    <div className="not-prose demo-frame h-full">
      <AsciiCloth word="A1 UI" interactive={false} className="h-full min-h-40" />
    </div>
  );
}

export function AsciiClothDemo() {
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);

  return (
    <div className="not-prose demo-frame">
      <AsciiCloth key={revision} word="A1 UI" paused={paused} className="h-[clamp(18rem,50vw,27rem)]" />
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs">
        <span className="text-muted-foreground motion-reduce:hidden">
          Grab a character. Pull the fabric. Let go.
        </span>
        <span className="text-muted-foreground hidden motion-reduce:inline">
          Static cloth. Reduced motion is on.
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="hover:bg-muted focus-visible:outline-ring inline-flex items-center gap-2 rounded px-2 py-1 focus-visible:outline-2"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            className="hover:bg-muted focus-visible:outline-ring inline-flex items-center gap-2 rounded px-2 py-1 focus-visible:outline-2"
          >
            {paused ? (
              <Play aria-hidden="true" className="size-3.5" />
            ) : (
              <Pause aria-hidden="true" className="size-3.5" />
            )}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
    </div>
  );
}
