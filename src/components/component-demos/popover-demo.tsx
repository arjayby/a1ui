"use client";

import { ShareNetworkIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { Switch as DemoSwitch } from "@/components/ui/switch";
import { CopyButton } from "@/registry/components/copy-button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  type PopoverContentProps,
} from "@/registry/components/popover";

type Side = NonNullable<PopoverContentProps["side"]>;
const sides: Side[] = ["bottom", "top", "left", "right"];
const shareLink = "https://ui.arjayby1.xyz/";
const displayLink = "ui.arjayby1.xyz";

function SharePopover({ morph = true, side, duration }: { morph?: boolean; side?: Side; duration?: number }) {
  const copyRef = useRef<HTMLSpanElement>(null);

  return (
    <Popover morph={morph} duration={duration}>
      <PopoverTrigger render={morph ? undefined : <Button variant="outline" size="sm" />}>
        <ShareNetworkIcon aria-hidden="true" />
        Share
      </PopoverTrigger>
      <PopoverContent
        side={side}
        initialFocus={() => copyRef.current?.querySelector<HTMLElement>('[data-slot="copy-button"]') ?? true}
        className="grid w-80 gap-5"
      >
        <div className="grid gap-1.5">
          <PopoverTitle>Share this project</PopoverTitle>
          <PopoverDescription>Send the link to anyone you want to show a1ui to.</PopoverDescription>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            readOnly
            value={displayLink}
            aria-label="Project link"
            onFocus={(event) => event.currentTarget.select()}
            className="bg-muted/40 border-border focus-visible:ring-ring/30 h-9 min-w-0 flex-1 rounded-lg border px-3 font-mono text-xs outline-none focus-visible:ring-3"
          />
          <span ref={copyRef} className="contents">
            <CopyButton value={shareLink} label="Copy link" />
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PopoverPreview() {
  return <SharePopover />;
}

export function PopoverDemo() {
  const [morph, setMorph] = useState(true);
  const [side, setSide] = useState<Side>("bottom");
  const [duration, setDuration] = useState(0.3);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage min-h-[24rem]!">
        <SharePopover key={`${morph}-${duration}`} morph={morph} side={side} duration={duration} />
      </div>
      <div className="component-demo-controls">
        <label className="component-demo-control">
          <span>Morph</span>
          <span className="flex h-8 items-center">
            <DemoSwitch checked={morph} onCheckedChange={setMorph} />
          </span>
        </label>
        <DemoSelect label="Side" value={side} options={sides} onChange={setSide} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
