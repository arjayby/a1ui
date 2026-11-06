"use client";

import { CheckIcon, CopyIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { Switch as DemoSwitch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  type PopoverContentProps,
} from "@/registry/components/popover";
import { Switch } from "@/registry/components/switch";

type Side = NonNullable<PopoverContentProps["side"]>;
const sides: Side[] = ["bottom", "top", "left", "right"];
const shareLink = "a1ui.dev/s/q3-roadmap";

function SharePopover({ morph = true, side, duration }: { morph?: boolean; side?: Side; duration?: number }) {
  const [copied, setCopied] = useState(false);

  return (
    <Popover morph={morph} duration={duration} onOpenChange={(open) => open && setCopied(false)}>
      <PopoverTrigger render={morph ? undefined : <Button variant="outline" size="sm" />}>
        <ShareNetworkIcon aria-hidden="true" />
        Share
      </PopoverTrigger>
      <PopoverContent side={side} className="grid gap-4">
        <div className="grid gap-1">
          <PopoverTitle>Share roadmap</PopoverTitle>
          <PopoverDescription>Anyone you send this link to can open the Q3 roadmap.</PopoverDescription>
        </div>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareLink}
            aria-label="Share link"
            onFocus={(event) => event.currentTarget.select()}
            className="bg-muted/40 border-border focus-visible:ring-ring/30 h-8 min-w-0 flex-1 rounded-lg border px-3 font-mono text-xs outline-none focus-visible:ring-3"
          />
          <Button
            size="sm"
            variant="outline"
            aria-label={copied ? "Copied" : "Copy link"}
            onClick={() => {
              void navigator.clipboard?.writeText(`https://${shareLink}`).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? <CheckIcon aria-hidden="true" weight="bold" /> : <CopyIcon aria-hidden="true" />}
          </Button>
        </div>
        <Switch label="Allow comments" defaultChecked duration={duration} />
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
