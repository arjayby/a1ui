"use client";

import { Fragment, useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/registry/components/select";

const regions = [
  {
    label: "Americas",
    items: [
      { value: "us-east", label: "US East (Virginia)" },
      { value: "us-west", label: "US West (Oregon)" },
      { value: "sa-east", label: "South America (São Paulo)", disabled: true },
    ],
  },
  {
    label: "Europe",
    items: [
      { value: "eu-west", label: "Europe (Ireland)" },
      { value: "eu-central", label: "Europe (Frankfurt)" },
    ],
  },
  {
    label: "Asia Pacific",
    items: [
      { value: "ap-southeast", label: "Asia Pacific (Singapore)" },
      { value: "ap-northeast", label: "Asia Pacific (Tokyo)" },
    ],
  },
];
const items = regions.flatMap((group) => group.items);

type Position = "aligned" | "below";
const positions: Position[] = ["aligned", "below"];

export function SelectPreview() {
  return (
    <Select items={items} defaultValue="eu-west">
      <SelectTrigger aria-label="Region">
        <SelectValue placeholder="Select a region" />
      </SelectTrigger>
      <SelectContent>
        {items
          .filter((item) => !item.disabled)
          .map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

export function SelectDemo() {
  const [position, setPosition] = useState<Position>("aligned");
  const [duration, setDuration] = useState(0.3);
  const [region, setRegion] = useState<string | null>(null);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid w-full max-w-64 gap-2 px-4">
          <span id="select-demo-label" className="text-sm font-medium">
            Deploy region
          </span>
          <Select items={items} value={region} onValueChange={setRegion} duration={duration}>
            <SelectTrigger aria-labelledby="select-demo-label" className="w-full">
              <SelectValue placeholder="Select a region" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={position === "aligned"}>
              {regions.map((group, index) => (
                <Fragment key={group.label}>
                  {index > 0 && <SelectSeparator />}
                  <SelectGroup>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Position" value={position} options={positions} onChange={setPosition} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
