"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";

import { Menu, MenuItem } from "@/registry/components/menu";

export type DocsTocItem = { url: string; title: ReactNode; depth: number };

// A heading counts as current once it crosses this line below the sticky header.
const activationOffset = 128;
// A jump ends when it lands, when the reader scrolls or presses a key, or as a fallback once
// scrolling has been idle this long (for example after a layout shift moved the target). It is
// generous so slow frames during the smooth scroll never end a jump early.
const jumpIdleMs = 600;
// Input that means the reader is taking over from a jump in progress.
const takeoverEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

// While set, a jump started from the menu is scrolling and the clicked item stays current.
type Hold = RefObject<{ target: number; timer: number } | null>;
// Recomputes the current section from the scroll position.
type Resync = RefObject<() => void>;

function release(hold: Hold) {
  if (hold.current) window.clearTimeout(hold.current.timer);
  hold.current = null;
}

function holdUntil(hold: Hold, target: number, resync: Resync) {
  if (hold.current) window.clearTimeout(hold.current.timer);
  const settle = () => {
    // Scrolling stopped short of the target: follow where the page ended up.
    const strayed = Math.abs(window.scrollY - target) > 1;
    release(hold);
    if (strayed) resync.current();
  };
  hold.current = { target, timer: window.setTimeout(settle, jumpIdleMs) };
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
  const resync: Resync = useRef(() => {});

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
        else holdUntil(hold, hold.current.target, resync);
        return;
      }
      if (!frame) frame = requestAnimationFrame(update);
    };

    const takeOver = () => {
      if (!hold.current) return;
      release(hold);
      schedule();
    };

    resync.current = schedule;
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    for (const type of takeoverEvents) window.addEventListener(type, takeOver, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      release(hold);
      resync.current = () => {};
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      for (const type of takeoverEvents) window.removeEventListener(type, takeOver);
    };
  }, [key]);

  const jumpTo = (id: string) => {
    const heading = document.getElementById(id);
    setActive(id);
    if (!heading) return;
    holdUntil(hold, scrollTarget(heading), resync);
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
      <div className="docs-toc-rail">
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
                    // A pointer click leaves focus on the link, and Menu highlights the focused item, so a
                    // later window refocus would pull the highlight back here after scrolling elsewhere.
                    // Keyboard activation (detail 0) keeps focus so the reader stays in the menu.
                    if (event.detail > 0) event.currentTarget.blur();
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
        {/* To add a sponsorship card, render it inside <div className="docs-toc-footer">
          here: it stays pinned to the bottom of the sticky rail. */}
      </div>
    </aside>
  );
}
