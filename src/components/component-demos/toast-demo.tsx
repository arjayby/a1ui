"use client";

import { BellIcon, CheckCircleIcon, CloudArrowUpIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { Toaster, ToastProvider, useToast, type ToastPosition } from "@/registry/components/toast";

const positions: ToastPosition[] = [
  "bottom-right",
  "bottom-center",
  "bottom-left",
  "top-right",
  "top-center",
  "top-left",
];

const maxOptions = ["1", "2", "3", "4", "5"] as const;

function Triggers() {
  const toast = useToast();

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          toast.add({ title: "Event created", description: "Friday, 10:00 with the design team." })
        }
      >
        <BellIcon aria-hidden="true" />
        Default
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          toast.add({ type: "success", title: "Changes saved", description: "Your profile is up to date." })
        }
      >
        <CheckCircleIcon aria-hidden="true" />
        Success
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          toast.add({
            type: "error",
            title: "Payment declined",
            description: "Check the card details and try again.",
          })
        }
      >
        <WarningCircleIcon aria-hidden="true" />
        Error
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          void toast.promise(new Promise((resolve) => setTimeout(resolve, 1800)), {
            loading: { title: "Uploading report", description: "q3-summary.pdf" },
            success: { title: "Report uploaded", description: "Shared with 4 people." },
            error: "Upload failed",
          })
        }
      >
        <CloudArrowUpIcon aria-hidden="true" />
        Loading
      </Button>
    </div>
  );
}

export function ToastDemo() {
  const [position, setPosition] = useState<ToastPosition>("bottom-right");
  const [duration, setDuration] = useState(0.45);
  const [max, setMax] = useState<(typeof maxOptions)[number]>("3");

  return (
    <div className="not-prose demo-frame">
      <ToastProvider max={Number(max)}>
        <div className="component-demo-stage">
          <Triggers />
        </div>
        <Toaster position={position} duration={duration} />
      </ToastProvider>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-36">
        <DemoSelect label="Position" value={position} options={positions} onChange={setPosition} />
        <DemoSelect label="Max toasts" value={max} options={maxOptions} onChange={setMax} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
