"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Avatar, AvatarGroup, type AvatarSize } from "@/registry/components/avatar-group";

const team = [
  "Ada Lovelace",
  "Grace Hopper",
  "Alan Turing",
  "Katherine Johnson",
  "Margaret Hamilton",
  "Dennis Ritchie",
  "Radia Perlman",
  "Tim Berners-Lee",
];

const sizeOptions: AvatarSize[] = ["sm", "md", "lg"];
type MaxOption = "none" | "3" | "4" | "5";
const maxOptions: MaxOption[] = ["none", "3", "4", "5"];

export function AvatarGroupPreview() {
  return (
    <AvatarGroup max={4} aria-label="Team">
      {team.slice(0, 6).map((name) => (
        <Avatar key={name} name={name} />
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
          {team.map((name) => (
            <Avatar key={name} name={name} />
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
