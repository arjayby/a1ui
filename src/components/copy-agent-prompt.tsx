"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CopyAgentPrompt({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const id = useId();

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-full">
      <Button variant="outline" size="default" onClick={copy}>
        {status === "copied" ? (
          <CheckIcon aria-hidden="true" className="size-3.5" />
        ) : (
          <CopyIcon aria-hidden="true" className="size-3.5" />
        )}
        Copy prompt for agent
      </Button>
      <span role="status" className="sr-only">
        {status === "copied"
          ? "Prompt copied. Paste it into your coding agent."
          : status === "error"
            ? "Clipboard unavailable. Copy the prompt below."
            : ""}
      </span>
      {status === "error" ? (
        <div className="mt-3 flex flex-col gap-2">
          <Label htmlFor={id}>Copy this prompt into your agent</Label>
          <Textarea
            id={id}
            readOnly
            value={prompt}
            rows={7}
            onFocus={(event) => event.currentTarget.select()}
            className="max-w-xl font-mono text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
