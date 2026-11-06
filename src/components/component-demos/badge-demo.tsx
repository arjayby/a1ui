"use client";

import { BellIcon, TrayIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Badge, type BadgeProps } from "@/registry/components/badge";

type Variant = NonNullable<BadgeProps["variant"]>;
const variants: Variant[] = ["default", "secondary", "outline", "destructive"];
type Cap = "9" | "99" | "999";
const caps: Cap[] = ["9", "99", "999"];
const TICK_MS = 900;
const HOLD_MS = 1800;

// Counts up from zero in steps of one tenth of the next power of ten (1, 10, 100) until it passes max, then holds and starts over.
function useClimbingCount(max: number) {
  const step = (max + 1) / 10;
  const [count, setCount] = useState(0);
  const [startedFor, setStartedFor] = useState(max);
  if (startedFor !== max) {
    setStartedFor(max);
    setCount(0);
  }

  useEffect(() => {
    const timer = window.setTimeout(
      () => setCount((current) => (current > max ? 0 : current + step)),
      count > max ? HOLD_MS : TICK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [count, max, step]);

  return count;
}

export function BadgePreview() {
  return (
    <div className="flex items-center gap-2">
      <Badge count={12} countLabel="unread messages" />
      <Badge variant="outline" dot live>
        Live
      </Badge>
      <Badge variant="secondary">Beta</Badge>
    </div>
  );
}

export function BadgeDemo() {
  const [variant, setVariant] = useState<Variant>("outline");
  const [cap, setCap] = useState<Cap>("9");
  const [duration, setDuration] = useState(0.4);
  const max = Number(cap);
  const count = useClimbingCount(max);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div key={duration} className="grid justify-items-center gap-6 px-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="border-border text-foreground relative inline-grid size-10 place-items-center rounded-full border">
              <BellIcon aria-hidden="true" className="size-5" />
              <span className="absolute -top-1.5 left-6">
                <Badge
                  variant={variant}
                  count={count}
                  max={max}
                  countLabel="unread notifications"
                  duration={duration}
                  className="ring-background ring-2"
                />
              </span>
            </span>
            <Badge
              variant={variant}
              count={count}
              max={max}
              showZero
              countLabel="messages"
              duration={duration}
            >
              <TrayIcon aria-hidden="true" weight="bold" />
              Inbox
            </Badge>
            <Badge variant={variant} dot live duration={duration}>
              Live
            </Badge>
          </div>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-32">
        <DemoSelect label="Variant" value={variant} options={variants} onChange={setVariant} />
        <DemoSelect label="Max" value={cap} options={caps} onChange={setCap} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
