"use client";

import { Check, Copy } from "lucide-react";
import { useId, useState } from "react";

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
      <button
        type="button"
        onClick={copy}
        className="border-border hover:bg-muted inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-xs"
      >
        {status === "copied" ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        Copy prompt for agent
      </button>
      <span role="status" className="sr-only">
        {status === "copied"
          ? "Prompt copied. Paste it into your coding agent."
          : status === "error"
            ? "Clipboard unavailable. Copy the prompt below."
            : ""}
      </span>
      {status === "error" ? (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={id} className="text-xs">
            Copy this prompt into your agent
          </label>
          <textarea
            id={id}
            readOnly
            value={prompt}
            rows={7}
            onFocus={(event) => event.currentTarget.select()}
            className="border-border bg-background w-full max-w-xl rounded-sm border p-3 text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
