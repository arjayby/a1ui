"use client";

import { animate, motion, useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

// Critically damped (about a 0.35s response), so rows settle without wobbling. Written as
// stiffness and damping because Motion drops `velocity` on duration-based springs, and every
// retarget here hands the spring a velocity.
const SETTLE = { type: "spring", stiffness: 320, damping: 36 } as const;
// The same response at a damping ratio of 0.8: a little overshoot, used only after a flick.
const FLICK = { type: "spring", stiffness: 320, damping: 29 } as const;
// A snappier critically damped spring for the lift itself.
const LIFT = { type: "spring", stiffness: 520, damping: 46 } as const;
const LIFT_SCALE = 1.02;
/** Release speed in px/s above which the drop counts as a flick and may overshoot. */
const FLICK_SPEED = 500;
/** Movement in px before a press on a row without a handle becomes a drag. */
const SLOP = 6;
/** How long a finger rests on a row without a handle before the row lifts. */
const HOLD_MS = 250;
/** Distance in px from a scroll container's edge at which the list starts to scroll. */
const EDGE = 56;
/** Fastest auto-scroll, in px/s, reached when the pointer is at or past the edge. */
const SCROLL_SPEED = 900;
const INTERACTIVE = "a, button, input, select, textarea, [contenteditable], [data-reorder-ignore]";

/** Apple's rubber band: the further past the end, the less the row follows. */
function rubberBand(overshoot: number, dimension: number) {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
}

interface Row {
  el: HTMLLIElement;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
  /** Where the row's spring is heading, so an unchanged target does not restart it. */
  target?: number;
}

/** Row geometry in flow order, measured without transforms, relative to the list's content box. */
interface Layout {
  keys: string[];
  tops: Map<string, number>;
  heights: Map<string, number>;
  gaps: number[];
}

type Phase = "pressed" | "dragging" | "keyboard";

interface Host {
  keys: string[];
  labels: string[];
  reducedMotion: boolean;
  disabled: boolean;
  root: HTMLElement | null;
  gap: { el: HTMLElement | null; y: MotionValue<number>; opacity: MotionValue<number> };
  reorder: (order: string[], from: number, to: number) => void;
  setActive: (active: { key: string; phase: Phase } | null) => void;
  setSettling: (update: (current: string | null) => string | null) => void;
  announce: (message: string) => void;
}

interface Session {
  key: string;
  via: "pointer" | "keyboard";
  /** False while a press has not yet become a drag. */
  following: boolean;
  /** The order being previewed, and the order to restore on cancel. */
  order: string[];
  start: string[];
  layout: Layout;
  pointerId: number;
  pointerY: number;
  downY: number;
  /** Distance from the top of the row to the point where it was grabbed. */
  grabOffset: number;
  samples: { t: number; y: number }[];
  moved: boolean;
  scrollers: Element[];
  carry: number;
  time: number;
  cleanup: () => void;
}

/** The transform the browser last painted, as [scale, translateY]. Motion values can be a frame ahead. */
function painted(el: Element): [number, number] {
  const values = /\(([^)]+)\)/.exec(getComputedStyle(el).transform)?.[1].split(",").map(Number) ?? [];
  if (values.length === 6) return [values[3] || 1, values[5]];
  if (values.length === 16) return [values[5] || 1, values[13]];
  return [1, 0];
}

/** Viewport position of the list's content origin. Slots are stored relative to it, so they survive scrolling. */
function originOf(root: HTMLElement) {
  return root.getBoundingClientRect().top + root.clientTop - root.scrollTop;
}

/** Scrollable ancestors, innermost first, ending with the page. */
function scrollersOf(el: HTMLElement) {
  const doc = el.ownerDocument;
  const found: Element[] = [];
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node === doc.body || node === doc.documentElement) break;
    if (/auto|scroll|overlay/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight)
      found.push(node);
  }
  if (doc.scrollingElement) found.push(doc.scrollingElement);
  return found;
}

