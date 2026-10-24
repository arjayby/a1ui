"use client";

import { useId, useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/registry/components/copy-button";

export function CopyAgentPrompt({ prompt }: { prompt: string }) {
  const [error, setError] = useState(false);
  const id = useId();

  return (
    <div className="max-w-full">
      <CopyButton
        value={prompt}
        label="Copy prompt for agent"
        copiedLabel="Copy prompt for agent"
        onCopy={() => setError(false)}
        onCopyError={() => setError(true)}
      />
      {error ? (
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
