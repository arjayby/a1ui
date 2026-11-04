"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsProps } from "@/registry/components/tabs";

type Variant = NonNullable<TabsProps["variant"]>;
const variants: Variant[] = ["pill", "underline"];

const panels = [
  { value: "overview", label: "Overview", stat: "12,480", detail: "Visitors this week, up 8% on last week." },
  {
    value: "analytics",
    label: "Analytics",
    stat: "3m 42s",
    detail: "Average session length across all pages.",
  },
  { value: "reports", label: "Reports", stat: "24", detail: "Scheduled reports sent to your team." },
  { value: "settings", label: "Settings", stat: "3", detail: "Integrations connected to this workspace." },
];

export function TabsPreview() {
  return (
    <Tabs defaultValue="overview">
      <TabsList aria-label="Dashboard">
        {panels.slice(0, 3).map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function TabsDemo() {
  const [variant, setVariant] = useState<Variant>("pill");
  const [duration, setDuration] = useState(0.35);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <Tabs
          key={`${variant}-${duration}`}
          defaultValue="overview"
          variant={variant}
          duration={duration}
          className="w-full max-w-md px-4"
        >
          <TabsList aria-label="Dashboard" className="max-w-full overflow-x-auto">
            {panels.map((panel) => (
              <TabsTrigger key={panel.value} value={panel.value}>
                {panel.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {panels.map((panel) => (
            <TabsContent key={panel.value} value={panel.value}>
              <div className="border-border rounded-lg border p-4">
                <p className="text-muted-foreground text-xs">{panel.label}</p>
                <p className="mt-1 font-mono text-2xl tabular-nums">{panel.stat}</p>
                <p className="text-muted-foreground mt-2 text-sm">{panel.detail}</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Variant" value={variant} options={variants} onChange={setVariant} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
