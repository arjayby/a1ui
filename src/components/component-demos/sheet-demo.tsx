"use client";

import { useState } from "react";

import { DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "@/registry/components/sheet";

const sides: SheetSide[] = ["bottom", "right", "left"];
const sizes = {
  "fit content": undefined,
  "half, full": [0.5, 1],
  "three stops": [0.3, 0.6, 1],
} satisfies Record<string, number[] | undefined>;
type Size = keyof typeof sizes;
const sizeOptions = Object.keys(sizes) as Size[];

const primaryClass = "bg-foreground text-background hover:bg-foreground/90 border-transparent";

const stops = [
  ["Ferry Building", "Now"],
  ["Embarcadero and Folsom", "4 min"],
  ["Brannan Street", "7 min"],
  ["2nd and King", "10 min"],
  ["4th and King", "13 min"],
  ["Mission Rock", "16 min"],
  ["UCSF Medical Center", "19 min"],
  ["Chase Center", "21 min"],
  ["20th Street", "24 min"],
  ["23rd Street", "26 min"],
  ["Marin Street", "29 min"],
  ["Hudson and Innes", "33 min"],
  ["Kirkwood and La Salle", "36 min"],
  ["Oakdale and Palou", "39 min"],
  ["Revere and Shafter", "42 min"],
  ["Williams Avenue", "45 min"],
  ["Carroll Avenue", "47 min"],
  ["Gilman and Paul", "50 min"],
  ["Le Conte Avenue", "53 min"],
  ["Arleta Avenue", "56 min"],
  ["Sunnydale", "59 min"],
] as const;

export function SheetPreview() {
  return (
    <Sheet>
      <SheetTrigger>Open sheet</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Route details</SheetTitle>
          <SheetDescription>Drag the sheet down to put it away.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose className={primaryClass}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function SheetDemo() {
  const [side, setSide] = useState<SheetSide>("bottom");
  const [size, setSize] = useState<Size>("half, full");
  const [pushBack, setPushBack] = useState(true);
  const detents = sizes[size];
  const rows = detents ? stops : stops.slice(0, 4);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="flex w-full max-w-md items-center justify-center px-4">
          {/* A new key gives each layout a fresh sheet that opens at its own default detent. */}
          <Sheet
            key={`${side}-${size}`}
            side={side}
            detents={detents}
            pushBack={pushBack && '[data-slot="sidebar-inset"]'}
          >
            <SheetTrigger>Show route</SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>T Third Street</SheetTitle>
                <SheetDescription>Outbound to Sunnydale. Trains run every 8 minutes.</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <ul className="divide-border divide-y text-sm">
                  {rows.map(([name, time]) => (
                    <li key={name} className="flex items-center justify-between gap-4 py-2.5">
                      <span>{name}</span>
                      <span className="text-muted-foreground font-mono text-xs tabular-nums">{time}</span>
                    </li>
                  ))}
                </ul>
              </SheetBody>
              <SheetFooter>
                <SheetClose className={primaryClass}>Done</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-32">
        <DemoSelect label="Side" value={side} options={sides} onChange={setSide} />
        <DemoSelect label="Detents" value={size} options={sizeOptions} onChange={setSize} />
        <DemoSwitch label="Push back" checked={pushBack} onChange={setPushBack} />
      </div>
    </div>
  );
}
