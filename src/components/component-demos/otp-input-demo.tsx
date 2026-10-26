"use client";

import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { OtpInput } from "@/registry/components/otp-input";

const lengths = ["4", "5", "6", "7", "8"] as const;
const modes = ["numeric", "alphanumeric"] as const;
const answers = { numeric: "12345678", alphanumeric: "A1B2C3D4" } satisfies Record<
  (typeof modes)[number],
  string
>;

export function OtpInputPreview() {
  return <OtpInput label="Verification code" length={6} defaultValue="482" />;
}

export function OtpInputDemo() {
  const [length, setLength] = useState<(typeof lengths)[number]>("6");
  const [mode, setMode] = useState<(typeof modes)[number]>("numeric");
  const [code, setCode] = useState("");
  const answer = answers[mode].slice(0, Number(length));
  const complete = code.length === answer.length;

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <OtpInput
          key={`${length}-${mode}`}
          label="Verification code"
          length={Number(length)}
          mode={mode}
          success={complete && code === answer}
          invalid={complete && code !== answer}
          onValueChange={setCode}
        />
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-36">
        <DemoSelect
          label="Length"
          value={length}
          options={lengths}
          onChange={(next) => {
            setLength(next);
            setCode("");
          }}
        />
        <DemoSelect
          label="Characters"
          value={mode}
          options={modes}
          onChange={(next) => {
            setMode(next);
            setCode("");
          }}
        />
        <div className="component-demo-control">
          <span>Correct code</span>
          <span
            data-slot="otp-demo-answer"
            className="text-foreground flex h-8 items-center font-mono text-xs"
          >
            {answer}
          </span>
        </div>
      </div>
    </div>
  );
}
