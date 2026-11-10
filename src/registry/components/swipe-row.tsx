"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/** Width of one action in pixels. A side opens by this much for each of its actions. */
const ACTION_WIDTH = 72;
/** Travel before the gesture picks an axis, so a vertical scroll never drags the row. */
const AXIS_LOCK = 10;
/** A full swipe arms once the pointer has crossed this share of the row, */
const FULL_SWIPE = 0.6;
/** and is at least this far past the actions. Leaving takes a little less, so it does not flicker. */
const FULL_SWIPE_MARGIN = 48;
const FULL_SWIPE_SLACK = 12;
/** Scroll-like deceleration used to project where a released row would coast to. */
const DECELERATION = 0.998;
/** Below this speed (px/s) a release counts as resting and position decides alone. */
const REST_SPEED = 50;
/** Above this speed a release is a flick: the row may overshoot open, and a press catches it. */
const FLICK_SPEED = 500;
const CATCH_SPEED = 60;
/** The most speed a flick hands to the bouncy spring, which keeps its overshoot near 15 pixels. */
const MAX_THROW = 2500;
// Critically damped (about a 0.36s response). Written as stiffness and damping because Motion
// drops `velocity` on duration-based springs, and every release hands the spring a velocity.
const STIFFNESS = 305;
const SETTLE = { type: "spring", stiffness: STIFFNESS, damping: 35 } as const;
// Damping ratio 0.8: a slight overshoot, used only when a flick opened the row.
const BOUNCE = { type: "spring", stiffness: STIFFNESS, damping: 28 } as const;
// Reduced motion: nothing slides, so the same values drive a short cross-fade instead.
const FADE = { duration: 0.2, ease: "easeOut" } as const;

const TONES = {
  neutral: "bg-muted text-foreground",
  primary: "bg-primary text-primary-foreground",
  destructive: "bg-destructive text-background",
};

/** Apple's rubber band: the further past the edge, the less the row follows. */
function rubberBand(overshoot: number, dimension: number) {
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * overshoot);
}

/** The pointer travel that produces a given rubber-band offset, so a caught row keeps its grab point. */
function unband(offset: number, dimension: number) {
  return offset < dimension ? (offset * dimension) / (0.55 * (dimension - offset)) : offset;
}

/** Where a value moving at `velocity` (px/s) would coast to a stop. */
function project(velocity: number) {
  return ((velocity / 1000) * DECELERATION) / (1 - DECELERATION);
}

// Motion's useReducedMotion reads the media query on the first client render, which the server
// cannot know. Applying it only after hydration keeps the client's first render identical to the
// server HTML; React re-renders with the real preference right after hydrating.
const subscribeNever = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

export type SwipeRowSide = "leading" | "trailing";

export interface SwipeRowAction {
  /** Visible label and accessible name of the button. */
  label: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
  /** Set when `onAction` removes the row from the list: the row then leaves in the swipe direction. */
  removesRow?: boolean;
  onAction: () => void;
}

interface Group {
  claim: (owner: object, close: () => void) => void;
  release: (owner: object) => void;
}

function createGroup(): Group {
  let current: { owner: object; close: () => void } | null = null;
  return {
    claim(owner, close) {
      if (current && current.owner !== owner) current.close();
      current = { owner, close };
    },
    release(owner) {
      if (current?.owner === owner) current = null;
    },
  };
}

const GroupContext = createContext<Group | null>(null);

/** A list of rows in which opening one row closes the row that was open. */
export function SwipeRowGroup({ children, ...props }: ComponentProps<"div">) {
  const [group] = useState(createGroup);
  return (
    <GroupContext value={group}>
      <div data-slot="swipe-row-group" role="list" {...props}>
        {children}
      </div>
    </GroupContext>
  );
}

