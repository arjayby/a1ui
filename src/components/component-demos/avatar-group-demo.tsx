"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Avatar, AvatarGroup, type AvatarSize, type AvatarTone } from "@/registry/components/avatar-group";

// Original dark-fantasy faces with transparent backgrounds, so each tone shows through and follows the theme.
const team: { name: string; tone: AvatarTone }[] = [
  { name: "Ashen Warden", tone: "warning" },
  { name: "Hollow Seer", tone: "chart-3" },
  { name: "Thornback", tone: "success" },
  { name: "Pale Regent", tone: "danger" },
  { name: "Gravecaller", tone: "chart-5" },
  { name: "Iron Penitent", tone: "other" },
  { name: "Mire Hag", tone: "chart-1" },
  { name: "Ember Wyrm", tone: "primary" },
];

function portrait(name: string) {
  return `/images/avatar-group/${name.toLowerCase().replace(/\s+/g, "-")}.svg`;
}

const sizeOptions: AvatarSize[] = ["sm", "md", "lg"];
type MaxOption = "none" | "3" | "4" | "5";
const maxOptions: MaxOption[] = ["none", "3", "4", "5"];

export function AvatarGroupPreview() {
  return (
    <AvatarGroup max={4} aria-label="Team">
      {team.slice(0, 6).map(({ name, tone }) => (
        <Avatar key={name} name={name} tone={tone} src={portrait(name)} />
      ))}
    </AvatarGroup>
  );
}

export function AvatarGroupDemo() {
  const [size, setSize] = useState<AvatarSize>("md");
  const [max, setMax] = useState<MaxOption>("4");
  const [duration, setDuration] = useState(0.3);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <AvatarGroup
          key={`${size}-${max}-${duration}`}
          aria-label="Project members"
          size={size}
          max={max === "none" ? undefined : Number(max)}
          duration={duration}
        >
          {team.map(({ name, tone }) => (
            <Avatar key={name} name={name} tone={tone} src={portrait(name)} />
          ))}
        </AvatarGroup>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Size" value={size} options={sizeOptions} onChange={setSize} />
        <DemoSelect label="Max" value={max} options={maxOptions} onChange={setMax} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
