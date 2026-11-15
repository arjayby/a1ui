"use client";

import { cancelFrame, frame } from "motion";
import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEventHandler,
} from "react";

// Every tick is one bar of this length, scaled from its left edge, so a change of length never
// touches layout.
const TICK_LENGTH = 24;

// Critically damped with about a 0.25s response, so a tick settles without overshooting. Written
// as stiffness and damping because Motion drops velocity on duration-based springs, and a tick is
// retargeted mid-flight whenever the reader keeps scrolling or sweeps the pointer along the rail.
const SPRING: Transition = { type: "spring", stiffness: 600, damping: 49 };
// Reduced motion: lengths change at once and only the opacity cross-fades.
const FADE: Transition = { duration: 0, opacity: { duration: 0.15, ease: "easeOut" } };

// The pressed tick is the highlighted one, at full length. It gives under the pointer, or dims
// with reduced motion.
const PRESS: Variants = { pressed: { scaleX: 0.75 } };
const PRESS_FADE: Variants = { pressed: { opacity: 0.6 } };

// The label grows out of its tick and returns along the same path.
const LABEL_SHOWN = { opacity: 1, x: 0, scale: 1 };
const LABEL_HIDDEN = { opacity: 0, x: -4, scale: 0.96 };
const LABEL_FADE: Transition = { duration: 0.12, ease: "easeOut" };
const LABEL_SPRING: Transition = { ...SPRING, opacity: LABEL_FADE };

export interface SectionRailItem {
  id: string;
  label: string;
}

export interface SectionRailProps extends Omit<ComponentPropsWithoutRef<"nav">, "aria-label"> {
  sections: SectionRailItem[];
  activeOffset?: number;
  activeMarkerLength?: "long" | "short";
  ariaLabel?: string;
  gap?: CSSProperties["gap"];
}

function getScrollContainer(element: HTMLElement) {
  let parent = element.parentElement;

  while (parent) {
    const canScroll = /auto|scroll|overlay/.test(window.getComputedStyle(parent).overflowY);
    if (canScroll && parent.scrollHeight > parent.clientHeight) return parent;
    parent = parent.parentElement;
  }

  return window;
}

function isAtScrollEnd(scrollContainer: Window | HTMLElement) {
  if (scrollContainer instanceof HTMLElement) {
    return (
      scrollContainer.scrollHeight > scrollContainer.clientHeight &&
      scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1
    );
  }

  const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  return scrollHeight > window.innerHeight && window.scrollY + window.innerHeight >= scrollHeight - 1;
}