export interface SwipeRowProps {
  /** Actions revealed at the left edge by swiping right. The first one is primary. */
  leading?: readonly SwipeRowAction[];
  /** Actions revealed at the right edge by swiping left. The first one is primary. */
  trailing?: readonly SwipeRowAction[];
  /** Lets a swipe across most of the row commit the primary action on release. */
  fullSwipe?: boolean;
  open?: SwipeRowSide | null;
  defaultOpen?: SwipeRowSide | null;
  onOpenChange?: (open: SwipeRowSide | null) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

const NONE: readonly SwipeRowAction[] = [];

export function SwipeRow({
  leading = NONE,
  trailing = NONE,
  fullSwipe = true,
  open: openProp,
  defaultOpen = null,
  onOpenChange,
  disabled = false,
  className,
  children,
}: SwipeRowProps) {
  const hydrated = useHydrated();
  const reducedMotion = (useReducedMotion() ?? false) && hydrated;
  const group = use(GroupContext);
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp === undefined ? openState : openProp;
  // The row has left after an action that removes it, and waits to be unmounted.
  const [gone, setGone] = useState(false);
  // Past the full-swipe threshold: the primary action fills and a release commits it.
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const sizes = { leading: leading.length * ACTION_WIDTH, trailing: trailing.length * ACTION_WIDTH };
  const initial = open === "leading" ? sizes.leading : open === "trailing" ? -sizes.trailing : 0;
  // Everything on screen derives from this one offset: positive reveals the leading actions.
  const x = useMotionValue(initial);
  const fill = useMotionValue(0);
  const away = useMotionValue(0);
  const presence = useTransform(away, (value) => 1 - value);
  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const targetRef = useRef(initial);
  const armedRef = useRef(false);
  const closing = useRef(false);
  const suppressClick = useRef(false);
  const stopGesture = useRef<(() => void) | null>(null);

  function restOf(side: SwipeRowSide | null, left: boolean) {
    if (!side) return 0;
    const sign = side === "leading" ? 1 : -1;
    // With reduced motion a leaving row fades where it is instead of sliding off.
    return sign * (left && !reducedMotion ? (rootRef.current?.offsetWidth ?? 0) : sizes[side]);
  }

  /** Springs to `target` from wherever the row is, carrying `velocity` (px/s) into the spring. */
  function settle(target: number, velocity = x.getVelocity(), flicked = false) {
    targetRef.current = target;
    if (reducedMotion) return animate(x, target, FADE);
    if (flicked && Math.abs(velocity) > FLICK_SPEED) {
      // A hard throw still only overshoots by a few pixels.
      const thrown = Math.max(-MAX_THROW, Math.min(MAX_THROW, velocity));
      return animate(x, target, { ...BOUNCE, velocity: thrown });
    }
    // Closing and leaving never overshoot, which would flash the other side's actions: this is
    // the most velocity a critically damped spring absorbs before it crosses its target.
    const limit = Math.sqrt(STIFFNESS) * Math.abs(target - x.get());
    return animate(x, target, { ...SETTLE, velocity: Math.max(-limit, Math.min(limit, velocity)) });
  }

  function arm(next: boolean, tick = true) {
    if (armedRef.current === next) return;
    armedRef.current = next;
    setArmed(next);
    // One tick as the threshold is crossed, on the same frame the primary action starts to fill.
    if (next && tick) navigator.vibrate?.(8);
    animate(fill, next ? 1 : 0, reducedMotion ? FADE : SETTLE);
  }

  /** Asks for a new open side and returns the side to settle on: a controlled row waits for its prop. */
  function change(next: SwipeRowSide | null) {
    if (next === openRef.current) return next;
    onOpenChange?.(next);
    if (openProp !== undefined) return openRef.current;
    openRef.current = next;
    setOpenState(next);
    return next;
  }

  /** Focus never stays on an action the row is about to hide. */
  function blurActions() {
    const focused = rootRef.current?.ownerDocument.activeElement;
    if (!(focused instanceof HTMLElement) || !rootRef.current?.contains(focused)) return;
    if (!focused.closest('[data-slot="swipe-row-actions"]')) return;
    closing.current = true;
    focused.blur();
    closing.current = false;
  }

  function close(velocity?: number, committed = false) {
    blurActions();
    setGone(false);
    if (away.get() !== 0) animate(away, 0, FADE);
    const rest = settle(restOf(change(null), false), velocity);
    // A committed action stays filled while the row returns, then resets out of sight.
    if (!committed) arm(false);
    else void rest.then(() => !x.isAnimating() && x.get() === 0 && arm(false));
  }

  function show(side: SwipeRowSide, velocity?: number, flicked = false) {
    arm(false);
    setGone(false);
    settle(restOf(change(side), false), velocity, flicked);
  }

  function leave(side: SwipeRowSide, velocity?: number) {
    setGone(true);
    if (reducedMotion) animate(away, 1, FADE);
    settle(restOf(change(side), true), velocity);
  }

  function commit(side: SwipeRowSide, velocity: number) {
    const action = (side === "leading" ? leading : trailing)[0];
    // Momentum can carry a release over the threshold, so the tick may land here.
    arm(true);
    if (action.removesRow) leave(side, velocity);
    else close(velocity, true);
    action.onAction();
  }

  function press(action: SwipeRowAction, side: SwipeRowSide, primary: boolean, event: ReactMouseEvent) {
    if (action.removesRow) {
      // A pressed button needs no tick: the press is its own confirmation.
      if (primary) arm(true, false);
      leave(side);
      // A click from the keyboard has no detail: focus is still on the action, so it stays in view.
    } else if (event.detail !== 0) close();
    action.onAction();
  }

  /** Focus moving into a side's actions reveals them, and focus leaving puts them away. */
  function reveal(side: SwipeRowSide) {
    if (openRef.current !== side) show(side);
  }

  function conceal(side: SwipeRowSide) {
    if (!closing.current && openRef.current === side) close();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || !event.isPrimary || event.button !== 0 || stopGesture.current) return;
    suppressClick.current = false;
    if (gone) return close();
    const root = event.currentTarget;
    const doc = root.ownerDocument;
    const { pointerId, clientX: startX, clientY: startY } = event;
    const width = root.offsetWidth;
    const pressedOpenContent =
      openRef.current !== null && !(event.target as Element).closest('[data-slot="swipe-row-actions"]');
    const samples: { time: number; raw: number; shown: number }[] = [];
    let locked = false;
    // `raw` is where the row would be if it followed the pointer 1:1 from the grab point.
    let origin = 0;
    let base = 0;
    let raw = 0;

    const lock = (clientX: number, time: number) => {
      locked = true;
      x.stop();
      const shown = x.get();
      const past = shown > sizes.leading ? shown - sizes.leading : Math.min(shown + sizes.trailing, 0);
      origin = clientX;
      base = raw = shown - past + Math.sign(past) * unband(Math.abs(past), width);
      samples.push({ time, raw, shown });
      suppressClick.current = true;
      // Capture can fail if the pointer is already gone; the document listeners still follow it.
      try {
        root.setPointerCapture(pointerId);
      } catch {}
      setDragging(true);
    };

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (!locked) {
        const dx = Math.abs(moveEvent.clientX - startX);
        const dy = Math.abs(moveEvent.clientY - startY);
        if (Math.max(dx, dy) < AXIS_LOCK) return;
        // A vertical gesture belongs to the page scroll.
        if (dy >= dx) return stop();
        // Tracking starts where the threshold was crossed, so the row does not jump to catch up
        // and a pointer that reports few moves loses none of its travel.
        lock(startX + Math.sign(moveEvent.clientX - startX) * AXIS_LOCK, moveEvent.timeStamp);
      }
      raw = base + moveEvent.clientX - origin;
      const side = raw > 0 ? "leading" : "trailing";
      const size = sizes[side];
      const reach = Math.abs(raw);
      const threshold = Math.max(size + FULL_SWIPE_MARGIN, width * FULL_SWIPE);
      arm(fullSwipe && size > 0 && reach >= threshold - (armedRef.current ? FULL_SWIPE_SLACK : 0));
      // 1:1 up to the width of the actions, then progressively less.
      x.set(Math.sign(raw) * (reach > size ? size + rubberBand(reach - size, width) : reach));
      samples.push({ time: moveEvent.timeStamp, raw, shown: x.get() });
      while (moveEvent.timeStamp - samples[0].time > 100) samples.shift();
    };

