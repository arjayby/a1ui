"use client";

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { useState } from "react";

import { TextBanner } from "@/registry/blocks/text-banner";

const items = ["a1ui", "Components"];

// Site press feedback: scale down the instant the pointer goes down, spring back on release.
const pressable =
  "transition-transform duration-(--ease-spring-snappy-duration) ease-(--ease-spring-snappy) active:scale-[0.96] active:duration-75 active:ease-(--ease-press) motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-60";

export function TextBannerPreview() {
  return (
    <div className="not-prose demo-frame text-banner-preview">
      <TextBanner items={items} paused style={{ fontSize: "1.125rem" }} />
    </div>
  );
}

export function TextBannerDemo() {
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");

  return (
    <>
      <div className="not-prose demo-frame text-banner-demo">
        <div className="text-banner-demo-stage">
          <TextBanner items={items} direction={direction} paused={paused} />
        </div>
      </div>
      <div className="not-prose demo-caption text-banner-demo-controls">
        <button
          type="button"
          className={pressable}
          onClick={() => setDirection((current) => (current === "right" ? "left" : "right"))}
          aria-label={`Change direction to ${direction === "right" ? "left" : "right"}`}
        >
          {direction === "right" ? <ArrowRight aria-hidden="true" /> : <ArrowLeft aria-hidden="true" />}
          {direction === "right" ? "Left to right" : "Right to left"}
        </button>
        <button
          type="button"
          className={pressable}
          onClick={() => setPaused((current) => !current)}
          aria-pressed={paused}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
    </>
  );
}
