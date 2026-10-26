"use client";

import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { TagInput } from "@/registry/components/tag-input";

const limits = ["3", "5", "8"] as const;

export function TagInputPreview() {
  return (
    <TagInput
      label="Topics"
      defaultValue={["Design", "Motion"]}
      max={5}
      placeholder="Add a topic"
      className="max-w-xs"
    />
  );
}

export function TagInputDemo() {
  const [limit, setLimit] = useState<(typeof limits)[number]>("5");
  const [tags, setTags] = useState(["Design", "Motion", "React"]);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <TagInput
          label="Topics"
          name="topics"
          placeholder="Add a topic"
          description="Press Enter or comma to add. Backspace twice to remove."
          max={Number(limit)}
          value={tags}
          onValueChange={setTags}
          className="max-w-sm"
        />
      </div>
      <div className="component-demo-controls">
        <DemoSelect
          label="Max tags"
          value={limit}
          options={limits}
          onChange={(next) => {
            setLimit(next);
            setTags((current) => current.slice(0, Number(next)));
          }}
        />
      </div>
    </div>
  );
}
