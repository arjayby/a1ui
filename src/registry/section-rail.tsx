"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";

export interface SectionRailItem {
  id: string;
  label: string;
}

export interface SectionRailProps extends Omit<ComponentPropsWithoutRef<"nav">, "aria-label"> {
  sections: SectionRailItem[];
  activeOffset?: number;
  ariaLabel?: string;
}

export function SectionRail({
  sections,
  activeOffset = 0.36,
  ariaLabel = "Page sections",
  className,
  ...props
}: SectionRailProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const trackedSections = sections
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (trackedSections.length === 0) return;

    let frame = 0;

    const update = () => {
      const marker = window.innerHeight * Math.min(1, Math.max(0, activeOffset));
      let nextActiveIndex = 0;

      trackedSections.forEach((section, index) => {
        if (section.getBoundingClientRect().top <= marker) nextActiveIndex = index;
      });

      setActiveIndex(nextActiveIndex);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeOffset, sections]);

  return (
    <nav
      aria-label={ariaLabel}
      className={["text-foreground", className].filter(Boolean).join(" ")}
      {...props}
    >
      <ol className="flex list-none flex-col gap-0.5 p-0">
        {sections.map(({ id, label }, index) => {
          const state = index < activeIndex ? "complete" : index === activeIndex ? "active" : "pending";

          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={state === "active" ? "location" : undefined}
                aria-label={label}
                data-state={state}
                className="group relative -mx-3 flex min-h-5 min-w-14 items-center px-3 no-underline"
              >
                <span
                  aria-hidden="true"
                  className="h-[3px] w-3 bg-current opacity-25 transition-[width,opacity] duration-150 group-data-[state=active]:w-5 group-data-[state=active]:opacity-100 group-data-[state=complete]:opacity-55 motion-reduce:transition-none"
                />
                <span className="bg-background text-foreground border-border absolute left-9 w-max max-w-52 -translate-x-1 rounded-sm border px-2 py-1 text-[0.6875rem] opacity-0 transition-[opacity,transform] duration-100 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
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
