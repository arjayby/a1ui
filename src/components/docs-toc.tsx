"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";

import { Menu, MenuItem } from "@/registry/components/menu";

export type DocsTocItem = { url: string; title: ReactNode; depth: number };

// A heading counts as current once it crosses this line below the sticky header.
const activationOffset = 128;
// A jump also ends once scrolling has been idle this long (interrupted, or the target was unreachable).
const scrollSettleMs = 150;

// While set, a jump started from the menu is scrolling and the clicked item stays current.
type Hold = RefObject<{ target: number; timer: number } | null>;

function release(hold: Hold) {
  if (hold.current) window.clearTimeout(hold.current.timer);
  hold.current = null;
}

function holdUntil(hold: Hold, target: number) {
  if (hold.current) window.clearTimeout(hold.current.timer);
  hold.current = { target, timer: window.setTimeout(() => release(hold), scrollSettleMs) };
}

function scrollTarget(heading: HTMLElement) {
  const margin = Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const top = heading.getBoundingClientRect().top + window.scrollY - margin;
  return Math.round(Math.max(0, Math.min(max, top)));
}

// `key` is the newline-joined heading ids, so the listener only resubscribes when they change.
function useActiveSection(key: string) {
  const [active, setActive] = useState(key.split("\n")[0]);
  const hold: Hold = useRef(null);

  useEffect(() => {
    const headings = key
      .split("\n")
      .map((id) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => heading !== null);
    if (headings.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      if (hold.current) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = headings[0];
      if (atBottom) current = headings[headings.length - 1];
      else
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top > activationOffset) break;
          current = heading;
        }
      setActive(current.id);
    };
    const schedule = () => {
      // Skip the sections a jump passes through, and keep the clicked item once it lands.
      if (hold.current) {
        if (Math.abs(window.scrollY - hold.current.target) <= 1) release(hold);
        else holdUntil(hold, hold.current.target);
        return;
      }
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      release(hold);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [key]);

  const jumpTo = (id: string) => {
    const heading = document.getElementById(id);
    setActive(id);
    if (!heading) return;
    holdUntil(hold, scrollTarget(heading));
    // Updating the hash ourselves avoids the fragment navigation's popstate, which the router
    // answers with a second scroll that fights this one.
    window.history.pushState(window.history.state, "", `#${encodeURIComponent(id)}`);
    // Smooth or instant follows the root `scroll-behavior`, so reduced motion is respected.
    heading.scrollIntoView({ block: "start" });
  };

  return [active, jumpTo] as const;
}

function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function DocsToc({ items }: { items: DocsTocItem[] }) {
  const sections = items.filter((item) => item.depth === 2);
  const ids = sections.map((item) => decodeURIComponent(item.url.replace(/^#/, "")));
  const [active, jumpTo] = useActiveSection(ids.join("\n"));

  if (sections.length === 0) return null;

  return (
    <aside className="docs-toc">
      <nav aria-label="On this page">
        <p className="docs-toc-label">On this page</p>
        <Menu value={active} className="flex flex-col gap-0.5">
          {sections.map((item, index) => {
            const id = ids[index];
            const current = active === id;
            return (
              <MenuItem
                key={item.url}
                value={id}
                data-active={current ? "" : undefined}
                aria-current={current ? "location" : undefined}
                onClick={(event) => {
                  if (!isPlainClick(event)) return;
                  event.preventDefault();
                  jumpTo(id);
                }}
                className="docs-toc-link"
                render={<a href={item.url} />}
              >
                {item.title}
              </MenuItem>
            );
          })}
        </Menu>
      </nav>
    </aside>
  );
}
