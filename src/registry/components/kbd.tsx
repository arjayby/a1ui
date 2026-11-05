"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

export type KbdPlatform = "mac" | "other";

// The base is 24px tall with a 3px edge under the cap. Pressing sinks the cap 2px, leaving 1px of edge.
const TRAVEL = 2;

const ALIASES: Record<string, string> = {
  cmd: "meta",
  command: "meta",
  "⌘": "meta",
  win: "meta",
  windows: "meta",
  super: "meta",
  ctrl: "control",
  "⌃": "control",
  option: "alt",
  opt: "alt",
  "⌥": "alt",
  "⇧": "shift",
  esc: "escape",
  return: "enter",
  "↵": "enter",
  "↩": "enter",
  space: " ",
  spacebar: " ",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  del: "delete",
  caps: "capslock",
};

// [Mac label, other label, Mac spoken name, other spoken name]
const KEYS: Record<string, [string, string, string, string]> = {
  meta: ["⌘", "Win", "Command", "Windows"],
  control: ["⌃", "Ctrl", "Control", "Control"],
  alt: ["⌥", "Alt", "Option", "Alt"],
  shift: ["⇧", "Shift", "Shift", "Shift"],
  enter: ["↩", "Enter", "Return", "Enter"],
  backspace: ["⌫", "Backspace", "Delete", "Backspace"],
  delete: ["⌦", "Del", "Forward Delete", "Delete"],
  escape: ["Esc", "Esc", "Escape", "Escape"],
  tab: ["⇥", "Tab", "Tab", "Tab"],
  capslock: ["⇪", "Caps", "Caps Lock", "Caps Lock"],
  arrowup: ["↑", "↑", "Up Arrow", "Up Arrow"],
  arrowdown: ["↓", "↓", "Down Arrow", "Down Arrow"],
  arrowleft: ["←", "←", "Left Arrow", "Left Arrow"],
  arrowright: ["→", "→", "Right Arrow", "Right Arrow"],
  " ": ["Space", "Space", "Space", "Space"],
};

const MODIFIERS: Record<string, string> = {
  meta: "Meta",
  control: "Control",
  alt: "Alt",
  shift: "Shift",
};

/** Resolves a key name to the lowercase `KeyboardEvent.key` it matches. `mod` is ⌘ on Mac, Ctrl elsewhere. */
function canonicalKey(name: string, platform: KbdPlatform) {
  const lower = name.toLowerCase();
  if (lower === "mod") return platform === "mac" ? "meta" : "control";
  return ALIASES[lower] ?? lower;
}

function describeKey(name: string, platform: KbdPlatform) {
  const key = canonicalKey(name, platform);
  const known = KEYS[key];
  if (known) {
    const mac = platform === "mac";
    return { key, label: mac ? known[0] : known[1], spoken: mac ? known[2] : known[3] };
  }
  const label = key.length === 1 ? key.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1);
  return { key, label, spoken: label };
}

