"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties } from "react";

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
    let frame = 0;

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

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    update();
    scrollContainer.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
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
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={state === "active" ? "location" : undefined}
                aria-label={label}
                data-state={state}
                className="group relative -mx-3 flex min-h-3 min-w-14 items-center px-3 no-underline"
                onPointerEnter={() => setHoveredIndex(index)}
                onFocus={() => {
                  setHoveredIndex(null);
                  setFocusedIndex(index);
                }}
              >
                <span
                  aria-hidden="true"
                  className="h-0.5 bg-current transition-[width,opacity] duration-150 ease-out motion-reduce:transition-none"
                  style={{ width: markerWidth, opacity: markerOpacity }}
                />
                <span className="bg-background text-foreground border-border pointer-events-none absolute left-9 w-max max-w-52 -translate-x-1 rounded-sm border px-2 py-1 text-[0.6875rem] opacity-0 transition-[opacity,transform] duration-100 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  {label}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