/** The visible top and bottom of a scroll container, in viewport coordinates. */
function viewOf(scroller: Element) {
  const view = scroller.ownerDocument.defaultView;
  const height = view?.innerHeight ?? 0;
  if (scroller === scroller.ownerDocument.scrollingElement) return { top: 0, bottom: height };
  const rect = scroller.getBoundingClientRect();
  return { top: Math.max(0, rect.top), bottom: Math.min(height, rect.bottom) };
}

/** Stacks rows in the given order into the list's slots and returns each row's top. */
function arrange(order: string[], layout: Layout) {
  const slots = new Map<string, number>();
  let top = layout.tops.get(layout.keys[0]) ?? 0;
  order.forEach((key, index) => {
    slots.set(key, top);
    top += (layout.heights.get(key) ?? 0) + (layout.gaps[index] ?? layout.gaps.at(-1) ?? 0);
  });
  return slots;
}

/**
 * The drag engine. It lives outside React because a drag is driven by pointer events and
 * animation frames, not renders: rows move through motion values, the order being previewed is
 * plain data, and React only hears about a lift, a drop and the final order.
 */
function createEngine() {
  const rows = new Map<string, Row>();
  let host: Host | null = null;
  let session: Session | null = null;
  // The flow layout before the next render, which a reorder animates away from.
  let snapshot: Layout | null = null;
  let dropped: { key: string; velocity: number } | null = null;
  let refocus: string | null = null;
  let frame = 0;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  function measure(): Layout {
    const keys = (host?.keys ?? []).filter((key) => rows.has(key));
    const origin = host?.root ? originOf(host.root) : 0;
    const tops = new Map<string, number>();
    const heights = new Map<string, number>();
    for (const key of keys) {
      const { el } = rows.get(key)!;
      const rect = el.getBoundingClientRect();
      const [scale, shift] = painted(el);
      const height = rect.height / scale;
      heights.set(key, height);
      tops.set(key, rect.top - shift - (height - rect.height) / 2 - origin);
    }
    const gaps = keys
      .slice(1)
      .map((key, index) => tops.get(key)! - tops.get(keys[index])! - heights.get(keys[index])!);
    return { keys, tops, heights, gaps };
  }

  const labelOf = (key: string) => host?.labels[host.keys.indexOf(key)] ?? "Item";

  /** Reduced motion's stand-in for travel: the row is already in place and fades up. */
  function fade(row: Row) {
    row.opacity.jump(0.35);
    animate(row.opacity, 1, { duration: 0.2, ease: "easeOut" });
  }

  /** Springs a row to an offset from its slot, from wherever it is and at whatever speed it has. */
  function settle(row: Row, target: number, velocity?: number) {
    if (host?.reducedMotion) {
      if (row.y.get() !== target || row.y.isAnimating()) {
        row.y.jump(target);
        fade(row);
      }
      row.target = target;
      return undefined;
    }
    if (velocity === undefined) {
      if (row.y.isAnimating() ? row.target === target : row.y.get() === target) return undefined;
    }
    row.target = target;
    const spring = velocity !== undefined && Math.abs(velocity) > FLICK_SPEED ? FLICK : SETTLE;
    return animate(row.y, target, velocity === undefined ? spring : { ...spring, velocity });
  }

  /** Moves every row but a pointer-dragged one to its slot in the previewed order. */
  function preview(current: Session) {
    const slots = arrange(current.order, current.layout);
    for (const key of current.order) {
      const row = rows.get(key);
      if (!row || (key === current.key && current.via === "pointer")) continue;
      settle(row, slots.get(key)! - current.layout.tops.get(key)!);
    }
    const slot = slots.get(current.key);
    if (current.via !== "pointer" || !host || slot === undefined) return;
    if (host.reducedMotion) host.gap.y.jump(slot);
    else animate(host.gap.y, slot, SETTLE);
  }

  /** Keeps the dragged row under the pointer and opens the gap where it would land. */
  function follow(current: Session) {
    const row = rows.get(current.key);
    if (!row || !host?.root) return;
    const { keys, tops, heights } = current.layout;
    const top = tops.get(current.key);
    const height = heights.get(current.key);
    const last = keys.at(-1);
    if (top === undefined || height === undefined || last === undefined) return;
    const min = tops.get(keys[0])!;
    const max = tops.get(last)! + heights.get(last)! - height;
    let visual = current.pointerY - current.grabOffset - originOf(host.root);
    // Past either end of the list the row resists instead of stopping dead.
    const over = visual < min ? visual - min : visual > max ? visual - max : 0;
    if (over) {
      visual = (over < 0 ? min : max) + (host.reducedMotion ? 0 : rubberBand(over, max + height - min));
    }
    row.y.set(visual - top);

    // A neighbour gives way once the dragged row's leading edge passes its centre. The check
    // repeats so a fast drag can pass several rows in one frame.
    let changed = false;
    for (let guard = 0; guard < current.order.length; guard += 1) {
      const slots = arrange(current.order, current.layout);
      const index = current.order.indexOf(current.key);
      const next = current.order[index + 1];
      const previous = current.order[index - 1];
      let to = index;
      if (next !== undefined && visual + height > slots.get(next)! + heights.get(next)! / 2) to = index + 1;
      else if (previous !== undefined && visual < slots.get(previous)! + heights.get(previous)! / 2)
        to = index - 1;
      if (to === index) break;
      current.order.splice(index, 1);
      current.order.splice(to, 0, current.key);
      changed = true;
    }
    if (changed) preview(current);
  }

  /** Scrolls the nearest container that can still scroll while the pointer rests near its edge. */
  function autoScroll(time: number) {
    const current = session;
    if (!current?.following || current.via !== "pointer") return;
    const elapsed = Math.min(64, time - current.time) / 1000;
    current.time = time;
    let scrolled = false;
    for (const scroller of current.scrollers) {
      const { top, bottom } = viewOf(scroller);
      const edge = Math.min(EDGE, (bottom - top) / 3);
      // Only scroll the way the pointer has travelled, so grabbing a row near an edge stays put.
      const up = current.pointerY < current.downY ? (top + edge - current.pointerY) / edge : 0;
      const down = current.pointerY > current.downY ? (current.pointerY - (bottom - edge)) / edge : 0;
      const reach = up > 0 ? -Math.min(1, up) : down > 0 ? Math.min(1, down) : 0;
      if (!reach) continue;
      // Scroll offsets are whole pixels in some browsers, so slow speeds carry their remainder.
      current.carry += Math.sign(reach) * reach * reach * SCROLL_SPEED * elapsed;
      const step = Math.trunc(current.carry);
      if (!step) {
        scrolled = true;
        break;
      }
      const before = scroller.scrollTop;
      // `instant` so a page with smooth scrolling does not animate each step.
      scroller.scrollTo?.({ top: before + step, behavior: "instant" });
      if (scroller.scrollTop !== before) {
        current.carry -= step;
        follow(current);
        scrolled = true;
        break;
      }
    }
    if (!scrolled) current.carry = 0;
    frame = requestAnimationFrame(autoScroll);
  }

  /** Brings a keyboard-moved row's slot into view. */
  function reveal(current: Session) {
    if (!host?.root) return;
    const slot = arrange(current.order, current.layout).get(current.key) ?? 0;
    let top = originOf(host.root) + slot;
    let bottom = top + (current.layout.heights.get(current.key) ?? 0);
    for (const scroller of scrollersOf(host.root)) {
      const view = viewOf(scroller);
      const delta =
        top < view.top + 16 ? top - view.top - 16 : bottom > view.bottom - 16 ? bottom - view.bottom + 16 : 0;
      if (!delta) continue;
      const before = scroller.scrollTop;
      const limit = scroller.scrollHeight - scroller.clientHeight;
      const applied = Math.min(limit, Math.max(0, before + delta)) - before;
      scroller.scrollTo?.({ top: before + applied, behavior: host.reducedMotion ? "instant" : "smooth" });
      top -= applied;
      bottom -= applied;
    }
  }

  function showGap(current: Session) {
    const row = rows.get(current.key);
    const el = host?.gap.el;
    if (!host || !row || !el) return;
    el.style.left = `${row.el.offsetLeft}px`;
    el.style.width = `${row.el.offsetWidth}px`;
    el.style.height = `${current.layout.heights.get(current.key) ?? 0}px`;
    el.style.borderRadius = getComputedStyle(row.el).borderRadius;
    host.gap.y.jump(current.layout.tops.get(current.key) ?? 0);
    animate(host.gap.opacity, 1, { duration: 0.15 });
  }

  /** Ends the session. Committing keeps the previewed order; otherwise the original one returns. */
  function finish(commit: boolean, velocity = 0) {
    const current = session;
    if (!current || !host) return;
    session = null;
    current.cleanup();
    const row = rows.get(current.key);
    if (row && (row.scale.get() !== 1 || row.scale.isAnimating())) animate(row.scale, 1, SETTLE);
    animate(host.gap.opacity, 0, { duration: 0.15 });
    host.setActive(null);
    if (!current.following) {
      // The press never became a drag. Resume whatever settle it interrupted.
      if (row) settle(row, 0, 0);
      return;
    }
    const from = current.start.indexOf(current.key);
    const to = commit ? current.order.indexOf(current.key) : from;
    const label = labelOf(current.key);
    const total = current.order.length;
    snapshot = current.layout;
    dropped = { key: current.key, velocity };
    if (current.via === "pointer") host.setSettling(() => current.key);
    if (to !== from) host.reorder(current.order, from, to);
    if (!commit) {
      host.announce(`Reorder cancelled. ${label} returned to position ${from + 1} of ${total}.`);
    } else if (current.via === "keyboard") {
      host.announce(`${label} dropped at position ${to + 1} of ${total}.`);
    } else if (to !== from) {
      host.announce(`${label} moved to position ${to + 1} of ${total}.`);
    }
  }

  function press(key: string, event: PointerEvent, target: HTMLElement, immediate: boolean) {
    const row = rows.get(key);
    if (!host?.root || host.disabled || session || !row || event.button !== 0) return;
    const doc = row.el.ownerDocument;
    const touch = event.pointerType === "touch";
    const { pointerId, clientX: downX, clientY: downY } = event;
    // Catch the row where it is, even mid-settle, and remember where on it the pointer landed.
    row.y.stop();
    const rect = row.el.getBoundingClientRect();
    const [scale] = painted(row.el);
    const grabOffset = downY - (rect.top - (rect.height / scale - rect.height) / 2);
    const page = doc.documentElement.style;
    const selection = [page.userSelect, page.webkitUserSelect];

    const lift = (phase: Phase) => {
      host?.setActive({ key, phase });
      if (!host?.reducedMotion) animate(row.scale, LIFT_SCALE, LIFT);
    };
    const begin = () => {
      if (!host?.root) return;
      current.layout = measure();
      current.order = [...current.layout.keys];
      current.start = [...current.layout.keys];
      current.scrollers = scrollersOf(host.root);
      current.following = true;
      lift("dragging");
      try {
        target.setPointerCapture?.(pointerId);
      } catch {
        // The pointer is already gone; the document listeners still end the drag.
      }
      // A drag that started on text must not leave a selection trailing behind it.
      doc.getSelection()?.removeAllRanges();
      page.userSelect = page.webkitUserSelect = "none";
      showGap(current);
      follow(current);
      current.time = performance.now();
      frame = requestAnimationFrame(autoScroll);
    };
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      current.pointerY = moveEvent.clientY;
      current.samples.push({ t: moveEvent.timeStamp, y: moveEvent.clientY });
      while (moveEvent.timeStamp - current.samples[0].t > 100) current.samples.shift();
      const dx = moveEvent.clientX - downX;
      const dy = moveEvent.clientY - downY;
      if (Math.hypot(dx, dy) >= SLOP) current.moved = true;
      if (current.following) follow(current);
      else if (!current.moved) return;
      // A finger that moves before the hold elapses is scrolling. A mouse that leaves sideways
      // is selecting text. Both lose the row.
      else if (touch || Math.abs(dx) > Math.abs(dy)) finish(false);
      else begin();
    };
    const release = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      const recent = current.samples.filter((sample) => upEvent.timeStamp - sample.t <= 100);
      const first = recent[0];
      const last = recent.at(-1);
      const speed = first && last && last.t > first.t ? ((last.y - first.y) / (last.t - first.t)) * 1000 : 0;
      if (current.following && current.moved) {
        // The click that follows a drag belongs to the drag, not to whatever is under it.
        const swallow = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        doc.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => doc.removeEventListener("click", swallow, true));
      }
      finish(true, Math.max(-4000, Math.min(4000, speed)));
    };
    const cancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId === pointerId) finish(false);
    };
    const escape = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key !== "Escape" || !current.following) return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      finish(false);
    };
    const scroll = () => {
      if (current.following) follow(current);
    };
    const block = (blocked: Event) => {
      if (current.following || touch) blocked.preventDefault();
    };

    const current: Session = {
      key,
      via: "pointer",
      following: false,
      order: [],
      start: [],
      layout: { keys: [], tops: new Map(), heights: new Map(), gaps: [] },
      pointerId,
      pointerY: downY,
      downY,
      grabOffset,
      samples: [{ t: event.timeStamp, y: downY }],
      moved: false,
      scrollers: [],
      carry: 0,
      time: 0,
      cleanup() {
        clearTimeout(holdTimer);
        cancelAnimationFrame(frame);
        doc.removeEventListener("pointermove", move);
        doc.removeEventListener("pointerup", release);
        doc.removeEventListener("pointercancel", cancel);
        doc.removeEventListener("keydown", escape, true);
        doc.removeEventListener("scroll", scroll, true);
        doc.removeEventListener("selectstart", block);
        doc.removeEventListener("dragstart", block);
        doc.removeEventListener("contextmenu", block);
        [page.userSelect, page.webkitUserSelect] = selection;
        try {
          target.releasePointerCapture?.(pointerId);
        } catch {
          // Capture was never taken or is already released.
        }
      },
    };
    session = current;
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", release);
    doc.addEventListener("pointercancel", cancel);
    doc.addEventListener("keydown", escape, true);
    doc.addEventListener("scroll", scroll, { capture: true, passive: true });
    doc.addEventListener("selectstart", block);
    doc.addEventListener("dragstart", block);
    doc.addEventListener("contextmenu", block);

    if (immediate) begin();
    // A finger on a row without a handle might be scrolling, so the row waits for a short hold.
    else if (touch)
      holdTimer = setTimeout(() => {
        if (!current.moved && session === current) begin();
      }, HOLD_MS);
    // A mouse lifts the row at once and starts dragging after a few pixels of vertical travel.
    else lift("pressed");
  }

  function keyDown(key: string, event: ReactKeyboardEvent) {
    if (!host || host.disabled) return;
    const current = session;
    const held = current?.via === "keyboard" && current.key === key;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (event.repeat) return;
      if (held) {
        refocus = key;
        finish(true);
      } else if (!current && rows.has(key)) {
        const layout = measure();
        const row = rows.get(key)!;
        session = {
          key,
          via: "keyboard",
          following: true,
          order: [...layout.keys],
          start: [...layout.keys],
          layout,
          pointerId: -1,
          pointerY: 0,
          downY: 0,
          grabOffset: 0,
          samples: [],
          moved: false,
          scrollers: [],
          carry: 0,
          time: 0,
          cleanup() {},
        };
        host.setActive({ key, phase: "keyboard" });
        if (!host.reducedMotion) animate(row.scale, LIFT_SCALE, LIFT);
        host.announce(
          `Picked up ${labelOf(key)}. Position ${layout.keys.indexOf(key) + 1} of ${layout.keys.length}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
        );
      }
      return;
    }
    if (!held || !current) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      refocus = key;
      finish(false);
      return;
    }
    const index = current.order.indexOf(key);
    const end = current.order.length - 1;
    const moves: Record<string, number> = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: end };
    const wanted = moves[event.key];
    if (wanted === undefined) return;
    event.preventDefault();
    const to = Math.min(end, Math.max(0, wanted));
    if (to === index) {
      // At either end the row nudges against the edge and springs back instead of ignoring the key.
      const row = rows.get(key);
      if (row && !host.reducedMotion) {
        animate(row.y, row.target ?? 0, { ...SETTLE, velocity: wanted < 0 ? -320 : 320 });
      }
      return;
    }
    current.order.splice(index, 1);
    current.order.splice(to, 0, key);
    preview(current);
    reveal(current);
    host.announce(`${labelOf(key)} moved to position ${to + 1} of ${current.order.length}.`);
  }

  /** Runs after every render of the list: adopts the latest props and animates any change of order. */
  function commit(next: Host) {
    const previous = host?.keys;
    host = next;
    const changed =
      !previous || previous.length !== next.keys.length || previous.some((key, i) => key !== next.keys[i]);
    if (session && changed) {
      // The items changed underneath a drag. Let go without committing its order.
      const stale = session;
      session = null;
      stale.cleanup();
      const row = rows.get(stale.key);
      if (row) animate(row.scale, 1, SETTLE);
      animate(next.gap.opacity, 0, { duration: 0.15 });
      next.setActive(null);
      snapshot = stale.layout;
      dropped = { key: stale.key, velocity: 0 };
    }
    const drop = dropped;
    dropped = null;
    if (!changed && !drop) return;
    const before = snapshot;
    const now = measure();
    snapshot = now;
    // Each row keeps its place on screen across the reorder, then springs to its new slot.
    for (const key of now.keys) {
      const row = rows.get(key)!;
      const was = before?.tops.get(key);
      if (was === undefined) continue;
      const delta = was - now.tops.get(key)!;
      const landing = drop?.key === key;
      const offset = row.y.get() + delta;
      const velocity = landing ? drop.velocity : row.y.getVelocity();
      row.target = 0;
      if (next.reducedMotion) {
        const moved = Math.abs(offset) > 0.5 || Math.abs(delta) > 0.5;
        row.y.jump(0);
        if (moved) fade(row);
      } else if (Math.abs(offset) > 0.5 || Math.abs(velocity) > 1) {
        row.y.jump(offset);
        const spring = landing && Math.abs(velocity) > FLICK_SPEED ? FLICK : SETTLE;
        const settled = animate(row.y, 0, { ...spring, velocity });
        if (landing) settled.then(() => next.setSettling((current) => (current === key ? null : current)));
        continue;
      } else {
        row.y.jump(0);
      }
      if (landing) next.setSettling((current) => (current === key ? null : current));
    }
    if (refocus !== null) {
      // Moving a row in the DOM can drop its focus. A keyboard drop keeps it.
      const el = rows.get(refocus)?.el;
      refocus = null;
      (el?.querySelector<HTMLElement>('[data-slot="reorder-list-handle"]') ?? el)?.focus({
        preventScroll: true,
      });
    }
  }

  return {
    commit,
    press,
    keyDown,
    blur(key: string) {
      if (session?.via === "keyboard" && session.key === key) finish(true);
    },
    register(key: string, row: Row) {
      rows.set(key, row);
      return () => {
        if (rows.get(key) === row) rows.delete(key);
      };
    },
    attach(root: HTMLElement) {
      // A finger that has lifted a row drags it instead of scrolling the page. The listener has
      // to exist before the touch starts for the browser to honour it.
      const touchMove = (event: TouchEvent) => {
        if (session?.following && event.cancelable) event.preventDefault();
      };
      root.addEventListener("touchmove", touchMove, { passive: false });
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(() => {
              if (!session) snapshot = measure();
              else if (session.following) {
                session.layout = measure();
                preview(session);
              }
            });
      observer?.observe(root);
      return () => {
        root.removeEventListener("touchmove", touchMove);
        observer?.disconnect();
        session?.cleanup();
        session = null;
      };
    },
  };
}

interface RootContextValue {
  engine: ReturnType<typeof createEngine>;
  active: { key: string; phase: Phase } | null;
  settling: string | null;
  disabled: boolean;
  instructionsId: string;
}

const RootContext = createContext<RootContextValue | null>(null);
const ItemContext = createContext<{ itemKey: string; label: string } | null>(null);
const HandleContext = createContext<(() => () => void) | null>(null);

function useParts(part: string) {
  const root = useContext(RootContext);
  const item = useContext(ItemContext);
  if (!root || !item) throw new Error(`${part} must be rendered inside ReorderList.`);
  return { root, item };
}

export interface ReorderListProps<T> {
  /** Accessible name of the list. */
  label: string;
  /** Controlled order. Update it in `onReorder`. */
  items?: readonly T[];
  /** Initial order when uncontrolled. */
  defaultItems?: readonly T[];
  /** Called once per drop with the new order and the move that produced it. */
  onReorder?: (items: T[], move: { from: number; to: number }) => void;
  /** Stable identity of an item. Defaults to the item itself, or its `id`. */
  getKey?: (item: T) => string;
  /** Name used in screen reader announcements. Defaults to the item itself, or "Item N". */
  getLabel?: (item: T) => string;
  /** Renders one row. Return a `ReorderListItem`. */
  children: (item: T, index: number) => ReactNode;
  disabled?: boolean;
  className?: string;
}

function defaultKey(item: unknown) {
  return String(typeof item === "object" && item !== null && "id" in item ? item.id : item);
}

export function ReorderList<T>({
  label,
  items,
  defaultItems,
  onReorder,
  getKey = defaultKey,
  getLabel,
  children,
  disabled = false,
  className,
}: ReorderListProps<T>) {
  const [internalItems, setInternalItems] = useState<readonly T[]>(defaultItems ?? []);
  const [engine] = useState(createEngine);
  const [active, setActive] = useState<RootContextValue["active"]>(null);
  const [settling, setSettling] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The engine reports back through these; the setters are stable, so one object lasts the lifetime.
  const [signals] = useState(() => ({ setActive, setSettling, announce: setAnnouncement }));
  const reducedMotion = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);
  const gapY = useMotionValue(0);
  const gapOpacity = useMotionValue(0);
  const instructionsId = useId();
  const list = items ?? internalItems;
  const keys = list.map(getKey);
  const labels = list.map((item, index) =>
    getLabel ? getLabel(item) : typeof item === "object" ? `Item ${index + 1}` : String(item),
  );

  useLayoutEffect(() => {
    engine.commit({
      keys,
      labels,
      reducedMotion,
      disabled,
      root: rootRef.current,
      gap: { el: gapRef.current, y: gapY, opacity: gapOpacity },
      reorder(order, from, to) {
        const byKey = new Map(list.map((item, index) => [keys[index], item]));
        const next = order.flatMap((key) => (byKey.has(key) ? [byKey.get(key) as T] : []));
        if (items === undefined) setInternalItems(next);
        onReorder?.(next, { from, to });
      },
      ...signals,
    });
  });

  useEffect(() => (rootRef.current ? engine.attach(rootRef.current) : undefined), [engine]);

  return (
    <RootContext.Provider value={{ engine, active, settling, disabled, instructionsId }}>
      <div
        ref={rootRef}
        data-slot="reorder-list"
        data-dragging={active?.phase === "dragging" || undefined}
        data-disabled={disabled || undefined}
        className={`text-foreground relative w-full min-w-0 ${className ?? ""}`}
      >
        {/* The landing slot, visible in the gap the other rows open up. */}
        <motion.div
          ref={gapRef}
          aria-hidden="true"
          data-slot="reorder-list-gap"
          className="bg-muted contrast-more:border-foreground pointer-events-none absolute top-0 left-0 contrast-more:border contrast-more:border-dashed"
          style={{ y: gapY, opacity: gapOpacity }}
        />
        <ol role="list" aria-label={label} className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((item, index) => (
            <ItemContext.Provider key={keys[index]} value={{ itemKey: keys[index], label: labels[index] }}>
              {children(item, index)}
            </ItemContext.Provider>
          ))}
        </ol>
        <span id={instructionsId} hidden>
          Press Space to pick up. Use the arrow keys to move, Space to drop, Escape to cancel.
        </span>
        <span aria-live="assertive" aria-atomic="true" className="sr-only">
          {announcement}
        </span>
      </div>
    </RootContext.Provider>
  );
}

export interface ReorderListItemProps {
  children: ReactNode;
  className?: string;
}

export function ReorderListItem({ children, className }: ReorderListItemProps) {
  const { root, item } = useParts("ReorderListItem");
  const ref = useRef<HTMLLIElement>(null);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(1);
  // Handles announce themselves, so a row knows whether the whole of it should drag.
  const [handles, setHandles] = useState(0);
  const [registerHandle] = useState(() => () => {
    setHandles((count) => count + 1);
    return () => setHandles((count) => count - 1);
  });
  const { engine } = root;
  const { itemKey } = item;
  useLayoutEffect(
    () => (ref.current ? engine.register(itemKey, { el: ref.current, y, scale, opacity }) : undefined),
    [engine, itemKey, y, scale, opacity],
  );
  const whole = handles === 0 && !root.disabled;
  const lifted = root.active?.key === itemKey;

  return (
    <HandleContext.Provider value={registerHandle}>
      <motion.li
        ref={ref}
        data-slot="reorder-list-item"
        data-lifted={lifted || undefined}
        data-settling={(!lifted && root.settling === itemKey) || undefined}
        tabIndex={whole ? 0 : undefined}
        aria-describedby={whole ? root.instructionsId : undefined}
        className={`group/reorder-item border-border bg-card text-card-foreground focus-visible:ring-ring/50 contrast-more:data-lifted:outline-foreground data-lifted:ring-foreground/10 relative flex min-h-12 items-center gap-3 rounded-lg border px-3 text-sm transition-shadow duration-200 outline-none focus-visible:ring-3 data-lifted:z-20 data-lifted:shadow-lg data-lifted:ring-1 data-settling:z-10 motion-reduce:transition-none contrast-more:data-lifted:outline-2 ${whole ? "cursor-grab data-lifted:cursor-grabbing" : ""} ${className ?? ""}`}
        style={{ y, scale, opacity }}
        onPointerDown={(event) => {
          const inside = (event.target as Element).closest(INTERACTIVE);
          if (!whole || (inside && inside !== event.currentTarget)) return;
          engine.press(itemKey, event.nativeEvent, event.currentTarget, false);
        }}
        onKeyDown={(event) => {
          if (whole && event.target === event.currentTarget) engine.keyDown(itemKey, event);
        }}
        onBlur={(event) => {
          if (event.target === event.currentTarget) engine.blur(itemKey);
        }}
      >
        {children}
      </motion.li>
    </HandleContext.Provider>
  );
}

export interface ReorderListHandleProps {
  /** Defaults to "Reorder" followed by the item's label. */
  "aria-label"?: string;
  /** Replaces the grip icon. */
  children?: ReactNode;
  className?: string;
}

export function ReorderListHandle({ "aria-label": ariaLabel, children, className }: ReorderListHandleProps) {
  const { root, item } = useParts("ReorderListHandle");
  const registerHandle = useContext(HandleContext);
  useLayoutEffect(() => registerHandle?.(), [registerHandle]);
  const { engine } = root;

  return (
    <button
      type="button"
      data-slot="reorder-list-handle"
      aria-label={ariaLabel ?? `Reorder ${item.label}`}
      aria-describedby={root.instructionsId}
      aria-pressed={root.active?.key === item.itemKey && root.active.phase === "keyboard"}
      disabled={root.disabled}
      className={`text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 group-data-lifted/reorder-item:text-foreground -mr-2 grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-md outline-none select-none group-data-lifted/reorder-item:cursor-grabbing focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-40 ${className ?? ""}`}
      onPointerDown={(event) => engine.press(item.itemKey, event.nativeEvent, event.currentTarget, true)}
      onKeyDown={(event) => engine.keyDown(item.itemKey, event)}
      onBlur={() => engine.blur(item.itemKey)}
    >
      {children ?? (
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
          <circle cx="5.5" cy="3.5" r="1.25" />
          <circle cx="10.5" cy="3.5" r="1.25" />
          <circle cx="5.5" cy="8" r="1.25" />
          <circle cx="10.5" cy="8" r="1.25" />
          <circle cx="5.5" cy="12.5" r="1.25" />
          <circle cx="10.5" cy="12.5" r="1.25" />
        </svg>
      )}
    </button>
  );
}
