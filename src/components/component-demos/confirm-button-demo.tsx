"use client";

import { ConfirmButton, type ConfirmButtonProps } from "@/registry/components/confirm-button";

const directions: NonNullable<ConfirmButtonProps["direction"]>[] = ["right", "up", "left", "down"];

export function ConfirmButtonPreview() {
  return <ConfirmButton onConfirm={() => {}} />;
}

export function ConfirmButtonDemo() {
  return (
    <div className="not-prose demo-frame flex min-h-64 flex-wrap items-center justify-center gap-8 px-6 py-10">
      {directions.map((direction) => (
        <div key={direction} className="flex flex-col items-center gap-4">
          <span data-slot="confirm-direction" className="text-muted-foreground text-xs capitalize">
            {direction}
          </span>
          <ConfirmButton direction={direction} onConfirm={() => {}} />
        </div>
      ))}
    </div>
  );
}
