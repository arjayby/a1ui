"use client";

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

/** The arc, in radians, that the visible rows wrap around. */
const ARC = (110 * Math.PI) / 180;
/** Quiet time after the last scroll event before a native scroll counts as finished. */
const REST_DELAY = 150;
/** Mouse travel before a press becomes a drag, so a click still selects. */
const DRAG_SLOP = 4;
const TYPEAHEAD_RESET = 500;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Apple's rubber band: the further past the end, the less the wheel follows. */
function rubberBand(overshoot: number, dimension: number) {
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
}

/** Where scroll deceleration would carry a release at this velocity (px/s). */
function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Places one row on the drum. `distance` is how many rows it sits from the centre, so the whole
 * effect is a pure function of scroll position: nothing here runs on a clock.
 */
function drumStyle(distance: number, itemHeight: number, visibleCount: number) {
  const step = ARC / visibleCount;
  const angle = clamp(distance * step, -Math.PI / 2, Math.PI / 2);
  const radius = itemHeight / (2 * Math.tan(step / 2));
  // Native scrolling moves rows in a straight line; this pulls each one onto the cylinder.
  const shift = radius * Math.sin(angle) - distance * itemHeight;
  const depth = radius * (Math.cos(angle) - 1);
  return {
    transform:
      Math.abs(distance) < 0.001
        ? "none"
        : `translateY(${shift.toFixed(2)}px) perspective(${Math.round(radius * 4)}px) translateZ(${depth.toFixed(2)}px) rotateX(${((-angle * 180) / Math.PI).toFixed(2)}deg)`,
    opacity: (1 / (1 + 0.55 * distance * distance)).toFixed(3),
  };
}

interface WheelState {
  count: number;
  itemHeight: number;
  visibleCount: number;
  /** Index of the option the value points at. */
  selected: number;
  disabled: boolean;
  isDisabled: (index: number) => boolean;
  /** Reports a user change. Renders synchronously, so `selected` is current when it returns. */
  emit: (index: number) => void;
}

/**
 * The imperative half of the wheel. Touch, trackpad and mouse-wheel scrolling stay native, with
 * CSS scroll snap doing the momentum and the snapping. This adds what native scrolling lacks:
 * the drum, the value that follows the centre, mouse dragging, and a spring for moves that start
 * in code. Scroll snap is switched off while the spring or a drag owns the position, and back on
 * only once the wheel rests on a row, so the browser never has a reason to jump.
 */
