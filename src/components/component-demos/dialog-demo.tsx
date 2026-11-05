"use client";

import { PencilSimpleIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/components/dialog";

type Dismiss = "outside click" | "buttons only";
const dismissOptions: Dismiss[] = ["outside click", "buttons only"];

const fieldClass =
  "border-border bg-background focus-visible:ring-ring/30 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-3";
const primaryClass = "bg-foreground text-background hover:bg-foreground/90 border-transparent";

export function DialogPreview() {
  return (
    <Dialog>
      <DialogTrigger>Open dialog</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite your team</DialogTitle>
          <DialogDescription>Teammates get access to every project in this workspace.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose className={primaryClass}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DialogDemo() {
  const [dismiss, setDismiss] = useState<Dismiss>("outside click");
  const [duration, setDuration] = useState(0.35);
  const [name, setName] = useState("Ada Lovelace");
  const dismissible = dismiss === "outside click";

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="flex w-full max-w-md flex-wrap items-center justify-between gap-3 px-4">
          <Dialog duration={duration} dismissible={dismissible}>
            <DialogTrigger>
              <PencilSimpleIcon aria-hidden="true" />
              Edit profile
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>Changes appear on your public profile right away.</DialogDescription>
              </DialogHeader>
              <label className="grid gap-1.5 text-sm font-medium">
                Display name
                <input
                  className={fieldClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <DialogFooter>
                <DialogClose>Cancel</DialogClose>
                <DialogClose className={primaryClass}>Save changes</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog duration={duration} dismissible={dismissible}>
            <DialogTrigger>
              <ShareNetworkIcon aria-hidden="true" />
              Share
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share this page</DialogTitle>
                <DialogDescription>Anyone with the link can view it.</DialogDescription>
              </DialogHeader>
              <input
                aria-label="Link"
                readOnly
                className={`${fieldClass} text-muted-foreground font-mono`}
                value="https://a1ui.dev/components/dialog"
              />
              <DialogFooter>
                <DialogClose className={primaryClass}>Done</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-36">
        <DemoSelect label="Dismiss" value={dismiss} options={dismissOptions} onChange={setDismiss} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
