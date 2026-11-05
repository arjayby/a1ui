"use client";

import { ArrowClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  type SkeletonAnimation,
  type SkeletonDirection,
} from "@/registry/components/skeleton";

type Animation = Exclude<SkeletonAnimation, "none">;
const animations: Animation[] = ["shimmer", "pulse"];
const directions: SkeletonDirection[] = ["right", "left", "down", "up"];

function ProfileFallback() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={40} />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonPreview() {
  return (
    <div className="border-border w-56 rounded-xl border p-4">
      <Skeleton loadingLabel="Loading profile" fallback={<ProfileFallback />} />
    </div>
  );
}

export function SkeletonDemo() {
  const [animation, setAnimation] = useState<Animation>("shimmer");
  const [direction, setDirection] = useState<SkeletonDirection>("right");
  const [duration, setDuration] = useState(0.5);
  const [loading, setLoading] = useState(true);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid w-full max-w-sm justify-items-center gap-4 px-4">
          <div className="border-border bg-background w-full rounded-xl border p-4">
            <Skeleton
              loading={loading}
              loadingLabel="Loading profile"
              fallback={<ProfileFallback />}
              animation={animation}
              direction={direction}
              duration={duration}
            >
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-foreground text-background grid size-10 shrink-0 place-items-center rounded-full text-sm font-medium"
                  >
                    AL
                  </span>
                  <div className="grid gap-0.5">
                    <div className="text-sm leading-tight font-medium">Ada Lovelace</div>
                    <div className="text-muted-foreground text-xs">@ada · 2h</div>
                  </div>
                </div>
                <div className="text-sm leading-relaxed">
                  Shipped the analytical engine notes. Next up: loops that remember where they left off.
                </div>
              </div>
            </Skeleton>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLoading((current) => !current)}>
            {loading ? (
              <CheckIcon aria-hidden="true" weight="bold" />
            ) : (
              <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
            )}
            {loading ? "Finish loading" : "Reload"}
          </Button>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-28">
        <DemoSelect label="Animation" value={animation} options={animations} onChange={setAnimation} />
        <DemoSelect label="Direction" value={direction} options={directions} onChange={setDirection} />
        <DemoDuration label="Reveal duration" value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
