"use client";

import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SpiralText } from "@/registry/blocks/spiral-text";

export function SpiralTextDemo() {
  const [rotating, setRotating] = useState(true);

  return (
    <>
      <div className="not-prose spiral-demo">
        <SpiralText text="THE CONTENT ARCHITECTURE · " rotating={rotating} />
      </div>
      <div className="not-prose demo-caption flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
        <span>Press and hold to draw the coils closer. Release to send a wave past its resting shape.</span>
        {/* The spin runs indefinitely, so it needs a pause control (WCAG 2.2.2). Reduced motion stops it. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRotating((current) => !current)}
          aria-pressed={!rotating}
          className="min-h-7 gap-2 px-0 text-[0.6875rem] font-normal motion-reduce:hidden [&_svg]:size-3"
        >
          {rotating ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
          {rotating ? "Pause rotation" : "Resume rotation"}
        </Button>
      </div>
    </>
  );
}
