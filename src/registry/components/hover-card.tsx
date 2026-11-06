"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import { AnimatePresence, animate, motion, stagger as staggerDelay, useReducedMotion } from "motion/react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Side = "top" | "right" | "bottom" | "left";

type HoverCardContextValue = {
  open: boolean;
  openDelay: number;
  closeDelay: number;
  /** Spring time in seconds, zero when reduced motion is on. */
  seconds: number;
};

const HoverCardContext = createContext<HoverCardContextValue | null>(null);

function useHoverCard(part: string) {
  const context = useContext(HoverCardContext);
  if (!context) throw new Error(`${part} must be used within HoverCard.`);
  return context;
}

// The card starts nudged back toward the trigger, then springs out along its side.
const NUDGE: Record<Side, { x: number; y: number }> = {
  top: { x: 0, y: 8 },
  bottom: { x: 0, y: -8 },
  left: { x: 8, y: 0 },
  right: { x: -8, y: 0 },
};

export interface HoverCardProps {
  /** Whether the card is open when controlled by the caller. */
  open?: boolean;
  /** Whether the card is initially open when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Milliseconds the pointer or keyboard focus rests on the trigger before the card opens. */
  openDelay?: number;
  /** Milliseconds after the pointer leaves before the card closes. */
  closeDelay?: number;
  /** Spring time in seconds for the card and its staggered contents. */
  duration?: number;
  children?: ReactNode;
}

export function HoverCard({
  open,
  defaultOpen = false,
  onOpenChange,
  openDelay = 0,
  closeDelay = 200,
  duration = 0.35,
  children,
}: HoverCardProps) {
  const reducedMotion = useReducedMotion();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;

  return (
    <HoverCardContext.Provider
      value={{
        open: current,
        openDelay: Math.max(0, openDelay),
        closeDelay: Math.max(0, closeDelay),
        seconds,
      }}
    >
      <PreviewCard.Root
        open={current}
        onOpenChange={(next) => {
          if (open === undefined) setInternalOpen(next);
          onOpenChange?.(next);
        }}
      >
        {children}
      </PreviewCard.Root>
    </HoverCardContext.Provider>
  );
}

export interface HoverCardTriggerProps {
  href?: string;
  /** Replaces the default link, for example with a button or a framework link. */
  render?: PreviewCard.Trigger.Props["render"];
  /** Overrides the open delay from HoverCard, in milliseconds. */
  delay?: number;
  /** Overrides the close delay from HoverCard, in milliseconds. */
  closeDelay?: number;
  onClick?: PreviewCard.Trigger.Props["onClick"];
  className?: string;
  children?: ReactNode;
}

export function HoverCardTrigger({ delay, closeDelay, className, ...props }: HoverCardTriggerProps) {
  const card = useHoverCard("HoverCardTrigger");

  return (
    <PreviewCard.Trigger
      {...props}
      data-slot="hover-card-trigger"
      delay={delay ?? card.openDelay}
      closeDelay={closeDelay ?? card.closeDelay}
      className={`text-foreground decoration-border hover:decoration-foreground data-popup-open:decoration-foreground focus-visible:ring-ring/30 rounded-sm font-medium underline underline-offset-4 transition-colors outline-none focus-visible:ring-3 ${className ?? ""}`}
    />
  );
}

export interface HoverCardContentProps {
  /** Side of the trigger the card opens on. It flips when there is no room. */
  side?: Side;
  align?: "start" | "center" | "end";
  /** Gap between the trigger and the card in pixels. */
  sideOffset?: number;
  alignOffset?: number;
  /** Seconds between each direct child fading in. Zero shows them together. */
  stagger?: number;
  className?: string;
  children?: ReactNode;
}

export function HoverCardContent({
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  stagger = 0.04,
  className,
  children,
}: HoverCardContentProps) {
  const card = useHoverCard("HoverCardContent");
  const { seconds } = card;
  const gap = seconds === 0 || !Number.isFinite(stagger) ? 0 : Math.max(0, stagger);

  // Direct children rise in one after another as the card mounts, so callers keep their own markup.
  const staggerChildren = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || seconds === 0) return;
      const items = Array.from(node.children).filter((child) => child instanceof HTMLElement);
      if (items.length === 0) return;
      for (const item of items) {
        item.style.opacity = "0";
        item.style.transform = "translateY(6px)";
      }
      const controls = animate(
        items,
        { opacity: [0, 1], y: [6, 0] },
        {
          type: "spring",
          visualDuration: seconds * 0.8,
          bounce: 0,
          delay: staggerDelay(gap, { startDelay: seconds * 0.2 }),
        },
      );
      return () => controls.stop();
    },
    [seconds, gap],
  );

  return (
    <AnimatePresence>
      {card.open && (
        <PreviewCard.Portal keepMounted>
          <PreviewCard.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            collisionPadding={16}
            className="isolate z-50 outline-none"
          >
            <PreviewCard.Popup
              ref={staggerChildren}
              data-slot="hover-card-content"
              className={`bg-background text-foreground border-border w-72 max-w-[calc(100vw-2rem)] origin-(--transform-origin) rounded-xl border p-4 text-sm shadow-lg outline-none ${className ?? ""}`}
              render={(popupProps, state) => {
                const nudge = NUDGE[state.side as Side] ?? NUDGE.bottom;
                return (
                  <motion.div
                    {...(popupProps as object)}
                    initial={seconds === 0 ? false : { opacity: 0, scale: 0.9, ...nudge }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={
                      seconds === 0
                        ? { opacity: 0, transition: { duration: 0 } }
                        : {
                            opacity: 0,
                            scale: 0.96,
                            x: nudge.x / 2,
                            y: nudge.y / 2,
                            transition: { duration: Math.min(0.15, seconds * 0.45), ease: [0.4, 0, 1, 1] },
                          }
                    }
                    transition={
                      seconds === 0
                        ? { duration: 0 }
                        : { type: "spring", visualDuration: seconds, bounce: 0.25 }
                    }
                  />
                );
              }}
            >
              {children}
            </PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      )}
    </AnimatePresence>
  );
}
