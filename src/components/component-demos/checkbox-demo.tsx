"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Checkbox } from "@/registry/components/checkbox";

const tasks = [
  { id: "copy", label: "Write the launch copy" },
  { id: "review", label: "Review the pricing page" },
  { id: "ship", label: "Ship the changelog" },
];
type Style = "plain" | "strikethrough";
const styles: Style[] = ["plain", "strikethrough"];

export function CheckboxPreview() {
  return <Checkbox label="Accept terms and conditions" defaultChecked />;
}

export function CheckboxDemo() {
  const [style, setStyle] = useState<Style>("strikethrough");
  const [duration, setDuration] = useState(0.25);
  const [done, setDone] = useState<string[]>(["copy"]);
  const all = done.length === tasks.length;

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div key={`${style}-${duration}`} className="grid w-full max-w-xs gap-3 px-4">
          <Checkbox
            label="All tasks"
            description={`${done.length} of ${tasks.length} done`}
            checked={all}
            indeterminate={done.length > 0 && !all}
            duration={duration}
            onCheckedChange={(checked) => setDone(checked ? tasks.map((task) => task.id) : [])}
          />
          <div className="border-border grid gap-3 border-l pl-4">
            {tasks.map((task) => (
              <Checkbox
                key={task.id}
                label={task.label}
                strikethrough={style === "strikethrough"}
                duration={duration}
                checked={done.includes(task.id)}
                onCheckedChange={(checked) =>
                  setDone((current) =>
                    checked ? [...current, task.id] : current.filter((id) => id !== task.id),
                  )
                }
              />
            ))}
          </div>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-36">
        <DemoSelect label="Style" value={style} options={styles} onChange={setStyle} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
