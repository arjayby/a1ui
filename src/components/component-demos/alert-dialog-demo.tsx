"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  type AlertDialogActionProps,
} from "@/registry/components/alert-dialog";

type Variant = NonNullable<AlertDialogActionProps["variant"]>;
const variants: Variant[] = ["destructive", "default"];

export function AlertDialogPreview() {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>Sign out</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Sign out of a1ui?</AlertDialogTitle>
        <AlertDialogDescription>You will need to sign in again to edit your projects.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction>Sign out</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AlertDialogDemo() {
  const [variant, setVariant] = useState<Variant>("destructive");
  const [duration, setDuration] = useState(0.3);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <AlertDialog duration={duration}>
          <AlertDialogTrigger
            render={<Button variant={variant === "destructive" ? "destructive" : "outline"} />}
          >
            Delete project
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes its deployments and every preview link. You can’t undo this.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant={variant}>Delete project</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-32">
        <DemoSelect label="Action" value={variant} options={variants} onChange={setVariant} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
