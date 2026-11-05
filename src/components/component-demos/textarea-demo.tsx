"use client";

import { PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/registry/components/textarea";

type MaxRows = "4" | "6" | "8";
const maxRowsOptions: MaxRows[] = ["4", "6", "8"];
type Counter = "shown" | "hidden";
const counterOptions: Counter[] = ["shown", "hidden"];

export function TextareaPreview() {
  return (
    <Textarea
      aria-label="Message"
      defaultValue="Loved the new release. The motion feels calm."
      maxLength={120}
      showCount
      className="max-w-64"
    />
  );
}

export function TextareaDemo() {
  const [maxRows, setMaxRows] = useState<MaxRows>("6");
  const [counter, setCounter] = useState<Counter>("shown");
  const [duration, setDuration] = useState(0.25);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <form
          noValidate
          className="grid w-full max-w-sm gap-3 px-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!message.trim()) {
              setError("Write a message before sending.");
              return;
            }
            setMessage("");
            setSent(true);
          }}
        >
          <Textarea
            key={`${maxRows}-${duration}`}
            label="Feedback"
            name="feedback"
            required
            placeholder="Tell us what you think…"
            description="Press Enter for a new line."
            error={error}
            value={message}
            onValueChange={(next) => {
              setMessage(next);
              setError(undefined);
              setSent(false);
            }}
            minRows={2}
            maxRows={Number(maxRows)}
            maxLength={140}
            showCount={counter === "shown"}
            duration={duration}
          />
          <div className="flex items-center justify-end gap-3">
            <span role="status" className="text-muted-foreground text-sm">
              {sent ? "Thanks, sent." : ""}
            </span>
            <Button type="submit" size="sm">
              <PaperPlaneTiltIcon aria-hidden="true" weight="bold" />
              Send
            </Button>
          </div>
        </form>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-28">
        <DemoSelect label="Max rows" value={maxRows} options={maxRowsOptions} onChange={setMaxRows} />
        <DemoSelect label="Counter" value={counter} options={counterOptions} onChange={setCounter} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
