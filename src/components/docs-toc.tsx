"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Menu, MenuItem } from "@/registry/components/menu";

export type DocsTocItem = { url: string; title: ReactNode; depth: number };

// A heading counts as current once it crosses this line below the sticky header.
const activationOffset = 128;

// `key` is the newline-joined heading ids, so the listener only resubscribes when they change.
function useActiveSection(key: string) {
  const [active, setActive] = useState(key.split("\n")[0]);

  useEffect(() => {
    const headings = key
      .split("\n")
      .map((id) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => heading !== null);
    if (headings.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
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
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [key]);

  return [active, setActive] as const;
}

export function DocsToc({ items }: { items: DocsTocItem[] }) {
  const sections = items.filter((item) => item.depth === 2);
  const ids = sections.map((item) => decodeURIComponent(item.url.replace(/^#/, "")));
  const [active, setActive] = useActiveSection(ids.join("\n"));

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
                onClick={() => setActive(id)}
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
