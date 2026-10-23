"use client";

import { Tooltip as Primitive } from "@base-ui/react/tooltip";
import { createContext, useContext, useId, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const TooltipProvider = Primitive.Provider;
const TooltipIdContext = createContext<string | undefined>(undefined);

export function Tooltip(props: ComponentProps<typeof Primitive.Root>) {
  const id = useId();
  return (
    <TooltipIdContext.Provider value={id}>
      <Primitive.Root {...props} />
    </TooltipIdContext.Provider>
  );
}

export function TooltipTrigger(props: ComponentProps<typeof Primitive.Trigger>) {
  const id = useContext(TooltipIdContext);
  return <Primitive.Trigger aria-describedby={id} {...props} />;
}

export function TooltipContent({
  className,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  ...props
}: ComponentProps<typeof Primitive.Popup> &
  Pick<ComponentProps<typeof Primitive.Positioner>, "align" | "side" | "sideOffset" | "alignOffset">) {
  const id = useContext(TooltipIdContext);
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
          id={id}
          role="tooltip"
          data-slot="tooltip-content"
          className={(state) =>
            cn("ui-tooltip", typeof className === "function" ? className(state) : className)
          }
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
