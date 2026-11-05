"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from "motion/react";
import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";

/** Labels for each value, so the trigger can show a label while the list is closed. */
export type SelectItems = Record<string, ReactNode> | ReadonlyArray<{ value: string; label: ReactNode }>;

type SelectContextValue = {
  value: string | null;
  items?: SelectItems;
  open: boolean;
  /** Increments each time the list opens, so the selected check redraws. */
  opens: number;
  /** Increments on every selection so the trigger text can cross-fade. */
  change: number;
  /** -1 when the new item sits above the old one in `items`, 1 below. */
  direction: number;
  seconds: number;
  onPopupSettled: (open: boolean) => void;
};

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect(part: string) {
  const context = useContext(SelectContext);
  if (!context) throw new Error(`${part} must be used within Select.`);
  return context;
}

function entries(items?: SelectItems) {
  if (!items) return [];
  return Array.isArray(items)
    ? (items as ReadonlyArray<{ value: string; label: ReactNode }>)
    : Object.entries(items).map(([value, label]) => ({ value, label }));
}

export interface SelectProps {
  /** The selected value when controlled. `null` shows the placeholder. */
  value?: string | null;
  /** The initially selected value when uncontrolled. */
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Whether the list is open when controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Labels shown in the trigger for each value. Without it the trigger shows the raw value. */
  items?: SelectItems;
  /** Open, close, and text-change time in seconds. */
  duration?: number;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Field name for form submission. */
  name?: string;
  /** Locks page scroll and outside clicks while open. */
  modal?: boolean;
  children?: ReactNode;
}

export function Select({
  value,
  defaultValue = null,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  items,
  duration = 0.3,
  disabled,
  readOnly,
  required,
  name,
  modal,
  children,
}: SelectProps) {
  const reducedMotion = useReducedMotion();
  const actionsRef = useRef<SelectPrimitive.Root.Actions | null>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = value !== undefined ? value : internalValue;
  const isOpen = open ?? internalOpen;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;

  // Base UI keeps the closed list mounted, so count opens to replay the check each time.
  const [opened, setOpened] = useState({ open: isOpen, count: isOpen ? 1 : 0 });
  if (opened.open !== isOpen) setOpened({ open: isOpen, count: opened.count + (isOpen ? 1 : 0) });

  // Count selections during render so the trigger text knows which way to slide.
  const [shown, setShown] = useState({ value: current, change: 0, direction: 1 });
  if (shown.value !== current) {
    const order = entries(items).map((item) => item.value);
    const from = shown.value === null ? -1 : order.indexOf(shown.value);
    const to = current === null ? -1 : order.indexOf(current);
    setShown({ value: current, change: shown.change + 1, direction: to < from ? -1 : 1 });
  }

  return (
    <SelectContext.Provider
      value={{
        value: current,
        items,
        open: isOpen,
        opens: opened.count,
        change: shown.change,
        direction: shown.direction,
        seconds,
        onPopupSettled: (settledOpen) => {
          if (!settledOpen) actionsRef.current?.unmount();
        },
      }}
    >
      <SelectPrimitive.Root<string>
        value={current}
        open={isOpen}
        items={items}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        name={name}
        modal={modal}
        actionsRef={actionsRef}
        onValueChange={(next) => {
          if (value === undefined) setInternalValue(next);
          onValueChange?.(next);
        }}
        onOpenChange={(next, details) => {
          // Keep the list mounted until its closing animation finishes.
          if (!next && seconds > 0) details.preventUnmountOnClose();
          if (open === undefined) setInternalOpen(next);
          onOpenChange?.(next);
        }}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
  className?: string;
  /** Usually a `SelectValue`. */
  children?: ReactNode;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  const select = useSelect("SelectTrigger");

  return (
    <SelectPrimitive.Trigger
      {...props}
      data-slot="select-trigger"
      className={`border-border bg-background hover:bg-muted/50 focus-visible:ring-ring/30 data-popup-open:bg-muted/50 inline-flex h-9 min-w-44 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 text-left text-sm shadow-xs transition-colors outline-none select-none focus-visible:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 ${className ?? ""}`}
    >
      {children}
      <SelectPrimitive.Icon
        data-slot="select-icon"
        render={
          <motion.span
            initial={false}
            animate={{ rotate: select.open ? 180 : 0 }}
            transition={
              select.seconds === 0
                ? { duration: 0 }
                : { type: "spring", visualDuration: select.seconds, bounce: 0.3 }
            }
          />
        }
        className="text-muted-foreground flex size-4 shrink-0 items-center justify-center"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M4 6 L8 10 L12 6" />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export interface SelectValueProps {
  /** Shown while nothing is selected. */
  placeholder?: ReactNode;
  /** Formats the selected value instead of looking it up in `items`. */
  children?: (value: string) => ReactNode;
  className?: string;
}

export function SelectValue({ placeholder, children, className }: SelectValueProps) {
  const select = useSelect("SelectValue");
  const { value, seconds, direction } = select;
  const label =
    value === null
      ? placeholder
      : children
        ? children(value)
        : (entries(select.items).find((item) => item.value === value)?.label ?? value);
  const transition: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds * 0.8, bounce: 0.15 };

  // Both labels share one grid cell so the old one slides out while the new one slides in.
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={`data-placeholder:text-muted-foreground grid min-w-0 flex-1 overflow-hidden ${className ?? ""}`}
    >
      {() => (
        <AnimatePresence initial={false} custom={direction}>
          <motion.span
            key={select.change}
            data-slot="select-value-text"
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, y: dir * 8, filter: "blur(2px)" }),
              center: { opacity: 1, y: 0, filter: "blur(0px)" },
              exit: (dir: number) => ({ opacity: 0, y: dir * -8, filter: "blur(2px)" }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="truncate [grid-area:1/1]"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      )}
    </SelectPrimitive.Value>
  );
}

