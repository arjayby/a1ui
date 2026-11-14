"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cancelFrame, frame, LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";

export type MenuIndicator = "dot" | "fill" | "muted";

type MenuContextValue = {
  value: string;
  indicator: MenuIndicator;
  highlightedValue: string;
  focusItem: (value: string) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export type MenuProps = ComponentProps<typeof motion.div> & {
  /** The selected item's value. Selection remains controlled by the caller. */
  value: string;
  /**
   * How the selected item is marked. `dot` puts a primary dot at its left edge, with no
   * background. `fill` and `muted` move a background between the focused and selected items, in
   * the primary or the muted color.
   */
  indicator?: MenuIndicator;
};

export function Menu({
  value,
  indicator = "dot",
  children,
  onBlurCapture,
  className = "",
  ...props
}: MenuProps) {
  const id = useId();
  const [focused, setFocused] = useState<{ item: string | null; selection: string }>({
    item: null,
    selection: value,
  });
  if (focused.selection !== value) setFocused({ item: null, selection: value });
  const highlightedValue = focused.selection === value ? (focused.item ?? value) : value;

  // Isolate the whole menu so the traveling background stays behind every row.
  return (
    <LayoutGroup id={id}>
      <MenuContext.Provider
        value={{
          value,
          indicator,
          highlightedValue,
          focusItem: (item) => setFocused({ item, selection: value }),
        }}
      >
        <motion.div
          {...props}
          className={`isolate ${className}`}
          layoutScroll
          data-menu=""
          data-indicator={indicator}
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

// A filled highlight changes the color of the text it covers. While it travels, the row it is
// leaving is still covered and the row it is heading for is not, so coverage is measured from
// where the highlight is drawn on each frame, not taken from which row is highlighted.
function trackCoverage(highlight: HTMLElement) {
  const menu = highlight.closest("[data-menu]");
  if (!menu) return () => {};
  let last = NaN;
  let still = 0;
  const measure = () => {
    const cover = highlight.getBoundingClientRect();
    for (const item of menu.querySelectorAll("[data-menu-item]")) {
      if (item.closest("[data-menu]") !== menu) continue;
      const row = item.getBoundingClientRect();
      const x = row.left + row.width / 2;
      const y = row.top + row.height / 2;
      const covered = x > cover.left && x < cover.right && y > cover.top && y < cover.bottom;
      item.toggleAttribute("data-covered", covered);
    }
    // Stop once the highlight has rested for a few frames.
    const position = cover.left + cover.top;
    still = Math.abs(position - last) < 0.05 ? still + 1 : 0;
    last = position;
    if (still > 10) cancelFrame(measure);
  };
  // After Motion has drawn the frame, so the measured highlight is the one on screen.
  frame.postRender(measure, true);
  return () => cancelFrame(measure);
}

export function MenuItem({ value, render, children, ...props }: MenuItemProps) {
  const menu = useContext(MenuContext);
  const reducedMotion = useReducedMotion();
  if (!menu) throw new Error("MenuItem must be used within Menu.");
  const highlighted = menu.highlightedValue === value;
  const selected = menu.value === value;
  const { indicator } = menu;
  const highlightRef = useRef<HTMLSpanElement>(null);
  // Rendered once and then owned by trackCoverage, so React never resets it mid-travel.
  const [covered] = useState(highlighted);
  useLayoutEffect(() => {
    if (highlighted && indicator === "fill" && highlightRef.current)
      return trackCoverage(highlightRef.current);
  }, [highlighted, indicator]);
  const transition = reducedMotion
    ? { duration: 0 }
    : ({ type: "spring", visualDuration: 0.3, bounce: 0 } as const);

  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        type: render ? undefined : "button",
        className: `relative rounded-md${
          indicator === "fill" ? " data-[covered]:text-[var(--primary-foreground,#fff)]" : ""
        }`,
        ...{ "data-covered": covered ? "" : undefined },
        onFocus: () => menu.focusItem(value),
        children: (
          <>
            {highlighted && indicator !== "dot" && (
              <motion.span
                ref={highlightRef}
                aria-hidden="true"
                data-slot="menu-highlight"
                layoutId="menu-highlight"
                initial={false}
                transition={transition}
                className={`pointer-events-none absolute inset-0 -z-10 ${
                  indicator === "fill" ? "bg-[var(--primary,#2563eb)]" : "bg-[var(--muted,#e5e7eb)]"
                }`}
                style={{ borderRadius: "inherit" }}
              />
            )}
            {selected && indicator === "dot" && (
              // Centered with auto margins: Motion owns the transform while the dot travels.
              <motion.span
                aria-hidden="true"
                data-slot="menu-dot"
                layoutId="menu-dot"
                initial={false}
                transition={transition}
                className="pointer-events-none absolute inset-y-0 left-1.5 my-auto size-1.5 bg-[var(--primary,#2563eb)]"
                style={{ borderRadius: 9999 }}
              />
            )}
            {children}
          </>
        ),
      },
      props,
    ),
    state: { "menu-item": true, highlighted, selected },
  });
}
