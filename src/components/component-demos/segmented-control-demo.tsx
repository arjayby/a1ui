"use client";

import { CalendarBlankIcon, KanbanIcon, ListBulletsIcon, StackIcon } from "@phosphor-icons/react";
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

const views = [
  { value: "list", "aria-label": "List", label: <ListBulletsIcon aria-hidden="true" /> },
  { value: "board", "aria-label": "Board", label: <KanbanIcon aria-hidden="true" /> },
  { value: "calendar", "aria-label": "Calendar", label: <CalendarBlankIcon aria-hidden="true" /> },
  { value: "timeline", "aria-label": "Timeline", label: <StackIcon aria-hidden="true" />, disabled: true },
];

export function SegmentedControlDemo() {
  const [size, setSize] = useState<Size>("md");
  const [range, setRange] = useState<Range>("week");

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid w-full justify-items-center gap-5 px-4">
          <SegmentedControl
            aria-label="Range"
            name="range"
            size={size}
            options={ranges}
            value={range}
            onValueChange={setRange}
          />
          <p aria-live="polite" className="text-muted-foreground text-xs">
            Showing the last {range}
          </p>
          <SegmentedControl aria-label="View" size={size} options={views} defaultValue="list" />
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Size" value={size} options={sizes} onChange={setSize} />
      </div>
    </div>
  );
}
