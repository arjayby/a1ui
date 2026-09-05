"use client";

import { useState } from "react";
import { PlanViewer, type ChatPlan } from "@/registry/plan-viewer";
import { Button } from "@/components/ui/button";

const initial: ChatPlan = {
  id: "launch",
  revision: 1,
  title: "Prepare a release",
  status: "proposed",
  steps: [
    {
      id: "review",
      title: "Review the changes",
      description: "Check the release diff and open questions.",
      status: "pending",
    },
    { id: "test", title: "Run the checks", description: "Validate the main user flows.", status: "pending" },
    {
      id: "notes",
      title: "Draft release notes",
      description: "Explain what changed and why.",
      status: "pending",
    },
  ],
};
export function PlanViewerDemo() {
  const [plan, setPlan] = useState(initial);
  function advance() {
    setPlan((current) => {
      const steps = current.steps.map((step) =>
        step.status === "running" ? { ...step, status: "complete" as const } : step,
      );
      const next = steps.findIndex((step) => step.status === "pending");
      if (next >= 0) steps[next] = { ...steps[next], status: "running" };
      return { ...current, steps, status: next >= 0 ? "running" : "complete" };
    });
  }
  return (
    <div className="not-prose flex flex-col gap-4">
      <PlanViewer
        plan={plan}
        onStepsChange={(updated) => setPlan({ ...updated, revision: updated.revision + 1 })}
        onApprove={async (updated) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setPlan({ ...updated, status: "approved" });
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={plan.status !== "approved" && plan.status !== "running"}
          onClick={advance}
        >
          Advance simulated execution
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPlan((current) => ({ ...initial, revision: current.revision + 1 }))}
        >
          Reset plan
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Edit and approve the proposal, then advance each simulated step. No tools or commands run.
      </p>
    </div>
  );
}
