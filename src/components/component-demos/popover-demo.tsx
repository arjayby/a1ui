"use client";

import { ChatCircleDotsIcon, CheckIcon, GearSixIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  type PopoverContentProps,
} from "@/registry/components/popover";
import { Switch } from "@/registry/components/switch";

type Side = NonNullable<PopoverContentProps["side"]>;
const sides: Side[] = ["bottom", "top", "left", "right"];

function SettingsPopover({ side, duration }: { side?: Side; duration?: number }) {
  return (
    <Popover duration={duration}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <GearSixIcon aria-hidden="true" />
        Settings
      </PopoverTrigger>
      <PopoverContent side={side} className="grid w-64 gap-4">
        <div className="grid gap-1">
          <PopoverTitle>Display</PopoverTitle>
          <PopoverDescription>Tune how the inbox looks on this device.</PopoverDescription>
        </div>
        <div className="grid gap-3">
          <Switch label="Compact rows" defaultChecked duration={duration} />
          <Switch label="Show avatars" duration={duration} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FeedbackPopover({ duration }: { duration?: number }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <Popover
      morph
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSent(false);
      }}
      duration={duration}
    >
      <PopoverTrigger>
        {sent ? <CheckIcon aria-hidden="true" weight="bold" /> : <ChatCircleDotsIcon aria-hidden="true" />}
        {sent ? "Thanks!" : "Feedback"}
      </PopoverTrigger>
      <PopoverContent align="start">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
            setOpen(false);
          }}
        >
          <PopoverTitle>Send feedback</PopoverTitle>
          <textarea
            name="feedback"
            aria-label="Feedback"
            placeholder="What could be better?"
            required
            rows={4}
            className="bg-muted/40 border-border placeholder:text-muted-foreground focus-visible:ring-ring/30 w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
          />
          <div className="flex items-center justify-end gap-2">
            <PopoverClose render={<Button variant="ghost" size="sm" />}>Cancel</PopoverClose>
            <Button type="submit" size="sm">
              <PaperPlaneTiltIcon aria-hidden="true" />
              Send
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function PopoverPreview() {
  return <SettingsPopover />;
}

export function PopoverDemo() {
  const [side, setSide] = useState<Side>("bottom");
  const [duration, setDuration] = useState(0.3);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage min-h-[20rem]! items-start!">
        <div key={duration} className="flex w-full max-w-md items-start justify-between gap-3">
          <FeedbackPopover duration={duration} />
          <SettingsPopover side={side} duration={duration} />
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Settings side" value={side} options={sides} onChange={setSide} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
