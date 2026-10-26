"use client";

import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
      schema={emailSchema}
      className="max-w-xs"
    />
  );
}

export function ValidatedInputDemo() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<string>();

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <form
          className="flex w-full max-w-xs flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(emailSchema.parse(email));
          }}
        >
          <ValidatedInput
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            description="We'll send the receipt here."
            schema={emailSchema}
            value={email}
            onValueChange={(next) => {
              setEmail(next);
              setSubmitted(undefined);
            }}
          />
          <Button type="submit" className="self-start">
            Subscribe
          </Button>
        </form>
      </div>
      <div className="component-demo-controls">
        <div className="component-demo-control">
          <span>Submitted</span>
          <span
            data-slot="validated-input-demo-result"
            className="text-foreground flex h-8 items-center font-mono text-xs"
          >
            {submitted ?? "Nothing yet"}
          </span>
        </div>
      </div>
    </div>
  );
}
