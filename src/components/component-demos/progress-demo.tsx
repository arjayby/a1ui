"use client";

import { ArrowCounterClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { Progress, type ProgressProps } from "@/registry/components/progress";

type Variant = NonNullable<ProgressProps["variant"]>;
const variants: Variant[] = ["bar", "ring", "steps"];
type Mode = "determinate" | "indeterminate";
const modes: Mode[] = ["determinate", "indeterminate"];

export function ProgressPreview() {
  return <Progress label="Uploading" value={64} shimmer className="max-w-56" />;
}

export function ProgressDemo() {
  const [variant, setVariant] = useState<Variant>("bar");
  const [mode, setMode] = useState<Mode>("determinate");
  const [duration, setDuration] = useState(0.6);
  const [value, setValue] = useState(35);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid w-full max-w-xs gap-5 px-4">
          <Progress
            key={`${variant}-${duration}`}
            label={variant === "steps" ? "Workspace setup" : "Uploading assets"}
            value={mode === "indeterminate" ? null : value}
            variant={variant}
            steps={5}
            shimmer
            duration={duration}
            className={variant === "ring" ? "justify-self-center" : undefined}
          />
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={mode === "indeterminate" || value >= 100}
              onClick={() => setValue((current) => Math.min(100, current + 20))}
            >
              <PlusIcon aria-hidden="true" weight="bold" />
              Add 20%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={mode === "indeterminate" || value === 0}
              onClick={() => setValue(0)}
            >
              <ArrowCounterClockwiseIcon aria-hidden="true" weight="bold" />
              Reset
            </Button>
          </div>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-36">
        <DemoSelect label="Variant" value={variant} options={variants} onChange={setVariant} />
        <DemoSelect label="Mode" value={mode} options={modes} onChange={setMode} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
