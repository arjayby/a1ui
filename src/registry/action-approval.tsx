"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type ProposedAction = {
  id: string;
  revision: number;
  title: string;
  tool: string;
  description?: string;
  impact?: string;
  input: Record<string, unknown>;
};
export type ActionDecision = {
  actionId: string;
  revision: number;
  decision: "approved" | "rejected";
  note: string;
};
export type ActionApprovalProps = {
  action: ProposedAction;
  status: "pending" | "approved" | "rejected" | "expired";
  onDecision: (decision: ActionDecision) => void | Promise<void>;
  decisionNote?: string;
  disabled?: boolean;
  className?: string;
};

export function ActionApproval(props: ActionApprovalProps) {
  return <ApprovalContent key={JSON.stringify([props.action.id, props.action.revision])} {...props} />;
}
function ApprovalContent({
  action,
  status,
  onDecision,
  decisionNote,
  disabled = false,
  className,
}: ActionApprovalProps) {
  const id = useId();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<ActionDecision["decision"] | null>(null);
  const [resolved, setResolved] = useState<ActionDecision | null>(null);
  const [error, setError] = useState("");
  const lock = useRef(false);
  let input: string;
  let invalid = false;
  try {
    input = JSON.stringify(action.input, null, 2);
    if (input === undefined) throw new Error("Missing input");
  } catch {
    input = "Tool inputs could not be displayed. Ask the host for a new request.";
    invalid = true;
  }
  const effectiveStatus = status === "pending" && resolved ? resolved.decision : status;
  const canDecide = effectiveStatus === "pending" && !pending && !disabled;
  async function decide(decision: ActionDecision["decision"]) {
    if (lock.current || !canDecide || (decision === "approved" && invalid)) return;
    const value = { actionId: action.id, revision: action.revision, decision, note: note.trim() };
    lock.current = true;
    setPending(decision);
    setError("");
    try {
      await onDecision(value);
      setResolved(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Decision could not be saved. Try again.");
    } finally {
      lock.current = false;
      setPending(null);
    }
  }
  return (
    <section
      aria-label="Action approval"
      aria-busy={!!pending}
      className={cn(
        "bg-background text-foreground flex min-w-0 flex-col gap-4 rounded-lg border p-4",
        className,
      )}
    >
      <h3 className="font-semibold break-words">{action.title}</h3>
      <p className="text-muted-foreground text-xs break-all">
        Tool: {action.tool} · Revision {action.revision}
      </p>
      {action.description && <p className="text-sm leading-relaxed break-words">{action.description}</p>}
      {action.impact && (
        <Alert role="note">
          <AlertDescription>{action.impact}</AlertDescription>
        </Alert>
      )}
      <details open className="min-w-0">
        <summary className="cursor-pointer py-2 font-medium">Tool inputs</summary>
        <pre
          className="max-h-64 overflow-auto rounded-md border p-3 text-xs"
          tabIndex={0}
          aria-label="Proposed tool inputs"
        >
          <code>{input}</code>
        </pre>
      </details>
      <p role="status" className="text-sm">
        {pending
          ? `Saving ${pending === "approved" ? "approval" : "rejection"}…`
          : effectiveStatus === "pending"
            ? "Awaiting your decision"
            : effectiveStatus === "approved"
              ? "Approved"
              : effectiveStatus === "rejected"
                ? "Rejected"
                : "Request expired"}
      </p>
      {effectiveStatus === "pending" ? (
        <>
          <FieldGroup>
            <Field data-disabled={!canDecide}>
              <FieldLabel htmlFor={id}>Decision note, optional</FieldLabel>
              <Textarea
                id={id}
                maxLength={2000}
                value={note}
                disabled={!canDecide}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={!canDecide || invalid} onClick={() => void decide("approved")}>
              Approve action
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canDecide}
              onClick={() => void decide("rejected")}
            >
              Reject action
            </Button>
          </div>
        </>
      ) : decisionNote || resolved?.note ? (
        <p className="text-sm break-words whitespace-pre-wrap">
          Decision note: {decisionNote ?? resolved?.note}
        </p>
      ) : null}
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
