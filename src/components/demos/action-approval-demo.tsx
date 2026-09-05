"use client";

import { useState } from "react";
import { ActionApproval, type ActionApprovalProps } from "@/registry/action-approval";
import { Button } from "@/components/ui/button";

export function ActionApprovalDemo() {
  const [revision, setRevision] = useState(1);
  const [status, setStatus] = useState<ActionApprovalProps["status"]>("pending");
  const [note, setNote] = useState("");
  const [fail, setFail] = useState(false);
  const [saving, setSaving] = useState(false);
  return (
    <div className="not-prose flex flex-col gap-4">
      <ActionApproval
        action={{
          id: "draft-notes",
          revision,
          title: "Create release-notes.md",
          tool: "write_file",
          description: "Create a draft from the reviewed changes.",
          impact: "Proposed effect: create one file in the current project.",
          input: {
            path: "docs/release-notes.md",
            overwrite: false,
            content: "# Release notes\n\nDraft for review.",
          },
        }}
        status={status}
        decisionNote={note}
        onDecision={async (decision) => {
          setSaving(true);
          try {
            await new Promise((resolve) => setTimeout(resolve, 600));
            if (fail) {
              setFail(false);
              throw new Error("Simulated save failure. Your decision was not recorded. Try again.");
            }
            setStatus(decision.decision);
            setNote(decision.note);
          } finally {
            setSaving(false);
          }
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={saving || status !== "pending" || fail}
          onClick={() => setFail(true)}
        >
          {fail ? "Next decision will fail" : "Simulate save failure"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={saving || status !== "pending"}
          onClick={() => setStatus("expired")}
        >
          Expire request
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            setRevision((value) => value + 1);
            setStatus("pending");
            setNote("");
            setFail(false);
          }}
        >
          New request
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        This demo records decisions in memory after a simulated delay. It does not write files or execute the
        displayed tool.
      </p>
    </div>
  );
}
