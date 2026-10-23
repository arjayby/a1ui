"use client";

import { Popover as Primitive } from "@base-ui/react/popover";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export const PopoverClose = Primitive.Close;

export function PopoverContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 8,
  alignOffset = 0,
  ...props
}: ComponentProps<typeof Primitive.Popup> &
  Pick<ComponentProps<typeof Primitive.Positioner>, "align" | "side" | "sideOffset" | "alignOffset">) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-60"
      >
        <Primitive.Popup
          data-slot="popover-content"
          className={(state) =>
            cn("ui-popover", typeof className === "function" ? className(state) : className)
          }
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