    const release = (releaseEvent: PointerEvent) => {
      if (releaseEvent.pointerId !== pointerId) return;
      stop();
      if (!locked) {
        // A tap on the content of an open row puts it away without activating what was tapped.
        if (releaseEvent.type === "pointerup" && pressedOpenContent) {
          suppressClick.current = true;
          close();
        }
        return;
      }
      setDragging(false);
      const first = samples[0];
      const last = samples[samples.length - 1];
      const elapsed = (last.time - first.time) / 1000;
      // A pointer that paused before lifting, or was cancelled, throws nothing.
      const moving =
        releaseEvent.type === "pointerup" && elapsed > 0 && releaseEvent.timeStamp - last.time < 80;
      const velocity = moving ? (last.raw - first.raw) / elapsed : 0;
      const shownVelocity = moving ? (last.shown - first.shown) / elapsed : 0;
      const sign = Math.sign(raw) || Math.sign(velocity);
      const side = sign > 0 ? "leading" : "trailing";
      const size = sizes[side];
      // Momentum decides where the row lands; the direction of travel decides whether to commit.
      const reach = sign * (raw + project(velocity));
      const heading = Math.abs(velocity) < REST_SPEED ? 0 : sign * Math.sign(velocity);
      const threshold = Math.max(size + FULL_SWIPE_MARGIN, width * FULL_SWIPE);
      // A flick may carry the last stretch over the threshold, but only from past the actions.
      const carried = sign * raw >= size && reach >= threshold;
      const lifted = releaseEvent.type === "pointerup";
      if (lifted && fullSwipe && size > 0 && heading >= 0 && (armedRef.current || carried)) {
        commit(side, shownVelocity);
      } else if (size > 0 && reach > size / 2) show(side, shownVelocity, true);
      else close(shownVelocity);
    };

