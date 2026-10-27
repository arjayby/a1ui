"use client";

import { z } from "zod";

import { ValidatedInput } from "@/registry/components/validated-input";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."));

export function ValidatedInputPreview() {
  return (
    <ValidatedInput
      label="Email"
      type="email"
      placeholder="you@example.com"
      description="We'll never share it."
      schema={emailSchema}
      className="max-w-72 px-6"
    />
  );
}

export function ValidatedInputDemo() {
  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        {/* Enter submits the single-field form, which reveals any schema error. */}
        <form className="w-full max-w-xs [&_p]:m-0!" onSubmit={(event) => event.preventDefault()}>
          <ValidatedInput
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            description="We'll never share it."
            schema={emailSchema}
          />
        </form>
      </div>
    </div>
  );
}
