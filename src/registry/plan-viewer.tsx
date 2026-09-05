"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type PlanStep = {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "running" | "complete" | "error" | "skipped";
  error?: string;
};
export type ChatPlan = {
  id: string;
  revision: number;
  title: string;
  status: "proposed" | "approved" | "running" | "complete" | "error";
  steps: readonly PlanStep[];
};
export type PlanViewerProps = {
  plan: ChatPlan;
  onStepsChange?: (plan: ChatPlan) => void | Promise<void>;
  onApprove?: (plan: ChatPlan) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function PlanViewer(props: PlanViewerProps) {
  return <PlanContent key={JSON.stringify([props.plan.id, props.plan.revision])} {...props} />;
}
function PlanContent({ plan, onStepsChange, onApprove, disabled = false, className }: PlanViewerProps) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlanStep[]>([]);
  const [pending, setPending] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const editTrigger = useRef<HTMLButtonElement>(null);
  const editable = plan.status === "proposed" && !approved;
  const finished = plan.steps.filter(
    (step) => step.status === "complete" || step.status === "skipped",
  ).length;
  const valid = draft.length > 0 && draft.every((step) => step.title.trim());
  function close() {
    setEditing(false);
    requestAnimationFrame(() => editTrigger.current?.focus());
  }
  async function run(action: () => void | Promise<void>, done: () => void) {
    if (lock.current || disabled || !editable) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      done();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the plan. Try again.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function move(index: number, offset: number) {
    setDraft((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  return (
    <section
      aria-label="Plan viewer"
      aria-busy={pending}
      className={cn(
        "bg-background text-foreground flex min-w-0 flex-col gap-4 rounded-lg border p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold break-words">{plan.title}</h3>
        <span className="text-muted-foreground text-xs">Revision {plan.revision}</span>
      </div>
      <p role="status" className="text-sm">
        {pending
          ? "Saving plan…"
          : approved && plan.status === "proposed"
            ? "Approval submitted"
            : plan.status}{" "}
        · {finished} of {plan.steps.length} steps finished
      </p>
      {plan.steps.length > 0 && (
        <progress
          aria-label="Plan execution progress"
          className="w-full"
          value={finished}
          max={plan.steps.length}
        />
      )}
      {editing && editable ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && onStepsChange)
              void run(
                () =>
                  onStepsChange({
                    ...plan,
                    steps: draft.map((step) => ({ ...step, title: step.title.trim() })),
                  }),
                close,
              );
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) close();
          }}
        >
          <FieldGroup>
            {draft.map((step, index) => (
              <div key={step.id} className="flex flex-col gap-3 rounded-md border p-3">
                <Field data-disabled={pending || disabled}>
                  <FieldLabel htmlFor={`${id}-${step.id}-title`}>Step {index + 1} title</FieldLabel>
                  <Input
                    autoFocus={index === 0}
                    id={`${id}-${step.id}-title`}
                    value={step.title}
                    maxLength={200}
                    disabled={pending || disabled}
                    onChange={(event) =>
                      setDraft((current) =>
                        current.map((item) =>
                          item.id === step.id ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field data-disabled={pending || disabled}>
                  <FieldLabel htmlFor={`${id}-${step.id}-description`}>Step {index + 1} details</FieldLabel>
                  <Textarea
                    id={`${id}-${step.id}-description`}
                    value={step.description ?? ""}
                    disabled={pending || disabled}
                    onChange={(event) =>
                      setDraft((current) =>
                        current.map((item) =>
                          item.id === step.id ? { ...item, description: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === 0 || pending || disabled}
                    aria-label={`Move step ${index + 1} up`}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={index === draft.length - 1 || pending || disabled}
                    aria-label={`Move step ${index + 1} down`}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending || disabled}
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() => setDraft((current) => current.filter((item) => item.id !== step.id))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || disabled}
              onClick={() =>
                setDraft((current) => [...current, { id: crypto.randomUUID(), title: "", status: "pending" }])
              }
            >
              Add step
            </Button>
            <Button type="submit" size="sm" disabled={!valid || pending || disabled}>
              Save plan
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {plan.steps.map((step, index) => (
              <li
                key={step.id}
                aria-current={step.status === "running" ? "step" : undefined}
                data-state={step.status}
                className="flex min-w-0 flex-col gap-1 rounded-md border p-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium break-words">
                    {index + 1}. {step.title}
                  </span>
                  <span className="text-muted-foreground text-xs">{step.status}</span>
                </div>
                {step.description && (
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {step.description}
                  </p>
                )}
                {step.status === "error" && (
                  <p role="alert" className="text-sm break-words">
                    {step.error || "This step failed."}
                  </p>
                )}
              </li>
            ))}
          </ol>
          {plan.steps.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No steps proposed</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          {editable && (
            <div className="flex flex-wrap gap-2">
              {onStepsChange && (
                <Button
                  ref={editTrigger}
                  type="button"
                  variant="outline"
                  disabled={pending || disabled}
                  onClick={() => {
                    setDraft(plan.steps.map((step) => ({ ...step })));
                    setEditing(true);
                    setError("");
                  }}
                >
                  Edit plan
                </Button>
              )}
              {onApprove && (
                <Button
                  type="button"
                  disabled={
                    pending || disabled || !plan.steps.length || plan.steps.some((step) => !step.title.trim())
                  }
                  onClick={() =>
                    void run(
                      () => onApprove(plan),
                      () => setApproved(true),
                    )
                  }
                >
                  Approve plan
                </Button>
              )}
            </div>
          )}
        </>
      )}
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
