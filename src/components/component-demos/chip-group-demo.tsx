"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { ChipGroup, ChipGroupItem, type ChipGroupProps } from "@/registry/components/chip-group";

type Variant = NonNullable<ChipGroupProps["variant"]>;
const variants: Variant[] = ["muted", "outline"];

const topics = ["Design", "Engineering", "Marketing"];

export function ChipGroupPreview() {
  return (
    <ChipGroup aria-label="Teams" defaultValue={["design"]}>
      <ChipGroupItem value="design">Design</ChipGroupItem>
      <ChipGroupItem value="engineering">Engineering</ChipGroupItem>
      <ChipGroupItem value="sales">Sales</ChipGroupItem>
    </ChipGroup>
  );
}

export function ChipGroupDemo() {
  const [variant, setVariant] = useState<Variant>("muted");
  const [duration, setDuration] = useState(0.35);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <ChipGroup
          key={`${variant}-${duration}`}
          variant={variant}
          duration={duration}
          aria-label="Teams"
          defaultValue={["Design", "Engineering"]}
          className="justify-center px-4"
        >
          {topics.map((topic) => (
            <ChipGroupItem key={topic} value={topic}>
              {topic}
            </ChipGroupItem>
          ))}
        </ChipGroup>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Variant" value={variant} options={variants} onChange={setVariant} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