function matchesKey(key: string, event: KeyboardEvent) {
  if (event.key.toLowerCase() === key) return true;
  // Letters and digits also match by physical key, so ⌥K or ⇧1 still press K or 1.
  if (/^[a-z]$/.test(key)) return event.code === `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return event.code === `Digit${key}` || event.code === `Numpad${key}`;
  return false;
}

const subscribe = () => () => {};
function detectPlatform(): KbdPlatform {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const hint = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(hint) ? "mac" : "other";
}

/** The viewer's platform. The server and hydration render "other", then the client updates. */
function useDetectedPlatform() {
  return useSyncExternalStore(subscribe, detectPlatform, () => "other" as const);
}

function KeyLabel({ name, platform }: { name: string; platform: KbdPlatform }) {
  const { label, spoken } = describeKey(name, platform);
  if (label === spoken) return label;
  return (
    <>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{spoken}</span>
    </>
  );
}

interface GroupContextValue {
  platform?: KbdPlatform;
  duration?: number;
  report: (id: string, pressed: boolean) => void;
  remove: (id: string) => void;
}

const GroupContext = createContext<GroupContextValue | null>(null);

function seconds(duration: number | undefined, fallback: number) {
  return duration !== undefined && Number.isFinite(duration) ? Math.max(0, duration) : fallback;
}

export interface KbdProps extends Omit<ComponentPropsWithoutRef<"kbd">, "children"> {
  /** Visible label. Defaults to the platform label for `listen`, such as ⌘ or Ctrl for `mod`. */
  children?: ReactNode;
  /** Key to watch, such as `"k"`, `"Meta"`, `"Shift"`, `"Enter"`, or `"mod"`. The cap presses while it is held. */
  listen?: string;
  /** Pressed state when controlled by the caller. */
  pressed?: boolean;
  /** Called when the watched key or a pointer presses or releases the cap. */
  onPressedChange?: (pressed: boolean) => void;
  /** Label set to use. Detected after mount; the server renders `"other"`. */
  platform?: KbdPlatform;
  /** Release spring time in seconds. The press itself takes about a third of it. */
  duration?: number;
}

export function Kbd({
  children,
  listen,
  pressed,
  onPressedChange,
  platform: platformProp,
  duration,
  className,
  onPointerDown,
  ...props
}: KbdProps) {
  const id = useId();
  const group = useContext(GroupContext);
  const detected = useDetectedPlatform();
  const platform = platformProp ?? group?.platform ?? detected;
  const reducedMotion = useReducedMotion();
  const time = reducedMotion ? 0 : seconds(duration ?? group?.duration, 0.3);
  const [keyHeld, setKeyHeld] = useState(false);
  const [pointerHeld, setPointerHeld] = useState(false);
  const held = keyHeld || pointerHeld;
  const active = pressed ?? held;
  const target = listen ? canonicalKey(listen, platform) : undefined;

  useEffect(() => {
    if (!target) return;
    const modifier = MODIFIERS[target];
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (modifier) {
        // Modifier state rides on every key event, so a release that happened elsewhere still lands.
        setKeyHeld(event.getModifierState(modifier));
        return;
      }
      if (matchesKey(target, event)) setKeyHeld(event.type === "keydown");
      // macOS sends no keyup for keys released while ⌘ is held, so letting go of ⌘ releases them.
      else if (event.type === "keyup" && event.key === "Meta") setKeyHeld(false);
    };
    const release = () => setKeyHeld(false);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") release();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVisibility);
      setKeyHeld(false);
    };
  }, [target]);

  useEffect(() => {
    if (!pointerHeld) return;
    const release = () => setPointerHeld(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [pointerHeld]);

  const onPressedChangeRef = useRef(onPressedChange);
  useEffect(() => {
    onPressedChangeRef.current = onPressedChange;
  });
  const lastHeld = useRef(held);
  useEffect(() => {
    if (lastHeld.current === held) return;
    lastHeld.current = held;
    onPressedChangeRef.current?.(held);
  }, [held]);

  const report = group?.report;
  const remove = group?.remove;
  useEffect(() => {
    report?.(id, active);
  }, [report, id, active]);
  useEffect(() => () => remove?.(id), [remove, id]);

  const transition =
    time === 0
      ? { duration: 0 }
      : active
        ? ({ type: "spring", visualDuration: time / 3, bounce: 0 } as const)
        : ({ type: "spring", visualDuration: time, bounce: 0.5 } as const);

  return (
    <kbd
      data-slot="kbd"
      data-pressed={active || undefined}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || (event.pointerType === "mouse" && event.button !== 0)) return;
        setPointerHeld(true);
      }}
      className={`bg-border relative inline-flex h-6 min-w-6 shrink-0 rounded-md pb-[3px] align-middle font-sans text-xs font-medium select-none ${className ?? ""}`}
      {...props}
    >
      <motion.span
        data-slot="kbd-cap"
        initial={false}
        animate={{ y: active ? TRAVEL : 0 }}
        transition={transition}
        className={`border-border text-muted-foreground flex h-full w-full items-center justify-center gap-0.5 rounded-[5px] border px-1.5 leading-none transition-colors duration-150 ${active ? "bg-muted text-foreground" : "bg-background"}`}
      >
        {children ?? (listen ? <KeyLabel name={listen} platform={platform} /> : null)}
      </motion.span>
    </kbd>
  );
}

export interface KbdGroupProps extends Omit<ComponentPropsWithoutRef<"kbd">, "children"> {
  /** Keys in the combo, such as `["mod", "k"]`. Rendered with platform labels. */
  keys?: string[];
  /** Presses each key in `keys` while it is held on the keyboard. */
  listen?: boolean;
  /** Custom contents, usually `Kbd` elements. Used instead of `keys`. */
  children?: ReactNode;
  /** Shown between keys from `keys`. Pass `null` for none. */
  separator?: ReactNode;
  /** Label set for every key in the group. */
  platform?: KbdPlatform;
  /** Spring time in seconds for the keys and the success pulse. */
  duration?: number;
  /** Called when every key in the group is held at once. */
  onComplete?: () => void;
}

export function KbdGroup({
  keys,
  listen = false,
  children,
  separator = "+",
  platform,
  duration,
  onComplete,
  className,
  ...props
}: KbdGroupProps) {
  const reducedMotion = useReducedMotion();
  const time = reducedMotion ? 0 : seconds(duration, 0.3);
  const [states, setStates] = useState<Record<string, boolean>>({});
  const report = useCallback((id: string, pressed: boolean) => {
    setStates((current) => (current[id] === pressed ? current : { ...current, [id]: pressed }));
  }, []);
  const remove = useCallback((id: string) => {
    setStates((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const context = useMemo(
    () => ({ platform, duration, report, remove }),
    [platform, duration, report, remove],
  );
  const values = Object.values(states);
  const complete = values.length > 0 && values.every(Boolean);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => {
    if (complete) onCompleteRef.current?.();
  }, [complete]);

  const content =
    children ??
    keys?.map((key, index) => (
      <span key={`${key}-${index}`} className="contents">
        {index > 0 && separator !== null && (
          <span data-slot="kbd-separator" className="text-muted-foreground px-0.5 text-xs">
            {separator}
          </span>
        )}
        <Kbd listen={listen ? key : undefined}>
          {listen ? undefined : <PlatformKeyLabel name={key} platform={platform} />}
        </Kbd>
      </span>
    ));

  return (
    <GroupContext.Provider value={context}>
      <kbd
        data-slot="kbd-group"
        data-complete={complete || undefined}
        className={`relative isolate inline-flex items-center gap-1 align-middle font-sans ${className ?? ""}`}
        {...props}
      >
        <motion.span
          aria-hidden="true"
          data-slot="kbd-group-glow"
          className="bg-muted pointer-events-none absolute -inset-1 -z-10 rounded-lg"
          initial={false}
          animate={
            complete ? { opacity: 1, scale: time === 0 ? 1 : [0.92, 1.06, 1] } : { opacity: 0, scale: 1 }
          }
          transition={time === 0 ? { duration: 0 } : { duration: time * 1.5, ease: "easeOut" }}
        />
        <motion.span
          data-slot="kbd-group-keys"
          className="inline-flex items-center gap-1"
          initial={false}
          animate={{ scale: complete && time > 0 ? [1, 1.06, 1] : 1 }}
          transition={time === 0 ? { duration: 0 } : { duration: time * 1.5, ease: "easeOut" }}
        >
          {content}
        </motion.span>
      </kbd>
    </GroupContext.Provider>
  );
}

function PlatformKeyLabel({ name, platform }: { name: string; platform?: KbdPlatform }) {
  const detected = useDetectedPlatform();
  return <KeyLabel name={name} platform={platform ?? detected} />;
}
