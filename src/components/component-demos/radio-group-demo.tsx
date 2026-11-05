"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { RadioGroup, RadioGroupItem, type RadioGroupProps } from "@/registry/components/radio-group";

type Variant = NonNullable<RadioGroupProps["variant"]>;
const variants: Variant[] = ["default", "card"];

const plans = [
  { value: "hobby", label: "Hobby", description: "One project, community support." },
  { value: "pro", label: "Pro", description: "Unlimited projects and preview deployments." },
  { value: "team", label: "Team", description: "Shared workspaces, roles, and audit logs." },
  { value: "enterprise", label: "Enterprise", description: "Talk to sales.", disabled: true },
];

export function RadioGroupPreview() {
  return (
    <RadioGroup aria-label="Notifications" defaultValue="mentions">
      <RadioGroupItem value="all" label="All messages" />
      <RadioGroupItem value="mentions" label="Mentions only" />
      <RadioGroupItem value="none" label="Nothing" />
    </RadioGroup>
  );
}

export function RadioGroupDemo() {
  const [variant, setVariant] = useState<Variant>("default");
  const [duration, setDuration] = useState(0.35);
  const [plan, setPlan] = useState("pro");

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <RadioGroup
          key={`${variant}-${duration}`}
          aria-label="Plan"
          name="plan"
          variant={variant}
          duration={duration}
          value={plan}
          onValueChange={setPlan}
          className="w-full max-w-sm px-4"
        >
          {plans.map((item) => (
            <RadioGroupItem
              key={item.value}
              value={item.value}
              label={item.label}
              description={item.description}
              disabled={item.disabled}
            />
          ))}
        </RadioGroup>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Variant" value={variant} options={variants} onChange={setVariant} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