export interface SelectContentProps {
  /** Overlap the trigger so the selected item lines up with the trigger text (mouse only). */
  alignItemWithTrigger?: boolean;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

export function SelectContent({
  alignItemWithTrigger = true,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  className,
  children,
  ...props
}: SelectContentProps) {
  const select = useSelect("SelectContent");
  const id = useId();
  const { seconds } = select;
  const variants: Variants = {
    closed: { opacity: 0, scale: 0.92, transition: { duration: seconds * 0.6, ease: [0.4, 0, 1, 1] } },
    open: {
      opacity: 1,
      scale: 1,
      transition: {
        scale: { type: "spring", visualDuration: seconds, bounce: 0.25 },
        opacity: { duration: seconds * 0.5 },
        staggerChildren: Math.min(0.02, seconds / 15),
        delayChildren: seconds * 0.1,
      },
    },
  };

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        data-slot="select-positioner"
        alignItemWithTrigger={alignItemWithTrigger}
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          {...props}
          data-slot="select-content"
          className={`border-border bg-background text-foreground isolate max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg border p-1 shadow-lg outline-none ${className ?? ""}`}
          render={(popupProps) => (
            <LayoutGroup id={id}>
              <motion.div
                {...(popupProps as HTMLMotionProps<"div">)}
                layoutScroll
                variants={variants}
                initial={seconds === 0 ? false : "closed"}
                animate={select.open ? "open" : "closed"}
                transition={seconds === 0 ? { duration: 0 } : undefined}
                onAnimationComplete={(definition) => {
                  if (definition === "closed") select.onPopupSettled(false);
                }}
              />
            </LayoutGroup>
          )}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export interface SelectItemProps {
  value: string;
  disabled?: boolean;
  /** Text used for type-ahead when the label is not plain text. */
  label?: string;
  className?: string;
  children?: ReactNode;
}

export function SelectItem({ value, disabled, label, className, children }: SelectItemProps) {
  const select = useSelect("SelectItem");
  const { seconds } = select;
  const highlightTransition: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.15 };

  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      label={label}
      data-slot="select-item"
      className={`data-disabled:text-muted-foreground relative flex min-h-8 cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none data-disabled:cursor-not-allowed ${className ?? ""}`}
      render={(itemProps, state) => (
        <motion.div
          {...(itemProps as HTMLMotionProps<"div">)}
          // Opacity only: any offset would throw off Base UI's measurement of the selected item
          // when the list lines it up over the trigger.
          variants={{
            closed: { opacity: 0 },
            open: { opacity: 1, transition: { duration: seconds * 0.6, ease: "easeOut" } },
          }}
        >
          {state.highlighted && (
            <motion.span
              aria-hidden="true"
              data-slot="select-highlight"
              layoutId="select-highlight"
              initial={false}
              transition={highlightTransition}
              className="bg-muted pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
            />
          )}
          {itemProps.children}
          {state.selected && (
            <svg
              key={select.opens}
              aria-hidden="true"
              data-slot="select-check"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute right-2 size-4"
            >
              <motion.path
                d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
                initial={seconds === 0 ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: seconds, delay: seconds * 0.5, ease: [0.65, 0, 0.35, 1] }}
              />
            </svg>
          )}
        </motion.div>
      )}
    >
      <SelectPrimitive.ItemText data-slot="select-item-text" className="min-w-0 flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export interface SelectGroupProps {
  className?: string;
  children?: ReactNode;
}

export function SelectGroup({ className, children }: SelectGroupProps) {
  return (
    <SelectPrimitive.Group data-slot="select-group" className={className}>
      {children}
    </SelectPrimitive.Group>
  );
}

export function SelectLabel({ className, children }: SelectGroupProps) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={`text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium ${className ?? ""}`}
    >
      {children}
    </SelectPrimitive.GroupLabel>
  );
}

export function SelectSeparator({ className }: { className?: string }) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={`bg-border -mx-1 my-1 h-px ${className ?? ""}`}
    />
  );
}
