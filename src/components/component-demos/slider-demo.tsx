"use client";

import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/registry/components/slider";

const layouts = {
  quarters: [0, 25, 50, 75, 100],
  thirds: [0, 33, 67, 100],
  uneven: [0, 15, 50, 85, 100],
} satisfies Record<string, number[]>;
const strengths = { light: 1, medium: 3, firm: 6 };

export function SliderPreview() {
  return <Slider label="Intensity" stops={layouts.quarters} defaultValue={50} className="max-w-64 px-6" />;
}

export function SliderDemo() {
  const [layout, setLayout] = useState<keyof typeof layouts>("quarters");
  const [strength, setStrength] = useState<keyof typeof strengths>("medium");
  const [showStopLabels, setShowStopLabels] = useState(false);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="w-full max-w-sm px-4">
          <Slider
            label="Intensity"
            stops={layouts[layout]}
            defaultValue={50}
            snapDistance={strengths[strength]}
            showStopLabels={showStopLabels}
          />
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect
          label="Stops"
          value={layout}
          options={["quarters", "thirds", "uneven"]}
          onChange={setLayout}
        />
        <DemoSelect
          label="Catch"
          value={strength}
          options={["light", "medium", "firm"]}
          onChange={setStrength}
        />
        <label className="component-demo-control">
          <span>Stop labels</span>
          <span className="flex h-8 items-center">
            <Switch checked={showStopLabels} onCheckedChange={setShowStopLabels} />
          </span>
        </label>
      </div>
    </div>
  );
}
