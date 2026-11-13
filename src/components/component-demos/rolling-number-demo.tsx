"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { DemoDuration, DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { RollingNumber } from "@/registry/components/rolling-number";

type Format = "number" | "currency" | "percent" | "compact";
const formats: Format[] = ["number", "currency", "percent", "compact"];
const options: Record<Format, Intl.NumberFormatOptions> = {
  number: {},
  currency: { style: "currency", currency: "USD" },
  percent: { style: "percent", maximumFractionDigits: 2 },
  compact: { notation: "compact", maximumFractionDigits: 1 },
};
const labels: Record<Format, string> = {
  number: "Active sessions",
  currency: "Revenue today",
  percent: "Conversion rate",
  compact: "Page views",
};
const START = 1284;
// Steps that cross 999 and 1,000 within a few clicks, so columns enter and leave.
const INCREASE = 69;
const DECREASE = 420;
// Each format shows the same counter at its own scale, chosen so every value and step prints
// exactly: 1,284 is 12.84% and 128.4K, and a step of 69 is 0.69% and 6.9K.
const scale = (format: Format, value: number) =>
  format === "percent" ? value / 10000 : format === "compact" ? value * 100 : value;
// Button labels name the step in the current format, so they match the delta chip.
const step = (format: Format, amount: number) =>
  new Intl.NumberFormat("en-US", { ...options[format], minimumFractionDigits: 0 }).format(scale(format, amount));

// The catalog card walks through a fixed set of changes, up and down across a new column.
const PREVIEW_STEPS = [318, -45, 1206, -1730, 251];
export function RollingNumberPreview() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setTick((current) => current + 1), 1800);
    return () => window.clearTimeout(timer);
  }, [tick]);
  const value = PREVIEW_STEPS.slice(0, tick % (PREVIEW_STEPS.length + 1)).reduce(
    (total, step) => total + step,
    9120,
  );

  return (
    <RollingNumber
      value={value}
      locale="en-US"
      format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
      className="text-foreground text-3xl font-semibold tracking-tight"
    />
  );
}

export function RollingNumberDemo() {
  const [format, setFormat] = useState<Format>("number");
  const [delta, setDelta] = useState(true);
  const [duration, setDuration] = useState(0.5);
  const [value, setValue] = useState(START);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid justify-items-center gap-6 px-4">
          <div className="grid justify-items-center gap-1">
            <span className="text-muted-foreground text-sm">{labels[format]}</span>
            <RollingNumber
              key={format}
              value={scale(format, value)}
              locale="en-US"
              format={options[format]}
              delta={delta}
              announce
              duration={duration}
              // A phone has no room beside a long number, so the chip sits under it there.
              className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl max-sm:[&_[data-slot=rolling-number-delta]]:inset-x-0 max-sm:[&_[data-slot=rolling-number-delta]]:top-full max-sm:[&_[data-slot=rolling-number-delta]]:mx-auto max-sm:[&_[data-slot=rolling-number-delta]]:mt-0.5 max-sm:[&_[data-slot=rolling-number-delta]]:w-fit"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setValue((current) => current + INCREASE)}>
              <PlusIcon aria-hidden="true" weight="bold" />
              Increase {step(format, INCREASE)}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setValue((current) => current - DECREASE)}>
              <MinusIcon aria-hidden="true" weight="bold" />
              Decrease {step(format, DECREASE)}
            </Button>
          </div>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-32">
        <DemoSelect label="Format" value={format} options={formats} onChange={setFormat} />
        <DemoSwitch label="Delta chip" checked={delta} onChange={setDelta} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
