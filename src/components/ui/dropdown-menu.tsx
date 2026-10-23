"use client";

import { Menu as Primitive } from "@base-ui/react/menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuGroup = Primitive.Group;

export function DropdownMenuContent({
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
          data-slot="dropdown-menu-content"
          className={(state) => cn("ui-menu", typeof className === "function" ? className(state) : className)}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={(state) =>
        cn("ui-menu-item", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Primitive.GroupLabel>) {
  return (
    <Primitive.GroupLabel
      className={(state) =>
        cn("ui-menu-label", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Primitive.Separator>) {
  return (
    <Primitive.Separator
      className={(state) =>
        cn("ui-separator", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
