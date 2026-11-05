"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { animate, motion, stagger, useReducedMotion, type Transition } from "motion/react";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type AccordionIcon = "chevron" | "plus";

type AccordionContextValue = {
  value: string[];
  icon: AccordionIcon;
  /** Panel open and close time in seconds, zero under reduced motion. */
  seconds: number;
  /** False until the first toggle, so items open on load appear in place. */
  changed: boolean;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<{ open: boolean } | null>(null);

function useAccordion(part: string) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error(`${part} must be used within Accordion.`);
  return context;
}

function useAccordionItem(part: string) {
  const context = useContext(AccordionItemContext);
  if (!context) throw new Error(`${part} must be used within AccordionItem.`);
  return context;
}

export interface AccordionProps {
  /** The open items when controlled by the caller. */
  value?: string[];
  /** The items open on first render when uncontrolled. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Lets several items stay open at once. Otherwise opening one closes the rest. */
  multiple?: boolean;
  /** `chevron` rotates a caret; `plus` folds a plus into a minus. */
  icon?: AccordionIcon;
  /** Panel open and close time in seconds. */
  duration?: number;
  /** Disables every item. */
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Accordion({
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  icon = "chevron",
  duration = 0.3,
  disabled = false,
  className,
  children,
}: AccordionProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
  const [changed, setChanged] = useState(false);
  const current = value ?? internalValue;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;

  return (
    <AccordionContext.Provider value={{ value: current, icon, seconds, changed }}>
      <AccordionPrimitive.Root
        data-slot="accordion"
        data-icon={icon}
        value={current}
        multiple={multiple}
        disabled={disabled}
        onValueChange={(next: string[]) => {
          setChanged(true);
          if (value === undefined) setInternalValue(next);
          onValueChange?.(next);
        }}
        className={`flex w-full flex-col ${className ?? ""}`}
      >
        {children}
      </AccordionPrimitive.Root>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  /** Identifies the item in `value` and `defaultValue`. */
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function AccordionItem({ value, disabled, className, children }: AccordionItemProps) {
  const accordion = useAccordion("AccordionItem");

  return (
    <AccordionItemContext.Provider value={{ open: accordion.value.includes(value) }}>
      <AccordionPrimitive.Item
        value={value}
        disabled={disabled}
        data-slot="accordion-item"
        className={`border-border border-b last:border-b-0 ${className ?? ""}`}
      >
        {children}
      </AccordionPrimitive.Item>
    </AccordionItemContext.Provider>
  );
}

export interface AccordionTriggerProps {
  className?: string;
  children?: ReactNode;
}

export function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  const accordion = useAccordion("AccordionTrigger");
  const { open } = useAccordionItem("AccordionTrigger");
  const transition: Transition =
    accordion.seconds === 0
      ? { duration: 0 }
      : { type: "spring", visualDuration: accordion.seconds, bounce: 0.2 };

  return (
    <AccordionPrimitive.Header data-slot="accordion-header" className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={`group/accordion-trigger focus-visible:ring-ring/30 flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-colors outline-none select-none hover:underline focus-visible:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:no-underline ${className ?? ""}`}
      >
        {children}
        <span
          aria-hidden="true"
          data-slot="accordion-icon"
          data-icon={accordion.icon}
          className="text-muted-foreground group-hover/accordion-trigger:text-foreground relative grid size-4 shrink-0 place-items-center transition-colors"
        >
          {accordion.icon === "plus" ? (
            <motion.span
              className="relative block size-3.5"
              initial={false}
              animate={{ rotate: open ? 180 : 0 }}
              transition={transition}
            >
              <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-current" />
              {/* The vertical stroke turns flat onto the horizontal one, leaving a minus. */}
              <motion.span
                data-slot="accordion-plus-vertical"
                className="absolute inset-y-0 left-1/2 -ml-[0.75px] w-[1.5px] rounded-full bg-current"
                initial={false}
                animate={{ rotate: open ? 90 : 0 }}
                transition={transition}
              />
            </motion.span>
          ) : (
            <motion.svg
              data-slot="accordion-chevron"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
              initial={false}
              // Counter-clockwise, so the point swings through the right on open and on close.
              animate={{ rotate: open ? -180 : 0 }}
              transition={transition}
            >
              <path d="M4 6 L8 10 L12 6" />
            </motion.svg>
          )}
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export interface AccordionContentProps {
  className?: string;
  children?: ReactNode;
}

export function AccordionContent({ className, children }: AccordionContentProps) {
  const { seconds } = useAccordion("AccordionContent");

  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden text-sm transition-[height,opacity] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0"
      style={{ transitionDuration: `${seconds}s` }}
    >
      <AccordionContentInner className={className}>{children}</AccordionContentInner>
    </AccordionPrimitive.Panel>
  );
}

// Mounts each time the panel opens, so its entrance runs once per open.
function AccordionContentInner({ className, children }: AccordionContentProps) {
  const { changed, seconds } = useAccordion("AccordionContent");
  const inner = useRef<HTMLDivElement>(null);

  // Fade and lift the direct children in turn. Runs before paint so the first frame
  // already shows them hidden. Only on mount: a close that reopens midway keeps them in place.
  useLayoutEffect(() => {
    const element = inner.current;
    if (!element || !changed || seconds === 0) return;
    // Plain text has no child elements, so the whole block fades instead.
    const items = element.children.length > 0 ? Array.from(element.children) : [element];
    const controls = animate(
      items,
      { opacity: [0, 1], y: [6, 0] },
      {
        duration: seconds * 0.9,
        ease: [0.22, 1, 0.36, 1],
        delay: stagger(0.05, { startDelay: seconds * 0.15 }),
      },
    );
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={inner}
      data-slot="accordion-content-inner"
      className={`text-muted-foreground pb-4 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
