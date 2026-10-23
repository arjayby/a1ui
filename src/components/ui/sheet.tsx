"use client";

import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export {
  Dialog as Sheet,
  DialogTrigger as SheetTrigger,
  DialogClose as SheetClose,
  DialogTitle as SheetTitle,
  DialogDescription as SheetDescription,
  DialogHeader as SheetHeader,
  DialogFooter as SheetFooter,
} from "@/components/ui/dialog";

export function SheetContent({
  className,
  side = "right",
  ...props
}: ComponentProps<typeof DialogContent> & { side?: "left" | "right" }) {
  return (
    <DialogContent
      data-side={side}
      className={(state) => cn("ui-sheet", typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
}