/** Whether focus arrived from the keyboard. Browsers without the selector count every focus. */
function isFocusVisible(element: Element) {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

export function SectionRail({
  sections,
  activeOffset = 0.36,
  activeMarkerLength = "long",
  ariaLabel = "Page sections",
  gap = 0,
  className,
  ...props
}: SectionRailProps) {
  const navRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const activeMarkerWidth = activeMarkerLength === "long" ? 20 : 12;
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const highlightedIndex = hoveredIndex ?? focusedIndex;

  useEffect(() => {
    const nav = navRef.current;
    const trackedSections = sections.flatMap(({ id }, index) => {
      const element = document.getElementById(id);
      return element ? [{ element, index }] : [];
    });

    if (!nav || trackedSections.length === 0) return;

    const scrollContainer = getScrollContainer(nav);

    const update = () => {
      if (isAtScrollEnd(scrollContainer)) {
        setActiveIndex(trackedSections[trackedSections.length - 1].index);
        return;
      }

      const offset = Math.min(1, Math.max(0, activeOffset));
      const marker =
        scrollContainer instanceof HTMLElement
          ? scrollContainer.getBoundingClientRect().top + scrollContainer.clientHeight * offset
          : window.innerHeight * offset;
      let nextActiveIndex = trackedSections[0].index;

      trackedSections.forEach(({ element, index }) => {
        if (element.getBoundingClientRect().top <= marker) nextActiveIndex = index;
      });

      setActiveIndex(nextActiveIndex);
    };

    // Motion's frame loop measures in its read phase, before the tick springs write, and keeps one
    // pending measurement however many scroll events arrive in a frame.
    const scheduleUpdate = () => frame.read(update);

    update();
    scrollContainer.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelFrame(update);
      scrollContainer.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeOffset, sections]);

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className={["text-foreground", className].filter(Boolean).join(" ")}
      {...props}
    >
      <ol
        className="flex list-none flex-col p-0"
        style={{ gap }}
        onPointerLeave={() => setHoveredIndex(null)}
        onBlur={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
            setFocusedIndex(null);
          }
        }}
      >
        {sections.map(({ id, label }, index) => {
          const state = index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending";
          const distance = highlightedIndex === null ? null : Math.abs(index - highlightedIndex);
          let markerWidth = state === "active" ? activeMarkerWidth : 12;
          let markerOpacity = state === "active" ? 1 : state === "complete" ? 0.55 : 0.25;

          if (distance !== null) {
            markerWidth = Math.max(12, 24 - distance * 4);
            markerOpacity = state === "active" ? 1 : Math.max(0.25, 1 - distance * 0.2);
          }

          return (
            <SectionRailMarker
              key={id}
              id={id}
              label={label}
              state={state}
              length={markerWidth}
              opacity={markerOpacity}
              reducedMotion={reducedMotion}
              onClick={(event) => {
                if (
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.altKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey
                )
                  return;
                const nav = navRef.current;
                const target = event.currentTarget.ownerDocument.getElementById(id);
                if (!nav || !target) return;
                const container = getScrollContainer(nav);
                if (!(container instanceof HTMLElement) || !container.contains(target)) return;

                event.preventDefault();
                // The browser's own smooth scroll yields to the wheel, touch and keyboard the
                // moment the reader takes over, which a scripted scroll would have to fight.
                container.scrollTo({
                  top:
                    container.scrollTop +
                    target.getBoundingClientRect().top -
                    container.getBoundingClientRect().top -
                    container.clientTop,
                  behavior: reducedMotion ? "instant" : "smooth",
                });
                window.history.replaceState(window.history.state, "", event.currentTarget.href);
              }}
              onHover={() => setHoveredIndex(index)}
              onFocus={() => {
                setHoveredIndex(null);
                setFocusedIndex(index);
              }}
            />
          );
        })}
      </ol>
    </nav>
  );
}

function SectionRailMarker({
  id,
  label,
  state,
  length,
  opacity,
  reducedMotion,
  onClick,
  onHover,
  onFocus,
}: SectionRailItem & {
  state: "complete" | "active" | "pending";
  length: number;
  opacity: number;
  reducedMotion: boolean;
  onClick: MouseEventHandler<HTMLAnchorElement>;
  onHover: () => void;
  onFocus: () => void;
}) {
  // The label shows under the pointer and on keyboard focus, as :hover and :focus-visible would.
  const [hovered, setHovered] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);
  const labelHidden = reducedMotion ? { opacity: 0 } : LABEL_HIDDEN;

  return (
    <li>
      <motion.a
        href={`#${id}`}
        aria-current={state === "active" ? "location" : undefined}
        aria-label={label}
        data-state={state}
        className="relative -mx-3 flex min-h-3 min-w-14 items-center px-3 no-underline"
        // Feedback starts on pointer-down, or on Enter, and the tick picks it up as a variant.
        whileTap="pressed"
        onClick={onClick}
        onPointerEnter={() => {
          setHovered(true);
          onHover();
        }}
        onPointerLeave={() => setHovered(false)}
        onFocus={(event) => {
          setFocusVisible(isFocusVisible(event.currentTarget));
          onFocus();
        }}
        onBlur={() => setFocusVisible(false)}
      >
        <motion.span
          aria-hidden="true"
          className="h-0.5 origin-left bg-current"
          style={{ width: TICK_LENGTH }}
          initial={false}
          animate={{ scaleX: length / TICK_LENGTH, opacity }}
          variants={reducedMotion ? PRESS_FADE : PRESS}
          transition={reducedMotion ? FADE : SPRING}
        />
        <AnimatePresence>
          {(hovered || focusVisible) && (
            <motion.span
              className="bg-popover/80 text-popover-foreground border-border [@media(prefers-reduced-transparency:reduce)]:bg-popover pointer-events-none absolute left-9 w-max max-w-52 origin-left rounded-sm border px-2 py-1 text-[0.6875rem] backdrop-blur-xl backdrop-saturate-150 [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
              initial={labelHidden}
              animate={LABEL_SHOWN}
              exit={labelHidden}
              transition={reducedMotion ? LABEL_FADE : LABEL_SPRING}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.a>
    </li>
  );
}
