"use client";

import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { Switch } from "@/components/ui/switch";
import { ReorderList, ReorderListHandle, ReorderListItem } from "@/registry/components/reorder-list";

interface Task {
  id: string;
  title: string;
  note?: string;
}

const tasks: Task[] = [
  { id: "brief", title: "Write the launch brief" },
  {
    id: "pricing",
    title: "Review the pricing page",
    note: "Legal wants the annual discount spelled out before this ships.",
  },
  { id: "changelog", title: "Publish the changelog" },
  { id: "invites", title: "Send beta invites", note: "Start with the waitlist from March." },
  { id: "retro", title: "Book the retro" },
];

const backlog: Task[] = [
  ...tasks,
  { id: "icons", title: "Export the new icons" },
  { id: "billing", title: "Fix the billing email", note: "The receipt link points at staging." },
  { id: "onboarding", title: "Record the onboarding video" },
  { id: "search", title: "Tune search ranking" },
  { id: "docs", title: "Update the API docs", note: "Cover the new rate limits and the retry header." },
  { id: "survey", title: "Send the customer survey" },
  { id: "archive", title: "Archive last quarter's board" },
];

const lengths = { short: tasks, long: backlog };
// Short titles, so the rows stay on one line in the narrow catalog card.
const preview: Task[] = [
  { id: "brief", title: "Launch brief" },
  { id: "pricing", title: "Pricing page" },
  { id: "changelog", title: "Changelog" },
];

function Row({ task, handle }: { task: Task; handle: boolean }) {
  return (
    <ReorderListItem>
      <div className="min-w-0 flex-1 py-3">
        <p className="font-medium">{task.title}</p>
        {task.note && <p className="text-muted-foreground mt-0.5 text-xs">{task.note}</p>}
      </div>
      {handle && <ReorderListHandle />}
    </ReorderListItem>
  );
}

export function ReorderListPreview() {
  return (
    <ReorderList
      label="Tasks"
      defaultItems={preview}
      getLabel={(task) => task.title}
      className="max-w-64 px-6"
    >
      {(task) => <Row task={task} handle />}
    </ReorderList>
  );
}

export function ReorderListDemo() {
  const [length, setLength] = useState<keyof typeof lengths>("short");
  const [handle, setHandle] = useState(true);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="w-full max-w-sm">
          <ReorderList
            key={length}
            label="Tasks"
            defaultItems={lengths[length]}
            getLabel={(task) => task.title}
            // The long list scrolls, so dragging a row to its edge scrolls it. The padding leaves
            // room for a lifted row's scale and shadow inside the clipped box.
            className={length === "long" ? "max-h-80 overflow-x-hidden overflow-y-auto p-2" : "p-2"}
          >
            {(task) => <Row task={task} handle={handle} />}
          </ReorderList>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="List" value={length} options={["short", "long"]} onChange={setLength} />
        <label className="component-demo-control">
          <span>Drag handle</span>
          <span className="flex h-8 items-center">
            <Switch checked={handle} onCheckedChange={setHandle} />
          </span>
        </label>
      </div>
    </div>
  );
}
