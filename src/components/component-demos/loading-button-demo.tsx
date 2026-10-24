"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { LoadingButton, type LoadingButtonProps } from "@/registry/components/loading-button";

const animations: NonNullable<LoadingButtonProps["animation"]>[] = ["blur", "slide", "flip"];
const buttonClassName =
  "data-[state=success]:text-(--status-success) data-[state=error]:text-destructive data-[state=success]:disabled:opacity-100";

function simulateRequest() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
}

async function simulateError() {
  await simulateRequest();
  throw new Error("Simulated request failed");
}

export function LoadingButtonPreview() {
  return (
    <LoadingButton
      onClick={simulateRequest}
      label="Submit"
      loadingLabel="Submitting"
      successLabel="Submitted"
      icon={null}
      className={buttonClassName}
    />
  );
}

export function LoadingButtonDemo() {
  const [animation, setAnimation] = useState<NonNullable<LoadingButtonProps["animation"]>>("blur");
  const [duration, setDuration] = useState(0.3);
  const [outcome, setOutcome] = useState<"success" | "error">("success");

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage" data-outcome={outcome}>
        <LoadingButton
          key={`${animation}-${duration}-${outcome}`}
          onClick={outcome === "error" ? simulateError : simulateRequest}
          label="Submit"
          loadingLabel="Submitting"
          successLabel="Submitted"
          errorLabel="Try again"
          icon={null}
          className={buttonClassName}
          animation={animation}
          duration={duration}
        />
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Animation" value={animation} options={animations} onChange={setAnimation} />
        <DemoSelect label="Outcome" value={outcome} options={["success", "error"]} onChange={setOutcome} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
