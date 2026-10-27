"use client";

import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { defaultPasswordRules, PasswordInput } from "@/registry/components/password-input";

const lengths = ["8", "12", "16"] as const;

const rulesFor = (length: number) => [
  { label: `At least ${length} characters`, test: (value: string) => value.length >= length },
  ...defaultPasswordRules.slice(1),
];

// The catalog card is short, so its preview drops the letter-case rule.
const previewRules = [defaultPasswordRules[0], ...defaultPasswordRules.slice(2)];

export function PasswordInputPreview() {
  return (
    <PasswordInput label="Password" defaultValue="graphite7" rules={previewRules} className="max-w-72 px-6" />
  );
}

export function PasswordInputDemo() {
  const [length, setLength] = useState<(typeof lengths)[number]>("8");

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        {/* Enter submits the single-field form, which marks any unmet rule. */}
        <form
          className="w-full max-w-xs [&_p]:m-0! [&_ul]:m-0! [&_ul]:p-0!"
          onSubmit={(event) => event.preventDefault()}
        >
          <PasswordInput label="Password" name="password" rules={rulesFor(Number(length))} />
        </form>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Min length" value={length} options={lengths} onChange={setLength} />
      </div>
    </div>
  );
}
