"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { IconToggle, type IconToggleProps } from "@/registry/components/icon-toggle";

const presets = {
  "sun / moon": { label: "Dark mode" },
  "menu / close": {
    label: "Toggle menu",
    paths: [
      ["M4 6 L20 6", "M6 6 L18 18"],
      ["M4 12 L20 12", "M12 12 L12 12"],
      ["M4 18 L20 18", "M6 18 L18 6"],
    ],
  },
  "play / pause": {
    label: "Toggle playback",
    paths: [
      ["M8 5 L8 12 L8 19", "M8 5 L8 12 L8 19"],
      ["M8 5 L18 12 L8 19", "M16 5 L16 12 L16 19"],
    ],
  },
  "plus / minus": {
    label: "Toggle details",
    paths: [
      ["M5 12 L19 12", "M5 12 L19 12"],
      ["M12 5 L12 19", "M5 12 L19 12"],
    ],
  },
} satisfies Record<string, { label: string; paths?: IconToggleProps["paths"] }>;
type IconPair = keyof typeof presets;
const icons: IconPair[] = ["sun / moon", "menu / close", "play / pause", "plus / minus"];

export function IconToggleDemo() {
  const [icon, setIcon] = useState<IconPair>("sun / moon");
  const [duration, setDuration] = useState(0.3);
  const preset = presets[icon];

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <IconToggle key={`${icon}-${duration}`} {...preset} duration={duration} />
      </div>
      <div className="component-demo-controls [&_select]:w-36">
        <DemoSelect label="Icons" value={icon} options={icons} onChange={setIcon} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
