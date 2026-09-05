"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type MessageFeedback = "positive" | "negative" | null;
export type MessageActionsProps = {
  messageId: string;
  text: string;
  status?: "ready" | "streaming" | "error";
  feedback?: MessageFeedback;
  onCopy?: (text: string) => void | Promise<void>;
  onEdit?: (messageId: string, text: string) => void | Promise<void>;
  onRegenerate?: (messageId: string) => void | Promise<void>;
  onRetry?: (messageId: string) => void | Promise<void>;
  onFeedback?: (messageId: string, feedback: MessageFeedback) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function MessageActions(props: MessageActionsProps) {
  return <Actions key={props.messageId} {...props} />;
}
function Actions({
  messageId,
  text,
  status = "ready",
  feedback = null,
  onCopy,
  onEdit,
  onRegenerate,
  onRetry,
  onFeedback,
  disabled = false,
  className,
}: MessageActionsProps) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedText, setCopiedText] = useState<string>();
  const [error, setError] = useState("");
  const lock = useRef(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const unavailable = disabled || status === "streaming" || !!pending;
  async function run(label: string, action: () => void | Promise<void>) {
    if (lock.current || unavailable) return false;
    lock.current = true;
    setPending(label);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(`${label} complete.`);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${label} failed. Try again.`);
      return false;
    } finally {
      lock.current = false;
      setPending("");
    }
  }
  function close() {
    setEditing(false);
    editButton.current?.focus();
  }
  return (
    <div
      role="group"
      aria-label="Message actions"
      aria-busy={!!pending}
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={unavailable || !text || editing}
          onClick={() =>
            void run("Copy", async () => {
              if (onCopy) await onCopy(text);
              else {
                if (!navigator.clipboard)
                  throw new Error("Clipboard unavailable. Use a secure connection or provide onCopy.");
                await navigator.clipboard.writeText(text);
              }
              setCopiedText(text);
            })
          }
        >
          {copiedText === text ? "Copied" : "Copy response"}
        </Button>
        {onEdit && (
          <Button
            ref={editButton}
            type="button"
            variant="outline"
            size="sm"
            disabled={unavailable || editing}
            onClick={() => {
              setDraft(text);
              setEditing(true);
              setError("");
            }}
          >
            Edit
          </Button>
        )}
        {onRegenerate && status !== "error" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unavailable || editing}
            onClick={() => void run("Regenerate", () => onRegenerate(messageId))}
          >
            Regenerate
          </Button>
        )}
        {onRetry && status === "error" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unavailable || editing}
            onClick={() => void run("Retry", () => onRetry(messageId))}
          >
            Retry response
          </Button>
        )}
      </div>
      {editing && (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (onEdit && draft.trim() && (await run("Edit", () => onEdit(messageId, draft)))) close();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) close();
          }}
        >
          <FieldGroup>
            <Field data-disabled={unavailable}>
              <FieldLabel htmlFor={`${id}-edit`}>Edit message</FieldLabel>
              <Textarea
                id={`${id}-edit`}
                autoFocus
                value={draft}
                disabled={unavailable}
                onChange={(event) => setDraft(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={unavailable || !draft.trim()}>
              Save edit
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!!pending} onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {onFeedback && (
        <FieldSet disabled={unavailable || editing || status !== "ready"}>
          <FieldLegend variant="label">Response feedback</FieldLegend>
          <div className="flex flex-wrap items-center gap-3">
            {(["positive", "negative"] as const).map((value) => (
              <Field key={value} orientation="horizontal" className="w-auto">
                <input
                  id={`${id}-${value}`}
                  type="radio"
                  name={`${id}-feedback`}
                  value={value}
                  checked={feedback === value}
                  onChange={() => void run("Feedback", () => onFeedback(messageId, value))}
                />
                <FieldLabel htmlFor={`${id}-${value}`}>
                  {value === "positive" ? "Helpful" : "Not helpful"}
                </FieldLabel>
              </Field>
            ))}
            {feedback && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void run("Feedback", () => onFeedback(messageId, null))}
              >
                Clear feedback
              </Button>
            )}
          </div>
        </FieldSet>
      )}
      <p role="status" className="text-muted-foreground text-xs">
        {pending
          ? `${pending} in progress…`
          : status === "streaming"
            ? "Actions available when the response finishes."
            : notice}
      </p>
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
