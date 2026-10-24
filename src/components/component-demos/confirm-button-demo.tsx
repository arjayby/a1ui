"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { ConfirmButton, type ConfirmButtonProps } from "@/registry/components/confirm-button";

const directions: NonNullable<ConfirmButtonProps["direction"]>[] = ["right", "up", "left", "down"];
const animations: NonNullable<ConfirmButtonProps["animation"]>[] = ["blur", "slide", "flip"];

export function ConfirmButtonPreview() {
  return <ConfirmButton onConfirm={() => {}} />;
}

export function ConfirmButtonDemo() {
  const [direction, setDirection] = useState<NonNullable<ConfirmButtonProps["direction"]>>("right");
  const [animation, setAnimation] = useState<NonNullable<ConfirmButtonProps["animation"]>>("blur");
  const [duration, setDuration] = useState(1.5);
  const [transitionDuration, setTransitionDuration] = useState(0.2);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <ConfirmButton
          key={`${direction}-${animation}-${duration}-${transitionDuration}`}
          direction={direction}
          animation={animation}
          duration={duration}
          transitionDuration={transitionDuration}
          onConfirm={() => {}}
        />
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Direction" value={direction} options={directions} onChange={setDirection} />
        <DemoSelect label="Animation" value={animation} options={animations} onChange={setAnimation} />
        <DemoDuration label="Hold duration" value={duration} min={0.5} max={3} onChange={setDuration} />
        <DemoDuration value={transitionDuration} onChange={setTransitionDuration} />
      </div>
    </div>
  );
}
