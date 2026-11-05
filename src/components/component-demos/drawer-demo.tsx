"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerScaleWrapper,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/components/drawer";

type Side = "bottom" | "right";
const sides: Side[] = ["bottom", "right"];
type Background = "scale" | "none";
const backgrounds: Background[] = ["scale", "none"];

export function DrawerPreview() {
  return (
    <div aria-hidden="true" className="bg-muted relative h-full w-full max-w-56 overflow-hidden rounded-xl">
      <div className="bg-background absolute inset-x-3 top-3 h-12 scale-95 rounded-lg opacity-70" />
      <div className="bg-background border-border absolute inset-x-0 bottom-0 grid gap-2 rounded-t-2xl border border-b-0 px-4 pt-2.5 pb-4 shadow-lg">
        <div className="bg-muted-foreground/30 mx-auto h-1 w-10 rounded-full" />
        <div className="bg-foreground/80 h-2.5 w-24 rounded-full" />
        <div className="bg-muted-foreground/30 h-2 w-36 rounded-full" />
        <div className="bg-foreground mt-2 h-7 rounded-md" />
      </div>
    </div>
  );
}

function MoveGoal() {
  const [goal, setGoal] = useState(350);
  const step = (amount: number) => setGoal((current) => Math.min(800, Math.max(200, current + amount)));

  return (
    <>
      <DrawerHeader className="text-center">
        <DrawerTitle>Move goal</DrawerTitle>
        <DrawerDescription>
          Set your daily activity goal, or drag the sheet away to dismiss it.
        </DrawerDescription>
      </DrawerHeader>
      <div className="flex items-center justify-center gap-6 px-4 py-6">
        <button
          type="button"
          aria-label="Decrease goal"
          disabled={goal <= 200}
          onClick={() => step(-10)}
          className="border-border hover:bg-muted focus-visible:ring-ring/30 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border outline-none focus-visible:ring-3 disabled:opacity-50"
        >
          <MinusIcon weight="bold" className="size-4" />
        </button>
        <div className="grid min-w-24 text-center">
          <span className="text-5xl font-semibold tracking-tight tabular-nums">{goal}</span>
          <span className="text-muted-foreground text-xs uppercase">calories / day</span>
        </div>
        <button
          type="button"
          aria-label="Increase goal"
          disabled={goal >= 800}
          onClick={() => step(10)}
          className="border-border hover:bg-muted focus-visible:ring-ring/30 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border outline-none focus-visible:ring-3 disabled:opacity-50"
        >
          <PlusIcon weight="bold" className="size-4" />
        </button>
      </div>
      <DrawerFooter>
        <DrawerClose
          className={() =>
            "bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring/30 inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3"
          }
        >
          Save goal
        </DrawerClose>
        <DrawerClose>Cancel</DrawerClose>
      </DrawerFooter>
    </>
  );
}

export function DrawerDemo() {
  const [side, setSide] = useState<Side>("bottom");
  const [background, setBackground] = useState<Background>("scale");
  const [duration, setDuration] = useState(0.5);

  return (
    <div className="not-prose demo-frame">
      <div className="bg-muted">
        <DrawerScaleWrapper className="bg-background">
          <div className="component-demo-stage">
            <div className="grid justify-items-center gap-3 text-center">
              <p className="text-muted-foreground max-w-60 text-sm">
                Drag the sheet away to dismiss it, or pull it back to feel the resistance.
              </p>
              <Drawer
                key={`${side}-${background}-${duration}`}
                side={side}
                duration={duration}
                scaleBackground={background === "scale"}
              >
                <DrawerTrigger>Open drawer</DrawerTrigger>
                <DrawerContent>
                  <MoveGoal />
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </DrawerScaleWrapper>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Side" value={side} options={sides} onChange={setSide} />
        <DemoSelect label="Background" value={background} options={backgrounds} onChange={setBackground} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
