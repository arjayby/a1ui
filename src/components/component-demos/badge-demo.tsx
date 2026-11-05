"use client";

import { ArrowCounterClockwiseIcon, BellIcon, MinusIcon, PlusIcon, TrayIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/registry/components/badge";

type Variant = NonNullable<BadgeProps["variant"]>;
const variants: Variant[] = ["default", "secondary", "outline", "destructive"];
type Cap = "9" | "99" | "999";
const caps: Cap[] = ["9", "99", "999"];

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
  const [variant, setVariant] = useState<Variant>("default");
  const [cap, setCap] = useState<Cap>("99");
  const [duration, setDuration] = useState(0.4);
  const [count, setCount] = useState(8);
  const max = Number(cap);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div key={duration} className="grid justify-items-center gap-6 px-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="border-border text-foreground relative inline-grid size-10 place-items-center rounded-full border">
              <BellIcon aria-hidden="true" className="size-5" />
              <Badge
                variant={variant}
                count={count}
                max={max}
                countLabel="unread notifications"
                duration={duration}
                className="ring-background absolute -top-1.5 left-6 ring-2"
              />
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
            <Badge variant={variant} dot duration={duration}>
              Offline
            </Badge>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCount((current) => current + 1)}>
              <PlusIcon aria-hidden="true" weight="bold" />
              Add 1
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCount((current) => current + 25)}>
              <PlusIcon aria-hidden="true" weight="bold" />
              Add 25
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={count === 0}
              onClick={() => setCount((current) => Math.max(0, current - 1))}
            >
              <MinusIcon aria-hidden="true" weight="bold" />
              Remove 1
            </Button>
            <Button variant="ghost" size="sm" disabled={count === 0} onClick={() => setCount(0)}>
              <ArrowCounterClockwiseIcon aria-hidden="true" weight="bold" />
              Clear
            </Button>
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
