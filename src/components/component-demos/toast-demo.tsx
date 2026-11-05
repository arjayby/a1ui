"use client";

import { BellIcon, CheckCircleIcon, CloudArrowUpIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

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

function PreviewToasts() {
  const { add } = useToast();
  useEffect(() => {
    add({ id: "preview-older", title: "Event created", description: "Friday, 10:00" });
    add({
      id: "preview-newer",
      type: "success",
      title: "Changes saved",
      description: "Your profile is up to date.",
    });
  }, [add]);
  return null;
}

export function ToastPreview() {
  return (
    <ToastProvider timeout={0}>
      <PreviewToasts />
      <div className="relative h-36 w-full max-w-xs">
        <Toaster contained position="bottom-center" duration={0} label="Preview notifications" />
      </div>
    </ToastProvider>
  );
}

export function ToastDemo() {
  const [position, setPosition] = useState<ToastPosition>("bottom-right");
  const [duration, setDuration] = useState(0.45);
  const top = position.startsWith("top");

  return (
    <div className="not-prose demo-frame">
      <ToastProvider>
        <div
          className={`component-demo-stage relative min-h-[26rem]! ${top ? "items-end!" : "items-start!"}`}
        >
          <Triggers />
          <Toaster contained position={position} duration={duration} />
        </div>
      </ToastProvider>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-36">
        <DemoSelect label="Position" value={position} options={positions} onChange={setPosition} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
