"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsProps } from "@/registry/components/tabs";

type Variant = NonNullable<TabsProps["variant"]>;
const variants: Variant[] = ["pill", "underline"];

const panels = [
  {
    value: "overview",
    label: "Overview",
    stat: "12,480",
    detail: "Visitors this week, up 8% on last week.",
    rows: [],
  },
  {
    value: "analytics",
    label: "Analytics",
    stat: "3m 42s",
    detail: "Average session length across all pages.",
    rows: [
      ["Pricing", "5m 10s"],
      ["Docs", "4m 02s"],
      ["Blog", "1m 54s"],
    ],
  },
  {
    value: "reports",
    label: "Reports",
    stat: "24",
    detail: "Scheduled reports sent to your team.",
    rows: [["Next send", "Monday, 9:00"]],
  },
  {
    value: "settings",
    label: "Settings",
    stat: "3",
    detail: "Integrations connected to this workspace.",
    rows: [],
  },
];

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
                {panel.rows.length > 0 && (
                  <dl className="border-border mt-3 border-t pt-1 text-sm">
                    {panel.rows.map(([name, amount]) => (
                      <div key={name} className="flex justify-between pt-2">
                        <dt className="text-muted-foreground">{name}</dt>
                        <dd className="font-mono tabular-nums">{amount}</dd>
                      </div>
                    ))}
                  </dl>
                )}
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