    function stop() {
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", release);
      doc.removeEventListener("pointercancel", release);
      stopGesture.current = null;
    }

    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", release);
    doc.addEventListener("pointercancel", release);
    stopGesture.current = stop;
    // A row still in flight is caught where it is, like a scroll view stopped under a finger.
    if (x.isAnimating() && Math.abs(x.getVelocity()) > CATCH_SPEED) lock(startX, event.timeStamp);
  }

  // A controlled `open`, a changed number of actions, or a motion preference moves the rest point.
  const sync = useEffectEvent(() => {
    openRef.current = open;
    const target = restOf(open, gone);
    if (target !== targetRef.current) settle(target);
  });
  useEffect(() => {
    sync();
  }, [open, gone, sizes.leading, sizes.trailing, reducedMotion]);

  const dismiss = useEffectEvent(() => close());
  useEffect(() => {
    const root = rootRef.current;
    if (!open || !root) return;
    const doc = root.ownerDocument;
    const view = doc.defaultView;
    const pressOutside = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) dismiss();
    };
    // Focusing an action can scroll it into view, and focus is what keeps that row open.
    const scroll = () => {
      const focused = doc.activeElement;
      if (!root.contains(focused) || !focused?.closest('[data-slot="swipe-row-actions"]')) dismiss();
    };
    // Claiming the group closes whichever row was open before this one.
    group?.claim(rootRef, () => dismiss());
    doc.addEventListener("pointerdown", pressOutside, true);
    view?.addEventListener("scroll", scroll, { capture: true, passive: true });
    return () => {
      doc.removeEventListener("pointerdown", pressOutside, true);
      view?.removeEventListener("scroll", scroll, true);
    };
  }, [open, group]);

  useEffect(
    () => () => {
      stopGesture.current?.();
      group?.release(rootRef);
    },
    [group],
  );

  const sides = [
    { side: "leading", actions: leading },
    { side: "trailing", actions: trailing },
  ] as const;
  const [before, after] = sides.map(
    ({ side, actions }) =>
      actions.length > 0 && (
        <SwipeRowActions
          key={side}
          side={side}
          actions={actions}
          x={x}
          fill={fill}
          reducedMotion={reducedMotion}
          interactive={open === side && !gone}
          disabled={disabled}
          onFocus={reveal}
          onBlur={conceal}
          onPress={press}
        />
      ),
  );

  return (
    <motion.div
      ref={rootRef}
      role={group ? "listitem" : undefined}
      data-slot="swipe-row"
      data-open={open ?? undefined}
      data-dragging={dragging || undefined}
      data-full-swipe={armed || undefined}
      data-disabled={disabled || undefined}
      className={`relative isolate touch-pan-y overflow-clip select-none ${className ?? ""}`}
      style={{ opacity: presence }}
      onPointerDown={onPointerDown}
      onDragStart={(event) => event.preventDefault()}
      onKeyDownCapture={() => {
        suppressClick.current = false;
      }}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        // The click that ends a drag, or closes an open row, is not meant for what is under it.
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {before}
      <motion.div
        data-slot="swipe-row-content"
        className="relative z-1"
        // The same style keys in both modes, so nothing stale is left behind when the preference flips.
        style={{ x: reducedMotion ? 0 : x }}
      >
        {children}
      </motion.div>
      {after}
    </motion.div>
  );
}

