"use client";

import { useState } from "react";

import { DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import { Stepper, type StepperProps } from "@/registry/components/stepper";

const presets = {
  guests: { label: "Guests", min: 1, max: 8, defaultValue: 2 },
  budget: {
    label: "Budget",
    min: 0,
    max: 500,
    step: 25,
    largeStep: 100,
    defaultValue: 150,
    format: (amount) => `$${amount}`,
  },
  zoom: {
    label: "Zoom",
    min: 0.5,
    max: 3,
    step: 0.25,
    largeStep: 1,
    defaultValue: 1,
    format: (scale) => `${scale.toFixed(2)}×`,
  },
} satisfies Record<string, StepperProps>;
type Preset = keyof typeof presets;

export function StepperPreview() {
  return <Stepper {...presets.guests} />;
}

export function StepperDemo() {
  const [preset, setPreset] = useState<Preset>("guests");
  const [disabled, setDisabled] = useState(false);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <Stepper key={preset} {...presets[preset]} disabled={disabled} />
      </div>
      <div className="component-demo-controls">
        <DemoSelect
          label="Value"
          value={preset}
          options={["guests", "budget", "zoom"]}
          onChange={setPreset}
        />
        <DemoSwitch label="Disabled" checked={disabled} onChange={setDisabled} />
      </div>
    </div>
  );
}
