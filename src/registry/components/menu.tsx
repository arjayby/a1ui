"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { createContext, useContext, useId, useState, type ComponentProps } from "react";

type MenuContextValue = {
  highlightedValue: string;
  focusItem: (value: string) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export type MenuProps = ComponentProps<typeof motion.div> & {
  /** The selected item's value. Selection remains controlled by the caller. */
  value: string;
};

export function Menu({ value, children, onBlurCapture, ...props }: MenuProps) {
  const id = useId();
  const [focused, setFocused] = useState<{ item: string | null; selection: string }>({
    item: null,
    selection: value,
  });
  if (focused.selection !== value) setFocused({ item: null, selection: value });
  const highlightedValue = focused.selection === value ? (focused.item ?? value) : value;

  return (
    <LayoutGroup id={id}>
      <MenuContext.Provider
        value={{ highlightedValue, focusItem: (item) => setFocused({ item, selection: value }) }}
      >
        <motion.div
          {...props}
          layoutScroll
          data-menu=""
          onBlurCapture={(event) => {
            onBlurCapture?.(event);
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused({ item: null, selection: value });
          }}
        >
          {children}
        </motion.div>
      </MenuContext.Provider>
    </LayoutGroup>
  );
}

export type MenuItemProps = useRender.ComponentProps<"button"> & {
  value: string;
};

export function MenuItem({ value, render, children, ...props }: MenuItemProps) {
  const menu = useContext(MenuContext);
  const reducedMotion = useReducedMotion();
  if (!menu) throw new Error("MenuItem must be used within Menu.");
  const highlighted = menu.highlightedValue === value;

  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        type: render ? undefined : "button",
        className: "relative isolate rounded-md",
        onFocus: () => menu.focusItem(value),
        children: (
          <>
            {highlighted && (
              <motion.span
                aria-hidden="true"
                data-slot="menu-highlight"
                layoutId="menu-highlight"
                initial={false}
                transition={
                  reducedMotion ? { duration: 0 } : { type: "spring", duration: 0.35, bounce: 0.12 }
                }
                className="pointer-events-none absolute inset-0 -z-10 bg-[var(--muted,#e5e7eb)]"
                style={{ borderRadius: "inherit" }}
              />
            )}
            {children}
          </>
        ),
      },
      props,
    ),
    state: { "menu-item": true, highlighted },
  });
}
