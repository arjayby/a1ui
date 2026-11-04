"use client";

import { CheckIcon, MoonIcon, SunIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Switch, type SwitchProps } from "@/registry/components/switch";

const iconSets = {
  none: undefined,
  "check / x": {
    checked: <CheckIcon weight="bold" />,
    unchecked: <XIcon weight="bold" />,
  },
  "sun / moon": {
    checked: <MoonIcon weight="fill" />,
    unchecked: <SunIcon weight="fill" />,
  },
} satisfies Record<string, SwitchProps["thumbIcons"]>;
type IconSet = keyof typeof iconSets;
const iconOptions: IconSet[] = ["none", "check / x", "sun / moon"];

export function SwitchPreview() {
  return <Switch label="Notifications" defaultChecked />;
}

export function SwitchDemo() {
  const [icons, setIcons] = useState<IconSet>("none");
  const [duration, setDuration] = useState(0.3);
  const thumbIcons = iconSets[icons];

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div key={`${icons}-${duration}`} className="grid gap-4">
          <Switch label="Airplane mode" thumbIcons={thumbIcons} duration={duration} />
          <Switch label="Notifications" defaultChecked thumbIcons={thumbIcons} duration={duration} />
          <Switch label="Sync over cellular" disabled thumbIcons={thumbIcons} duration={duration} />
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-32">
        <DemoSelect label="Thumb icons" value={icons} options={iconOptions} onChange={setIcons} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
