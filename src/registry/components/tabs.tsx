"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "motion/react";
import { createContext, useContext, useId, useState, type ReactNode } from "react";

type TabsVariant = "pill" | "underline";

type TabsContextValue = {
  value: string | null;
  hovered: string | null;
  setHovered: (value: string | null) => void;
  variant: TabsVariant;
  /** -1 when the new tab sits before the old one, 1 after, 0 before any change. */
  direction: number;
  transition: Transition;
  reducedMotion: boolean;
  /** True when the duration is zero or the user prefers reduced motion. */
  instant: boolean;
};

// Triggers shrink the moment they are pressed and settle back without overshoot on release.
const PRESS: Transition = { type: "spring", visualDuration: 0.2, bounce: 0 };

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(part: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${part} must be used within Tabs.`);
  return context;
}

export interface TabsProps {
  /** The selected tab when controlled by the caller. */
  value?: string;
  /** The initially selected tab when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `pill` slides a raised surface; `underline` slides a bar under the active tab. */
  variant?: TabsVariant;
  /** Indicator travel time in seconds. */
  duration?: number;
  className?: string;
  children?: ReactNode;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  variant = "pill",
  duration = 0.35,
  className,
  children,
}: TabsProps) {
  const id = useId();
  const reducedMotion = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const current = value ?? internalValue;
  const visualDuration = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const transition: Transition =
    visualDuration === 0 ? { duration: 0 } : { type: "spring", visualDuration, bounce: 0 };

  return (
    <LayoutGroup id={id}>
      <TabsContext.Provider
        value={{
          value: current,
          hovered,
          setHovered,
          variant,
          direction,
          transition,
          reducedMotion,
          instant: visualDuration === 0,
        }}
      >
        <TabsPrimitive.Root
          data-slot="tabs"
          data-variant={variant}
          value={current}
          onValueChange={(next: string, details) => {
            const { activationDirection } = details;
            setDirection(activationDirection === "left" ? -1 : activationDirection === "right" ? 1 : 0);
            if (value === undefined) setInternalValue(next);
            onValueChange?.(next);
          }}
          className={`flex flex-col gap-3 ${className ?? ""}`}
        >
          {children}
        </TabsPrimitive.Root>
      </TabsContext.Provider>
    </LayoutGroup>
  );
}

export interface TabsListProps {
  /** Select a tab as soon as arrow keys move focus to it. */
  activateOnFocus?: boolean;
  "aria-label"?: string;
  className?: string;
  children?: ReactNode;
}

export function TabsList({ activateOnFocus = false, className, children, ...props }: TabsListProps) {
  const tabs = useTabs("TabsList");
  const variantClass =
    tabs.variant === "pill" ? "bg-muted h-9 rounded-lg p-[3px]" : "border-border h-10 gap-1 border-b";

  return (
    <TabsPrimitive.List
      {...props}
      data-slot="tabs-list"
      activateOnFocus={activateOnFocus}
      onPointerLeave={() => tabs.setHovered(null)}
      className={`text-muted-foreground relative isolate inline-flex w-fit items-center ${variantClass} ${className ?? ""}`}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function TabsTrigger({ value, disabled, className, children }: TabsTriggerProps) {
  const tabs = useTabs("TabsTrigger");
  const active = tabs.value === value;
  const hovered = tabs.hovered === value && !active;
  const pill = tabs.variant === "pill";

  return (
    <TabsPrimitive.Tab
      value={value}
      disabled={disabled}
      data-slot="tabs-trigger"
      onPointerEnter={() => tabs.setHovered(value)}
      render={<motion.button whileTap={tabs.instant ? undefined : { scale: 0.97 }} transition={PRESS} />}
      className={`data-active:text-foreground hover:text-foreground focus-visible:ring-ring/30 relative inline-flex h-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${className ?? ""}`}
    >
      <AnimatePresence>
        {hovered && (
          <motion.span
            aria-hidden="true"
            data-slot="tabs-hover"
            layoutId="tabs-hover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={tabs.transition}
            className={`pointer-events-none absolute -z-20 rounded-md ${pill ? "bg-background/50 inset-0" : "bg-muted inset-x-0 inset-y-1.5"}`}
          />
        )}
      </AnimatePresence>
      {active && (
        <motion.span
          aria-hidden="true"
          data-slot="tabs-indicator"
          layoutId="tabs-indicator"
          initial={false}
          transition={tabs.transition}
          className={
            pill
              ? "bg-background ring-foreground/5 pointer-events-none absolute inset-0 -z-10 rounded-md shadow-sm ring-1"
              : "bg-foreground pointer-events-none absolute inset-x-1 bottom-0 -z-10 h-0.5 rounded-full"
          }
        />
      )}
      {children}
    </TabsPrimitive.Tab>
  );
}

export interface TabsContentProps {
  value: string;
  className?: string;
  children?: ReactNode;
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const tabs = useTabs("TabsContent");
  // Skip the entrance on first render so the initial panel appears in place.
  const animateIn = tabs.direction !== 0 && !tabs.reducedMotion;

  return (
    <TabsPrimitive.Panel
      value={value}
      data-slot="tabs-content"
      className={`focus-visible:ring-ring/30 rounded-md outline-none focus-visible:ring-3 data-ending-style:hidden ${className ?? ""}`}
      render={
        <motion.div
          initial={animateIn ? { opacity: 0, x: tabs.direction * 12, filter: "blur(2px)" } : false}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={animateIn ? { type: "spring", visualDuration: 0.3, bounce: 0 } : { duration: 0 }}
        />
      }
    >
      {children}
    </TabsPrimitive.Panel>
  );
}
