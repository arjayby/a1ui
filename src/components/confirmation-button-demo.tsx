"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { ConfirmationButton } from "@/registry/confirmation-button";

export function ConfirmationButtonPreview() {
  return (
    <div className="not-prose demo-frame confirmation-button-preview">
      <div className="w-[280px] shrink-0 scale-75">
        <ConfirmationButton onConfirm={() => {}} />
      </div>
    </div>
  );
}

export function ConfirmationButtonDemo() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "confirmed">("idle");

  return (
    <>
      <div className="not-prose demo-frame confirmation-button-demo">
        <div className="confirmation-button-demo-stage">
          <ConfirmationButton
            key={attempt}
            className="max-w-[280px]"
            onConfirm={async () => {
              setStatus("pending");
              await new Promise<void>((resolve) => window.setTimeout(resolve, 900));
              setStatus("confirmed");
            }}
          />
        </div>
        <div className="confirmation-button-demo-footer">
          <span>Drag right to confirm</span>
          <button
            type="button"
            disabled={status !== "confirmed"}
            onClick={() => {
              setStatus("idle");
              setAttempt((value) => value + 1);
            }}
          >
            <RotateCcw aria-hidden="true" />
            Reset demo
          </button>
        </div>
      </div>
      <p className="demo-caption">
        Release at the end to confirm. Let go early to return. You can also focus the arrow and press Enter or
        Space.
      </p>
    </>
  );
}