function SwipeRowActions({
  side,
  actions,
  x,
  fill,
  reducedMotion,
  interactive,
  disabled,
  onFocus,
  onBlur,
  onPress,
}: {
  side: SwipeRowSide;
  actions: readonly SwipeRowAction[];
  x: MotionValue<number>;
  fill: MotionValue<number>;
  reducedMotion: boolean;
  interactive: boolean;
  disabled: boolean;
  onFocus: (side: SwipeRowSide) => void;
  onBlur: (side: SwipeRowSide) => void;
  onPress: (action: SwipeRowAction, side: SwipeRowSide, primary: boolean, event: ReactMouseEvent) => void;
}) {
  const sign = side === "leading" ? 1 : -1;
  const size = actions.length * ACTION_WIDTH;
  const reveal = useTransform(x, (value) => Math.min(Math.max((sign * value) / size, 0), 1));
  // Buttons sit in reading order, so the primary action is always at the outer edge.
  const ordered = actions.map((action, index) => ({ action, index }));
  if (side === "trailing") ordered.reverse();

  return (
    <motion.div
      data-slot="swipe-row-actions"
      data-side={side}
      className={`absolute inset-y-0 z-2 flex ${side === "leading" ? "left-0" : "right-0"}`}
      // With reduced motion the actions fade in over the edge of the row, tracking the drag.
      style={{ opacity: reducedMotion ? reveal : 1, pointerEvents: interactive ? "auto" : "none" }}
      onFocus={() => onFocus(side)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur(side);
      }}
    >
      {reducedMotion && (
        <span aria-hidden="true" className={`absolute inset-0 ${TONES[actions[0].tone ?? "neutral"]}`} />
      )}
      {ordered.map(({ action, index }) => (
        <SwipeRowActionButton
          key={index}
          action={action}
          side={side}
          depth={actions.length - 1 - index}
          count={actions.length}
          x={x}
          fill={fill}
          reducedMotion={reducedMotion}
          disabled={disabled}
          onClick={(event) => onPress(action, side, index === 0, event)}
        />
      ))}
    </motion.div>
  );
}

function SwipeRowActionButton({
  action,
  side,
  depth,
  count,
  x,
  fill,
  reducedMotion,
  disabled,
  onClick,
}: {
  action: SwipeRowAction;
  side: SwipeRowSide;
  /** 0 is the button next to the content; the primary action is the deepest. */
  depth: number;
  count: number;
  x: MotionValue<number>;
  fill: MotionValue<number>;
  reducedMotion: boolean;
  disabled: boolean;
  onClick: (event: ReactMouseEvent) => void;
}) {
  const sign = side === "leading" ? 1 : -1;
  const primary = depth === count - 1;
  // The buttons share the revealed width evenly, each sliding out from under the next, and keep
  // spreading when the row is pulled past them. A full swipe pulls the primary action up to the
  // content so it covers the rest.
  const slide = useTransform(() => {
    const revealed = Math.max(sign * x.get(), 0);
    const hidden = count * ACTION_WIDTH - revealed;
    const share = depth / count;
    return -sign * (hidden * (1 - share) - (primary ? fill.get() * share * revealed : 0));
  });
  const fade = useTransform(() => (primary ? 1 : 1 - fill.get()));

  return (
    <motion.button
      type="button"
      data-slot="swipe-row-action"
      data-primary={primary || undefined}
      data-tone={action.tone ?? "neutral"}
      disabled={disabled}
      // Each button paints its own colour out to the edge, overlapping itself by a pixel, so no gap
      // or seam opens as the buttons spread.
      className={`relative flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 px-1 text-xs font-medium outline-current transition-[filter] duration-100 ease-out after:absolute after:inset-y-0 after:w-screen after:bg-inherit focus-visible:outline-2 focus-visible:-outline-offset-2 active:brightness-90 disabled:cursor-not-allowed contrast-more:inset-ring contrast-more:inset-ring-current [&_svg]:size-5 ${side === "leading" ? "after:right-[calc(100%-1px)]" : "after:left-[calc(100%-1px)]"} ${TONES[action.tone ?? "neutral"]}`}
      style={{
        width: ACTION_WIDTH,
        zIndex: depth,
        x: reducedMotion ? 0 : slide,
        opacity: reducedMotion ? fade : 1,
      }}
      onClick={onClick}
    >
      {action.icon}
      <span className="max-w-full truncate">{action.label}</span>
    </motion.button>
  );
}
