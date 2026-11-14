"use client";

import { ChartBarIcon, ChartLineIcon, ChartScatterIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { SegmentedControl, type SegmentedControlProps } from "@/registry/components/segmented-control";

type Size = NonNullable<SegmentedControlProps["size"]>;
const sizes: Size[] = ["sm", "md", "lg"];

const ranges = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;
type Range = (typeof ranges)[number]["value"];

const charts = [
  { value: "bars", "aria-label": "Bars", label: <ChartBarIcon aria-hidden="true" /> },
  { value: "line", "aria-label": "Line", label: <ChartLineIcon aria-hidden="true" /> },
  { value: "dots", "aria-label": "Dots", label: <ChartScatterIcon aria-hidden="true" /> },
] as const;
type Chart = (typeof charts)[number]["value"];

/** Tasks completed in each bucket of the chosen range, and the top of its y axis. */
const series: Record<Range, { labels: string[]; values: number[]; max: number }> = {
  day: { labels: ["12a", "4a", "8a", "12p", "4p", "8p"], values: [0, 1, 4, 6, 5, 2], max: 6 },
  week: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [14, 18, 12, 21, 16, 4, 3],
    max: 24,
  },
  month: { labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"], values: [82, 96, 74, 88], max: 100 },
  year: {
    labels: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
    values: [310, 280, 340, 365, 390, 352, 298, 276, 402, 418, 371, 340],
    max: 500,
  },
};

export function SegmentedControlDemo() {
  const [size, setSize] = useState<Size>("md");
  const [range, setRange] = useState<Range>("week");
  const [chart, setChart] = useState<Chart>("bars");

  const { labels, values, max } = series[range];

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid w-full max-w-sm justify-items-center gap-4">
          <SegmentedControl
            aria-label="Chart"
            size={size}
            options={charts}
            value={chart}
            onValueChange={setChart}
          />
          <SegmentedControl
            aria-label="Range"
            name="range"
            size={size}
            options={ranges}
            value={range}
            onValueChange={setRange}
          />
          {/* The card keeps its height, so choosing an option never moves the controls. */}
          <div
            role="img"
            aria-label={`Activity over the last ${range}, as ${chart}`}
            className="border-border text-muted-foreground grid h-48 w-full grid-cols-[1.5rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-x-2 gap-y-1.5 rounded-lg border p-4 text-[10px] leading-none"
          >
            {/* Y axis: each number is centred on its grid line. */}
            <div className="-my-[5px] flex flex-col justify-between text-right font-mono tabular-nums">
              <span>{max}</span>
              <span>{max / 2}</span>
              <span>0</span>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex flex-col justify-between">
                <span className="border-border border-t" />
                <span className="border-border border-t" />
                <span className="border-border border-t" />
              </div>
              {chart === "line" ? (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="text-foreground absolute inset-0 size-full overflow-visible"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    points={values
                      .map(
                        (value, index) =>
                          `${((index + 0.5) / values.length) * 100},${100 - (value / max) * 100}`,
                      )
                      .join(" ")}
                  />
                </svg>
              ) : (
                <div className="absolute inset-0 flex items-end gap-1">
                  {values.map((value, index) => (
                    <span
                      key={index}
                      className={
                        chart === "bars"
                          ? "bg-foreground min-h-px flex-1 rounded-t-sm transition-[height] duration-300 ease-out motion-reduce:transition-none"
                          : "relative flex-1 transition-[height] duration-300 ease-out motion-reduce:transition-none"
                      }
                      style={{ height: `${(value / max) * 100}%` }}
                    >
                      {chart === "dots" && (
                        <span className="bg-foreground absolute top-0 left-1/2 size-2 -translate-1/2 rounded-full" />
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* X axis, in the plot's column so each label sits under its bucket. */}
            <div className="col-start-2 flex gap-1">
              {labels.map((label, index) => (
                <span key={index} className="min-w-0 flex-1 text-center">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Size" value={size} options={sizes} onChange={setSize} />
      </div>
    </div>
  );
}
