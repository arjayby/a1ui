"use client";

import { TrashIcon } from "@phosphor-icons/react";
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
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid justify-items-center gap-3 px-4 text-center">
          <AlertDialog duration={duration}>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              <TrashIcon aria-hidden="true" />
              Delete project
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Delete “Marketing site”?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the project, its 14 deployments, and every preview link. You can’t undo this.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant={variant} onClick={() => setDeleted(true)}>
                  Delete project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p role="status" className="text-muted-foreground text-xs">
            {deleted ? "Project deleted." : "Click outside the dialog to see it refuse."}
          </p>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-32">
        <DemoSelect label="Action" value={variant} options={variants} onChange={setVariant} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