function createWheel(scroller: HTMLElement, list: HTMLElement, read: () => WheelState) {
  let placed = false;
  let rowHeight = 0;
  /** The option last reported, or last accepted from props. */
  let emitted = -1;
  /** A person is scrolling: the value follows the centre and outside changes wait. */
  let user = false;
  let touching = false;
  /** Distance the list is drawn past either end while rubber-banding. */
  let extra = 0;
  /** The scroll offset this code last wrote, to tell its own scroll events from a person's. */
  let expected = NaN;
  let restTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressClick = false;
  let drag: {
    id: number;
    y: number;
    from: number;
    moved: boolean;
    trail: { time: number; position: number }[];
  } | null = null;
  let spring: {
    position: number;
    velocity: number;
    target: number;
    omega: number;
    live: boolean;
    time: number;
    frame: number;
  } | null = null;

  const reducedMotion = () =>
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const position = () => scroller.scrollTop + extra;
  const setSnap = (on: boolean) => {
    scroller.style.scrollSnapType = on ? "" : "none";
  };

  function paint(at: number) {
    const { count, itemHeight, visibleCount } = read();
    const centre = at / itemHeight;
    const reach = (visibleCount + 1) / 2;
    const first = Math.max(0, Math.floor(centre - reach));
    const last = Math.min(count - 1, Math.ceil(centre + reach));
    for (let index = first; index <= last; index += 1) {
      const label = list.children[index]?.firstElementChild;
      if (!(label instanceof HTMLElement)) continue;
      const style = drumStyle(index - centre, itemHeight, visibleCount);
      label.style.transform = style.transform;
      label.style.opacity = style.opacity;
    }
  }

  /** The enabled option closest to a fractional row, or -1 when every option is disabled. */
  function nearest(row: number) {
    const { count, isDisabled } = read();
    let best = -1;
    for (let index = 0; index < count; index += 1) {
      if (isDisabled(index)) continue;
      if (best < 0 || Math.abs(index - row) < Math.abs(best - row)) best = index;
    }
    return best;
  }

  /** Reports the option under the centre the moment it gets there. Disabled ones are passed over. */
  function cross(at: number) {
    const { count, itemHeight, isDisabled, emit } = read();
    const centre = clamp(Math.round(at / itemHeight), 0, count - 1);
    if (centre === emitted || isDisabled(centre)) return;
    emitted = centre;
    emit(centre);
  }

  function setPosition(at: number, live: boolean) {
    const { count, itemHeight } = read();
    const top = clamp(at, 0, Math.max(0, (count - 1) * itemHeight));
    scroller.scrollTop = top;
    expected = scroller.scrollTop;
    extra = at - top;
    list.style.transform = Math.abs(extra) > 0.01 ? `translateY(${(-extra).toFixed(2)}px)` : "";
    paint(at);
    if (live) cross(at);
  }

  function stopSpring() {
    if (!spring) return false;
    cancelAnimationFrame(spring.frame);
    spring = null;
    return true;
  }

  function frame(now: number) {
    const current = spring;
    if (!current) return;
    let remaining = clamp((now - current.time) / 1000, 0, 0.064);
    current.time = now;
    // Critically damped, so the wheel settles without wobbling.
    while (remaining > 0) {
      const dt = Math.min(remaining, 0.004);
      const acceleration =
        -current.omega * current.omega * (current.position - current.target) -
        2 * current.omega * current.velocity;
      current.velocity += acceleration * dt;
      current.position += current.velocity * dt;
      remaining -= dt;
    }
    if (Math.abs(current.position - current.target) < 0.5 && Math.abs(current.velocity) < 10) {
      spring = null;
      setPosition(current.target, current.live);
      rest(current.live);
      return;
    }
    setPosition(current.position, current.live);
    if (spring === current) current.frame = requestAnimationFrame(frame);
  }

  /** The wheel has arrived on a row: hand snapping back to the browser and reconcile with props. */
  function rest(wasLive: boolean) {
    setSnap(true);
    if (wasLive) user = false;
    sync();
  }

  /**
   * Springs to a row from wherever the wheel is now, at whatever speed it is moving, so a new
   * target mid-flight bends the motion instead of restarting it. `live` keeps the value following
   * the centre on the way, as it does after a drag is thrown.
   */
  function glide(index: number, live: boolean, velocity?: number) {
    const target = index * read().itemHeight;
    const from = spring ? spring.position : position();
    if (!spring && velocity === undefined && Math.abs(from - target) < 0.5) {
      if (extra) setPosition(target, false);
      setSnap(true);
      return;
    }
    if (reducedMotion()) {
      stopSpring();
      setPosition(target, live);
      setSnap(true);
      if (live) user = false;
      return;
    }
    if (spring && spring.target === target && spring.live === live && velocity === undefined) return;
    setSnap(false);
    // Longer trips get a slower spring, so rows never strobe past.
    const response = clamp(0.35 + Math.abs(target - from) / 2500, 0.35, 0.9);
    const omega = (2 * Math.PI) / response;
    if (spring) {
      spring.target = target;
      spring.live = live;
      spring.omega = omega;
      if (velocity !== undefined) spring.velocity = velocity;
      return;
    }
    spring = {
      position: from,
      velocity: velocity ?? 0,
      target,
      omega,
      live,
      time: performance.now(),
      frame: requestAnimationFrame(frame),
    };
  }

  /** Brings the wheel to the value in props, unless a person is scrolling it right now. */
  function sync() {
    const { selected, itemHeight, count } = read();
    if (selected < 0 || selected >= count) return;
    if (!placed || itemHeight !== rowHeight) {
      placed = true;
      rowHeight = itemHeight;
      emitted = selected;
      stopSpring();
      setPosition(selected * itemHeight, false);
      setSnap(true);
      return;
    }
    paint(spring ? spring.position : position());
    if (user || touching || drag?.moved) return;
    emitted = selected;
    glide(selected, false);
  }

  /** A deliberate choice: a click, a key, typeahead. The value changes now and the wheel follows. */
  function select(index: number) {
    const state = read();
    if (state.disabled || index < 0 || index >= state.count || state.isDisabled(index)) return;
    clearTimeout(restTimer);
    user = false;
    if (index !== emitted) {
      emitted = index;
      state.emit(index);
    }
    // A controlled parent may have kept its own value; the wheel goes where the value is.
    sync();
  }

  function scheduleRest() {
    clearTimeout(restTimer);
    restTimer = setTimeout(settle, REST_DELAY);
  }

  /** A native scroll has stopped: make sure it stopped on an enabled row and that props agree. */
  function settle() {
    if (touching || drag?.moved || spring) return;
    if (!user) {
      sync();
      return;
    }
    user = false;
    const landed = nearest(position() / read().itemHeight);
    if (landed >= 0 && landed !== emitted) {
      emitted = landed;
      read().emit(landed);
    }
    sync();
  }

  function onScroll() {
    if (spring || drag?.moved) return;
    const top = scroller.scrollTop;
    if (Math.abs(top - expected) >= 0.5) {
      expected = NaN;
      user = true;
    }
    paint(top + extra);
    if (!user) return;
    cross(top + extra);
    scheduleRest();
  }

  /** Any touch or wheel input takes the wheel back from a spring at once. */
  function onWheel() {
    if (read().disabled) return;
    stopSpring();
    user = true;
    scheduleRest();
  }

  function onTouchStart() {
    if (read().disabled) return;
    touching = true;
    clearTimeout(restTimer);
    if (stopSpring()) user = true;
  }

  function onTouchEnd(event: TouchEvent) {
    if (event.touches.length > 0) return;
    touching = false;
    scheduleRest();
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType !== "mouse" || event.button !== 0 || read().disabled) return;
    // Pressing a moving wheel catches it where it is.
    if (stopSpring()) user = true;
    drag = { id: event.pointerId, y: event.clientY, from: position(), moved: false, trail: [] };
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.abs(event.clientY - drag.y) < DRAG_SLOP) return;
      // Re-anchor on the point the drag started, so the wheel does not jump by the slop.
      drag.moved = true;
      drag.y = event.clientY;
      drag.from = position();
      user = true;
      clearTimeout(restTimer);
      setSnap(false);
      scroller.setPointerCapture?.(event.pointerId);
      scroller.dataset.dragging = "";
    }
    const { count, itemHeight, visibleCount } = read();
    const wanted = drag.from - (event.clientY - drag.y);
    const inside = clamp(wanted, 0, Math.max(0, (count - 1) * itemHeight));
    const at = inside + rubberBand(wanted - inside, itemHeight * visibleCount);
    drag.trail.push({ time: event.timeStamp, position: at });
    while (drag.trail.length > 2 && event.timeStamp - drag.trail[0].time > 100) drag.trail.shift();
    setPosition(at, true);
  }

  function onPointerUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const { moved, trail } = drag;
    drag = null;
    if (!moved) {
      scheduleRest();
      return;
    }
    delete scroller.dataset.dragging;
    if (scroller.hasPointerCapture?.(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    });
    const { count, itemHeight } = read();
    const first = trail[0];
    const last = trail[trail.length - 1];
    // A pause before letting go is a placement, not a throw.
    const thrown = last && first && last.time > first.time && event.timeStamp - last.time < 80;
    const velocity = thrown ? ((last.position - first.position) / (last.time - first.time)) * 1000 : 0;
    const landing = clamp(position() + project(velocity), 0, Math.max(0, (count - 1) * itemHeight));
    const target = nearest(landing / itemHeight);
    if (target < 0) {
      user = false;
      setPosition(clamp(position(), 0, Math.max(0, (count - 1) * itemHeight)), false);
      setSnap(true);
      return;
    }
    // The spring picks up at the pointer's speed and comes to rest where the throw was heading.
    glide(target, true, velocity);
    if (!spring) sync();
  }

  function onClick(event: MouseEvent) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const option = event.target instanceof Element ? event.target.closest("[data-index]") : null;
    if (!(option instanceof HTMLElement) || option.parentElement !== list) return;
    select(Number(option.dataset.index));
  }

  scroller.addEventListener("scroll", onScroll, { passive: true });
  scroller.addEventListener("wheel", onWheel, { passive: true });
  scroller.addEventListener("touchstart", onTouchStart, { passive: true });
  scroller.addEventListener("touchend", onTouchEnd);
  scroller.addEventListener("touchcancel", onTouchEnd);
  scroller.addEventListener("pointerdown", onPointerDown);
  scroller.addEventListener("pointermove", onPointerMove);
  scroller.addEventListener("pointerup", onPointerUp);
  scroller.addEventListener("pointercancel", onPointerUp);
  scroller.addEventListener("click", onClick);

  return {
    sync,
    select,
    /** The option the wheel currently reports, ahead of the next render. */
    current: () => emitted,
    destroy() {
      stopSpring();
      clearTimeout(restTimer);
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", onPointerUp);
      scroller.removeEventListener("pointercancel", onPointerUp);
      scroller.removeEventListener("click", onClick);
    },
  };
}

