"use client";

import { useState } from "react";
import { MessageActions, type MessageFeedback } from "@/registry/message-actions";
import { Button } from "@/components/ui/button";

export function MessageActionsDemo() {
  const [text, setText] = useState(
    "Start with a small prototype.\n\nTest the main task with three people, then revise the flow.",
  );
  const [feedback, setFeedback] = useState<MessageFeedback>(null);
  const [status, setStatus] = useState<"ready" | "streaming" | "error">("ready");
  const [revision, setRevision] = useState(1);
  async function regenerate() {
    await new Promise((resolve) => setTimeout(resolve, 600));
    setRevision((value) => value + 1);
    setText(
      "Build one complete flow.\n\nAsk people to try it without instructions. Record where they get stuck.",
    );
    setStatus("ready");
    setFeedback(null);
  }
  return (
    <div className="not-prose flex flex-col gap-4 rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">Response · revision {revision}</p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      <MessageActions
        messageId="demo-response"
        text={text}
        status={status}
        feedback={feedback}
        onEdit={(_id, value) => setText(value)}
        onRegenerate={regenerate}
        onRetry={regenerate}
        onFeedback={(_id, value) => setFeedback(value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStatus(status === "streaming" ? "ready" : "streaming")}
        >
          {status === "streaming" ? "Finish streaming simulation" : "Simulate streaming"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setStatus("error")}>
          Simulate response error
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Copy uses your clipboard. Edits and feedback stay in memory. Regenerate and retry use a canned
        response after a simulated delay.
      </p>
    </div>
  );
}
