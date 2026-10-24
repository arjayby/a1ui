"use client";

import { LoadingButton, type LoadingButtonProps } from "@/registry/components/loading-button";

const animations: NonNullable<LoadingButtonProps["animation"]>[] = ["blur", "slide", "flip"];
const buttonClassName =
  "data-[state=success]:text-(--status-success) data-[state=error]:text-destructive data-[state=success]:disabled:opacity-100";

function simulateRequest() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
}

async function simulateError() {
  await simulateRequest();
  throw new Error("Simulated request failed");
}

export function LoadingButtonPreview() {
  return (
    <LoadingButton
      onClick={simulateRequest}
      label="Submit"
      loadingLabel="Submitting"
      successLabel="Submitted"
      icon={null}
      className={buttonClassName}
    />
  );
}

export function LoadingButtonDemo() {
  return (
    <div className="not-prose demo-frame flex min-h-64 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center justify-center gap-8">
        {animations.map((animation) => (
          <div
            key={animation}
            data-outcome="success"
            className="flex w-36 shrink-0 flex-col items-center justify-center gap-4"
          >
            <span className="text-muted-foreground text-xs capitalize">{animation}</span>
            <LoadingButton
              onClick={simulateRequest}
              label="Submit"
              loadingLabel="Submitting"
              successLabel="Submitted"
              icon={null}
              className={buttonClassName}
              animation={animation}
              duration={0.3}
            />
          </div>
        ))}
        <div data-outcome="error" className="flex w-36 shrink-0 flex-col items-center justify-center gap-4">
          <span className="text-muted-foreground text-xs">Error</span>
          <LoadingButton
            onClick={simulateError}
            label="Submit"
            loadingLabel="Submitting"
            errorLabel="Try again"
            icon={null}
            className={buttonClassName}
            animation="blur"
            duration={0.3}
          />
        </div>
      </div>
    </div>
  );
}
