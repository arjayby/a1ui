"use client";

import { CloudArrowUpIcon, ExportIcon, RocketLaunchIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { ActivityPill, useActivity, type ActivityPillPosition } from "@/registry/blocks/activity-pill";

type Scenario = "deploy" | "upload" | "export";

const positions: ActivityPillPosition[] = [
  "top-center",
  "top-left",
  "top-right",
  "bottom-center",
  "bottom-left",
  "bottom-right",
];

export function ActivityPillPreview() {
  return (
    <div className="not-prose demo-frame grid place-items-center">
      <div className="relative h-10 w-full">
        <ActivityPill
          contained
          className="top-0!"
          activity={{ status: "progress", title: "Uploading", value: 64 }}
        />
      </div>
    </div>
  );
}

export function ActivityPillDemo() {
  const { activity, start, update, succeed, fail, clear } = useActivity();
  const [position, setPosition] = useState<ActivityPillPosition>("top-center");
  const [log, setLog] = useState("Start something to see the pill.");
  const scenario = useRef<Scenario>("deploy");
  const timers = useRef<number[]>([]);

  const stop = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };
  useEffect(() => stop, []);

  const later = (delay: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, delay));
  };

  /** Counts progress up to `end`, then hands over to `done`. */
  const count = (from: number, end: number, done: () => void) => {
    const step = (value: number) => {
      update({ value });
      if (value >= end) later(350, done);
      else later(110, () => step(Math.min(end, value + 3)));
    };
    later(500, () => step(from));
  };

  const run = (name: Scenario, retry = false) => {
    stop();
    scenario.current = name;
    setLog(retry ? `Retried the ${name}.` : `Started the ${name}.`);

    if (name === "deploy") {
      start({ title: "Deploying", detail: "a1ui-docs to production. Building 14 routes." });
      later(3200, () => succeed({ title: "Deployed", detail: "Live in production after 3.2 seconds." }));
    } else if (name === "upload") {
      start({ title: "Uploading", detail: "launch-film.mov, 248 MB.", value: 0 });
      count(0, 100, () => succeed({ title: "Uploaded", detail: "launch-film.mov is ready to share." }));
    } else if (retry) {
      start({ title: "Exporting", detail: "Resuming from row 5,120 of 8,400.", value: 61 });
      count(61, 100, () => succeed({ title: "Exported", detail: "orders-2026.csv, 8,400 rows." }));
    } else {
      start({ title: "Exporting", detail: "orders-2026.csv, 8,400 rows.", value: 0 });
      count(0, 61, () =>
        fail({ title: "Export failed", detail: "The connection dropped at row 5,120. Nothing was lost." }),
      );
    }
  };

  return (
    <div className="not-prose demo-frame">
      <div
        className="component-demo-stage relative min-h-[30rem]! flex-col gap-4"
        role="region"
        aria-label="Activity Pill demo"
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => run("deploy")}>
            <RocketLaunchIcon aria-hidden="true" />
            Deploy
          </Button>
          <Button variant="outline" size="sm" onClick={() => run("upload")}>
            <CloudArrowUpIcon aria-hidden="true" />
            Upload
          </Button>
          <Button variant="outline" size="sm" onClick={() => run("export")}>
            <ExportIcon aria-hidden="true" />
            Export
          </Button>
        </div>
        <p data-slot="activity-pill-demo-log" className="text-muted-foreground text-xs">
          {log}
        </p>
        <ActivityPill
          contained
          position={position}
          activity={activity}
          onCancel={() => {
            stop();
            clear();
            setLog(`Cancelled the ${scenario.current}.`);
          }}
          onRetry={() => run(scenario.current, true)}
          onView={({ title }) => setLog(`Opened the ${scenario.current} log while it said "${title}".`)}
          onDismiss={({ status }) => {
            clear();
            if (status === "error") setLog(`Dismissed the failed ${scenario.current}.`);
          }}
        />
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-36">
        <DemoSelect label="Position" value={position} options={positions} onChange={setPosition} />
      </div>
    </div>
  );
}