// The server cannot scroll, so until hydration the list is shifted with a transform instead. This
// reports false for the server render and the first client render, then true.
const subscribeNever = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

const GroupContext = createContext<{ itemHeight: number; visibleCount: number } | null>(null);

const oddRows = (count: number) => Math.max(3, Math.round(count) | 1);
const wholePixels = (height: number) => Math.max(1, Math.round(height));

export interface WheelPickerOption<T extends string = string> {
  value: T;
  /** What the row shows. Defaults to `value`. */
  label?: ReactNode;
  /** Text for typeahead when `label` is not a string. */
  textValue?: string;
  disabled?: boolean;
}

export interface WheelPickerProps<T extends string = string> {
  /** Accessible name of the wheel, such as "Hour". */
  label: string;
  options: readonly WheelPickerOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  /** Field name for native form submission. */
  name?: string;
  disabled?: boolean;
  /** One short vibration per option on devices that support it. */
  haptics?: boolean;
  /** Rows on show. Odd, at least 3. */
  visibleCount?: number;
  /** Row height in whole pixels. */
  itemHeight?: number;
  className?: string;
}

export function WheelPicker<T extends string = string>({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled = false,
  haptics = true,
  visibleCount: visibleCountProp,
  itemHeight: itemHeightProp,
  className,
}: WheelPickerProps<T>) {
  const group = useContext(GroupContext);
  const itemHeight = wholePixels(itemHeightProp ?? group?.itemHeight ?? 36);
  const visibleCount = oddRows(visibleCountProp ?? group?.visibleCount ?? 5);
  const id = useId();
  const hydrated = useHydrated();
  const [internalValue, setInternalValue] = useState(
    () => defaultValue ?? options.find((option) => !option.disabled)?.value,
  );
  const currentValue = value ?? internalValue;
  const found = options.findIndex((option) => option.value === currentValue);
  // A value that is not among the options leaves the wheel on its first enabled row.
  const selected =
    found >= 0
      ? found
      : Math.max(
          0,
          options.findIndex((option) => !option.disabled),
        );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<ReturnType<typeof createWheel> | null>(null);
  const typeahead = useRef({ text: "", time: 0 });
  const state = useRef<WheelState | null>(null);

  useLayoutEffect(() => {
    state.current = {
      count: options.length,
      itemHeight,
      visibleCount,
      selected,
      disabled,
      isDisabled: (index) => options[index]?.disabled === true,
      emit: (index) => {
        const option = options[index];
        if (!option) return;
        // The tick lands on the frame the option crosses the centre, with the value.
        if (haptics && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(8);
        flushSync(() => {
          if (value === undefined) setInternalValue(option.value);
          onValueChange?.(option.value);
        });
      },
    };
  });

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const list = listRef.current;
    if (!scroller || !list) return;
    const wheel = createWheel(scroller, list, () => state.current!);
    wheelRef.current = wheel;
    return () => {
      wheel.destroy();
      wheelRef.current = null;
    };
  }, []);

  // Runs after every render: it is a no-op unless the value, the options or the row size moved.
  useLayoutEffect(() => {
    if (hydrated) wheelRef.current?.sync();
  });

  const textOf = (option: WheelPickerOption<T>) =>
    (option.textValue ?? (typeof option.label === "string" ? option.label : option.value)).toLowerCase();

  /** The first enabled option at or after `from`, walking in `direction`. */
  const enabledFrom = (from: number, direction: 1 | -1) => {
    for (let index = from; index >= 0 && index < options.length; index += direction) {
      if (!options[index].disabled) return index;
    }
    return -1;
  };

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const wheel = wheelRef.current;
    if (disabled || !wheel || event.defaultPrevented) return;
    const current = wheel.current() >= 0 ? wheel.current() : selected;
    let next = -1;
    switch (event.key) {
      case "ArrowDown":
        next = enabledFrom(current + 1, 1);
        break;
      case "ArrowUp":
        next = enabledFrom(current - 1, -1);
        break;
      case "Home":
        next = enabledFrom(0, 1);
        break;
      case "End":
        next = enabledFrom(options.length - 1, -1);
        break;
      case "PageDown": {
        const page = Math.min(options.length - 1, current + visibleCount);
        next = enabledFrom(page, 1);
        if (next < 0) next = enabledFrom(page, -1);
        if (next <= current) next = -1;
        break;
      }
      case "PageUp": {
        const page = Math.max(0, current - visibleCount);
        next = enabledFrom(page, -1);
        if (next < 0) next = enabledFrom(page, 1);
        if (next >= current) next = -1;
        break;
      }
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        const now = Date.now();
        const pending = now - typeahead.current.time < TYPEAHEAD_RESET ? typeahead.current.text : "";
        // Space scrolls a focused list; here it only ever extends a search.
        if (event.key === " " && !pending) break;
        const text = pending + event.key.toLowerCase();
        typeahead.current = { text, time: now };
        // Repeating one letter steps through the options that start with it.
        const repeated = [...text].every((character) => character === text[0]);
        const query = repeated ? text[0] : text;
        const start = repeated ? current + 1 : current;
        for (let offset = 0; offset < options.length; offset += 1) {
          const index = (start + offset) % options.length;
          if (!options[index].disabled && textOf(options[index]).startsWith(query)) {
            next = index;
            break;
          }
        }
      }
    }
    event.preventDefault();
    if (next >= 0) wheel.select(next);
  }

  const optionId = (index: number) => `${id}-option-${index}`;
  const reach = (visibleCount + 1) / 2;

  return (
    <div
      data-slot="wheel-picker"
      data-disabled={disabled || undefined}
      className={`group/wheel text-foreground relative min-w-12 text-base tabular-nums data-disabled:pointer-events-none data-disabled:opacity-50 ${className ?? ""}`}
      style={{ height: itemHeight * visibleCount, "--wheel-picker-item": `${itemHeight}px` } as CSSProperties}
    >
      {/* The band marks the centre row and carries the focus ring, which the fade masks would clip. */}
      <div
        aria-hidden="true"
        data-slot="wheel-picker-band"
        className={`outline-ring contrast-more:border-foreground pointer-events-none absolute inset-x-0 top-1/2 h-(--wheel-picker-item) -translate-y-1/2 rounded-md group-has-[:focus-visible]/wheel:outline-2 contrast-more:border ${group ? "" : "bg-muted"}`}
      />
      <div
        ref={scrollerRef}
        role="listbox"
        aria-label={label}
        aria-orientation="vertical"
        aria-disabled={disabled || undefined}
        aria-activedescendant={found >= 0 ? optionId(found) : undefined}
        tabIndex={disabled ? -1 : 0}
        data-slot="wheel-picker-viewport"
        onKeyDown={onKeyDown}
        className="relative h-full cursor-grab touch-pan-y snap-y snap-mandatory [scrollbar-width:none] overflow-x-hidden overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_24%,black_76%,transparent)] outline-none select-none data-dragging:cursor-grabbing contrast-more:[mask-image:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref={listRef}
          data-slot="wheel-picker-list"
          style={{
            paddingBlock: ((visibleCount - 1) / 2) * itemHeight,
            transform: hydrated || selected === 0 ? undefined : `translateY(${-selected * itemHeight}px)`,
          }}
        >
          {options.map((option, index) => {
            const isSelected = index === found;
            const distance = index - selected;
            return (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                data-index={index}
                data-slot="wheel-picker-option"
                data-selected={isSelected || undefined}
                data-disabled={option.disabled || undefined}
                // A disabled row is no place to rest, unless the value was set to it from outside.
                className={`group/option flex h-(--wheel-picker-item) items-center justify-center px-3 ${option.disabled && !isSelected ? "snap-align-none" : "snap-center"}`}
              >
                <span
                  className="block whitespace-nowrap group-data-disabled/option:line-through motion-reduce:transform-none! contrast-more:opacity-100!"
                  style={
                    hydrated || Math.abs(distance) > reach
                      ? undefined
                      : drumStyle(distance, itemHeight, visibleCount)
                  }
                >
                  {option.label ?? option.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {name !== undefined && (
        <input type="hidden" name={name} value={currentValue ?? ""} disabled={disabled} />
      )}
    </div>
  );
}

export interface WheelPickerGroupProps {
  /** Accessible name of the whole picker, such as "Time". */
  label: string;
  /** Row height shared by the wheels inside. */
  itemHeight?: number;
  /** Rows on show in the wheels inside. */
  visibleCount?: number;
  className?: string;
  children: ReactNode;
}

/** Sets wheels side by side under one selection band, for times, dates and durations. */
export function WheelPickerGroup({
  label,
  itemHeight = 36,
  visibleCount = 5,
  className,
  children,
}: WheelPickerGroupProps) {
  const rowHeight = wholePixels(itemHeight);
  const rows = oddRows(visibleCount);

  /** Left and right move between the wheels, as up and down move within one. */
  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const wheels = [
      ...event.currentTarget.querySelectorAll<HTMLElement>('[role="listbox"]:not([aria-disabled="true"])'),
    ];
    const from = wheels.indexOf(event.target as HTMLElement);
    if (from < 0) return;
    const forward =
      (event.key === "ArrowRight") !== (getComputedStyle(event.currentTarget).direction === "rtl");
    const to = wheels[from + (forward ? 1 : -1)];
    if (!to) return;
    event.preventDefault();
    to.focus();
  }

  return (
    <GroupContext value={{ itemHeight: rowHeight, visibleCount: rows }}>
      <div
        role="group"
        aria-label={label}
        data-slot="wheel-picker-group"
        onKeyDown={onKeyDown}
        className={`relative inline-flex items-stretch ${className ?? ""}`}
      >
        <div
          aria-hidden="true"
          data-slot="wheel-picker-group-band"
          className="bg-muted contrast-more:border-foreground pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-md contrast-more:border"
          style={{ height: rowHeight }}
        />
        {children}
      </div>
    </GroupContext>
  );
}
