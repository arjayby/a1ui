"use client";

import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { Switch } from "@/components/ui/switch";
import { OtpInput } from "@/registry/components/otp-input";

const lengths = ["4", "5", "6", "7", "8"] as const;
const modes = ["numeric", "alphanumeric"] as const;

export function OtpInputPreview() {
  return <OtpInput label="Verification code" length={6} defaultValue="482" />;
}

export function OtpInputDemo() {
  const [length, setLength] = useState<(typeof lengths)[number]>("6");
  const [mode, setMode] = useState<(typeof modes)[number]>("numeric");
  const [invalid, setInvalid] = useState(false);
  const [code, setCode] = useState("");

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage flex-col gap-4">
        <OtpInput
          key={`${length}-${mode}`}
          label="Verification code"
          length={Number(length)}
          mode={mode}
          invalid={invalid}
          onValueChange={setCode}
        />
        <p aria-live="polite" className="text-muted-foreground font-mono text-xs tabular-nums">
          {code.length === Number(length) ? `Entered ${code}` : `${code.length} / ${length}`}
        </p>
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
        <label className="component-demo-control">
          <span>Invalid</span>
          <span className="flex h-8 items-center">
            <Switch checked={invalid} onCheckedChange={setInvalid} />
          </span>
        </label>
      </div>
    </div>
  );
}
