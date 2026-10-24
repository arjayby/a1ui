"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { CopyButton, type CopyButtonProps } from "@/registry/components/copy-button";

const animations: NonNullable<CopyButtonProps["animation"]>[] = ["blur", "slide", "flip"];

export function CopyButtonDemo() {
  const [animation, setAnimation] = useState<NonNullable<CopyButtonProps["animation"]>>("blur");
  const [duration, setDuration] = useState(0.3);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <CopyButton
          key={`${animation}-${duration}`}
          value="hello@a1ui.dev"
          animation={animation}
          duration={duration}
        />
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Animation" value={animation} options={animations} onChange={setAnimation} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
