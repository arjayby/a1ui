"use client";

import { useEffect, useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  Skeleton,
  SkeletonText,
  type SkeletonAnimation,
  type SkeletonDirection,
} from "@/registry/components/skeleton";

type Animation = Exclude<SkeletonAnimation, "none">;
const animations: Animation[] = ["shimmer", "pulse"];
const directions: SkeletonDirection[] = ["right", "left", "down", "up"];
// The demo loads and reloads on its own: milliseconds spent loading, then showing the content.
const LOADING_TIME = 2400;
const CONTENT_TIME = 3200;

// Each bar sits where a line of the paragraph will, so the swap lands without the text moving.
const about =
  "a1ui is a collection of animated React components and blocks. Install one with an agent, then edit it to make it yours.";

export function SkeletonPreview() {
  return <SkeletonText lines={3} className="w-56" />;
}

export function SkeletonDemo() {
  const [animation, setAnimation] = useState<Animation>("shimmer");
  const [direction, setDirection] = useState<SkeletonDirection>("right");
  const [duration, setDuration] = useState(0.4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(!loading), loading ? LOADING_TIME : CONTENT_TIME);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="w-full max-w-xs px-4">
          <Skeleton
            loading={loading}
            fallback={<SkeletonText lines={3} className="py-[5px]" />}
            animation={animation}
            direction={direction}
            duration={duration}
          >
            <p className="my-0! text-sm leading-relaxed">{about}</p>
          </Skeleton>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-28">
        <DemoSelect label="Animation" value={animation} options={animations} onChange={setAnimation} />
        <DemoSelect label="Direction" value={direction} options={directions} onChange={setDirection} />
        <DemoDuration label="Swap duration" value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
