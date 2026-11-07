"use client";

import type { Menu } from "@base-ui/react/menu";
import { useRender } from "@base-ui/react/use-render";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useId, type ComponentProps } from "react";

import {
  DropdownMenuContent as BaseContent,
  DropdownMenuItem as BaseItem,
  DropdownMenuSubTrigger as BaseSubTrigger,
} from "@/components/ui/dropdown-menu";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
} from "@/components/ui/dropdown-menu";

export type DropdownMenuContentProps = Omit<ComponentProps<typeof BaseContent>, "className"> & {
  className?: string;
};

export function DropdownMenuContent({ className = "", ...props }: DropdownMenuContentProps) {
  const id = useId();

  // Isolate the whole popup so the traveling background stays behind every row. The popup is a
  // translucent material that turns solid when the system asks for less transparency.
  return (
    <LayoutGroup id={id}>
      <BaseContent
        {...props}
        className={`bg-popover/80 [@media(prefers-reduced-transparency:reduce)]:bg-popover isolate origin-(--transform-origin) text-left backdrop-blur-xl backdrop-saturate-150 transition-[opacity,scale] duration-150 ease-out data-closed:animate-none data-ending-style:scale-95 data-ending-style:opacity-0 data-open:animate-none data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none motion-reduce:duration-0 [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none ${className}`}
      />
    </LayoutGroup>
  );
}

export type DropdownMenuItemProps = Omit<ComponentProps<typeof BaseItem>, "className"> & {
  className?: string;
};

function ItemElement<State extends Menu.Item.State>({
  state,
  render,
  children,
  ...props
}: useRender.ComponentProps<"div", State> & { state: State }) {
  const reducedMotion = useReducedMotion();
  const highlighted = state.highlighted || ("open" in state && state.open === true);

  return useRender({
    defaultTagName: "div",
    render: typeof render === "function" ? (elementProps) => render(elementProps, state) : render,
    props: {
      ...props,
      children: (
        <>
          {highlighted && (
            <motion.span
              aria-hidden="true"
              data-slot="dropdown-menu-highlight"
              layoutId="dropdown-menu-highlight"
              initial={false}
              transition={
                reducedMotion ? { duration: 0 } : { type: "spring", visualDuration: 0.3, bounce: 0 }
              }
              className="pointer-events-none absolute inset-0 -z-10 bg-[var(--muted,#e5e7eb)]"
              style={{ borderRadius: "inherit" }}
            />
          )}
          {children}
        </>
      ),
    },
  });
}

export function DropdownMenuItem({ className = "", render, ...props }: DropdownMenuItemProps) {
  return (
    <BaseItem
      {...props}
      className={`relative min-h-7 overflow-visible px-2 py-1 text-left text-xs focus:bg-transparent data-highlighted:bg-transparent ${className}`}
      render={(itemProps, state) => <ItemElement {...itemProps} state={state} render={render} />}
    />
  );
}

export type DropdownMenuSubTriggerProps = Omit<ComponentProps<typeof BaseSubTrigger>, "className"> & {
  className?: string;
};

export function DropdownMenuSubTrigger({ className = "", render, ...props }: DropdownMenuSubTriggerProps) {
  return (
    <BaseSubTrigger
      {...props}
      className={`relative min-h-7 overflow-visible px-2 py-1 text-left text-xs focus:bg-transparent data-highlighted:bg-transparent data-popup-open:bg-transparent ${className}`}
      render={(itemProps, state) => <ItemElement {...itemProps} state={state} render={render} />}
    />
  );
}

export function DropdownMenuSubContent({
  side = "right",
  sideOffset = 4,
  alignOffset = -4,
  ...props
}: DropdownMenuContentProps) {
  return <DropdownMenuContent side={side} sideOffset={sideOffset} alignOffset={alignOffset} {...props} />;
}
