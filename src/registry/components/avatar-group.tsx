"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";
import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

export type AvatarSize = "sm" | "md" | "lg";

const SIZES = {
  sm: { box: "size-8 text-xs", px: 32, overlap: 10, gap: 4, lift: 3 },
  md: { box: "size-10 text-sm", px: 40, overlap: 12, gap: 4, lift: 4 },
  lg: { box: "size-12 text-base", px: 48, overlap: 16, gap: 6, lift: 5 },
} satisfies Record<AvatarSize, { box: string; px: number; overlap: number; gap: number; lift: number }>;

interface GroupContextValue {
  size: AvatarSize;
  seconds: number;
}

const GroupContext = createContext<GroupContextValue | null>(null);
// Avatars fanned out below the stack show their label underneath, so it never covers the stack.
const LabelBelowContext = createContext(false);

function springFor(seconds: number, bounce = 0.25): Transition {
  return seconds ? { type: "spring", visualDuration: seconds, bounce } : { duration: 0 };
}

function useSeconds(duration: number | undefined, fallback: number) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return 0;
  return typeof duration === "number" && Number.isFinite(duration) ? Math.max(0, duration) : fallback;
}

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

// Every colour in the theme: the five chart steps, the three status colours, ink and the neutral.
// Each pairs with the theme's text for it. danger with on-danger (4.2:1) and other with foreground
// (4.4:1) fall just under 4.5:1 in dark mode; every other pair clears it in both themes.
const TONES = {
  "chart-1": "bg-chart-1 text-chart-5",
  "chart-2": "bg-chart-2 text-black",
  "chart-3": "bg-chart-3 text-white",
  "chart-4": "bg-chart-4 text-white",
  "chart-5": "bg-chart-5 text-white",
  success: "bg-success text-background",
  warning: "bg-warning text-background",
  danger: "bg-danger text-destructive-foreground",
  primary: "bg-primary text-primary-foreground",
  other: "bg-[var(--chart-other)] text-foreground",
} satisfies Record<string, string>;

export type AvatarTone = keyof typeof TONES;

const TONE_NAMES = Object.keys(TONES) as AvatarTone[];

function toneOf(name: string): AvatarTone {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.codePointAt(0)!) % 360;
  return TONE_NAMES[hash % TONE_NAMES.length];
}

export interface AvatarProps {
  /** Person's name. Used as the accessible name, the hover label, and for the initials. */
  name: string;
  /** Optional local image path. Initials show until it loads, and if it fails. */
  src?: string;
  /** Theme colour behind the initials, and behind a transparent image. Derived from `name` by default. */
  tone?: AvatarTone;
  /** Size when used outside an AvatarGroup. Inside a group, the group's size wins. */
  size?: AvatarSize;
  /** Hover label and lift time in seconds when used outside an AvatarGroup. */
  duration?: number;
  className?: string;
}

export function Avatar({ name, src, tone, size, duration, className }: AvatarProps) {
  const group = useContext(GroupContext);
  const ownSeconds = useSeconds(duration, 0.3);
  const seconds = group ? group.seconds : ownSeconds;
  const metrics = SIZES[group?.size ?? size ?? "md"];
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const colors = TONES[tone ?? toneOf(name)] ?? TONES["chart-1"];
  const below = useContext(LabelBelowContext);

  return (
    <motion.span
      data-slot="avatar"
      data-active={active || undefined}
      role="img"
      aria-label={name}
      tabIndex={0}
      className={`focus-visible:ring-ring/30 relative inline-flex shrink-0 rounded-full outline-none focus-visible:ring-3 ${className ?? ""}`}
      style={{ zIndex: active ? 30 : undefined }}
      initial={false}
      animate={{ y: active && seconds ? -metrics.lift : 0 }}
      transition={springFor(seconds * 0.8, 0.4)}
      onPointerEnter={(event) => event.pointerType !== "touch" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <AvatarPrimitive.Root
        aria-hidden="true"
        data-slot="avatar-face"
        className={`${metrics.box} ${colors} ring-background inline-flex items-center justify-center overflow-hidden rounded-full leading-none font-medium ring-2 select-none`}
      >
        {src && <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" />}
        <AvatarPrimitive.Fallback data-slot="avatar-fallback">{initialsOf(name)}</AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      <AnimatePresence>
        {active && (
          <motion.span
            key="label"
            aria-hidden="true"
            data-slot="avatar-label"
            className={`bg-foreground text-background pointer-events-none absolute left-1/2 -translate-x-1/2 ${below ? "top-full mt-2" : "bottom-full mb-2"} rounded-md px-2 py-1 text-xs leading-none font-medium whitespace-nowrap shadow-sm`}
            initial={{ opacity: 0, y: below ? -4 : 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: below ? -2 : 2, scale: 0.95 }}
            transition={
              seconds ? { type: "spring", visualDuration: seconds * 0.6, bounce: 0.2 } : { duration: 0 }
            }
          >
            {name}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

export interface AvatarGroupProps {
  /** Avatar elements, in stacking order. */
  children: ReactNode;
  /** Shows at most this many avatars and collapses the rest into a "+N" chip. */
  max?: number;
  /** @default "md" */
  size?: AvatarSize;
  /** Spring time in seconds for spreading, lifting, and fanning out. Zero makes every change instant. */
  duration?: number;
  /** Whether the hidden avatars are fanned out, when controlled. */
  open?: boolean;
  /** Whether the hidden avatars start fanned out, when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the "+N" chip opens or closes the hidden avatars. */
  onOpenChange?: (open: boolean) => void;
  /** Accessible name for the group, such as "Project members". */
  "aria-label"?: string;
  className?: string;
}

export function AvatarGroup({
  children,
  max,
  size = "md",
  duration,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  "aria-label": ariaLabel,
  className,
}: AvatarGroupProps) {
  const seconds = useSeconds(duration, 0.3);
  const metrics = SIZES[size];
  const items = Children.toArray(children).filter(isValidElement) as ReactElement[];
  const limit = typeof max === "number" && Number.isFinite(max) ? Math.max(1, Math.floor(max)) : items.length;
  const visible = items.slice(0, limit);
  const hidden = items.slice(limit);

  const [openState, setOpenState] = useState(defaultOpen);
  const open = hidden.length > 0 && (openProp ?? openState);
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const expanded = hovered || focusWithin || open;

  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const [origin, setOrigin] = useState(0);
  const trayId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen]);

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape" || !open) return;
    event.stopPropagation();
    setOpen(false);
    chipRef.current?.focus();
  }

  const spread = springFor(seconds);
  // The stack keeps its overlapped layout width and spreads with transforms, so a centered group
  // does not shift under the pointer and nothing around it reflows.
  const layout = (index: number) => (index === 0 ? 0 : -metrics.overlap);
  const offset = (index: number) => (expanded ? index * (metrics.overlap + metrics.gap) : 0);
  const step = metrics.px + metrics.gap;

  return (
    <GroupContext.Provider value={{ size, seconds }}>
      <div
        ref={rootRef}
        role="group"
        aria-label={ariaLabel}
        data-slot="avatar-group"
        data-size={size}
        data-expanded={expanded || undefined}
        className={`relative inline-flex items-center ${className ?? ""}`}
        onPointerEnter={(event) => event.pointerType !== "touch" && setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocusWithin(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      >
        {visible.map((child, index) => (
          <motion.span
            key={child.key ?? index}
            data-slot="avatar-group-item"
            className="inline-flex"
            style={{ marginLeft: layout(index) }}
            initial={false}
            animate={{ x: offset(index) }}
            transition={spread}
          >
            {child}
          </motion.span>
        ))}
        {hidden.length > 0 && (
          <motion.span
            className="inline-flex"
            style={{ marginLeft: layout(visible.length) }}
            initial={false}
            animate={{ x: offset(visible.length) }}
            transition={spread}
          >
            <button
              ref={chipRef}
              type="button"
              data-slot="avatar-group-more"
              aria-label={`Show ${hidden.length} more`}
              aria-expanded={open}
              aria-controls={open ? trayId : undefined}
              className={`${metrics.box} bg-muted text-muted-foreground ring-background hover:text-foreground focus-visible:ring-ring/30 relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full leading-none font-medium tabular-nums ring-2 outline-none focus-visible:ring-3`}
              onClick={() => {
                const chip = chipRef.current?.getBoundingClientRect();
                const root = rootRef.current?.getBoundingClientRect();
                setOrigin(chip && root ? chip.left - root.left : 0);
                setOpen(!open);
              }}
            >
              <CountUp to={hidden.length} seconds={seconds} />
            </button>
          </motion.span>
        )}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="tray"
              id={trayId}
              role="group"
              aria-label={`${hidden.length} more`}
              data-slot="avatar-group-tray"
              className="absolute top-full left-0 z-20 mt-2 flex"
              style={{ gap: metrics.gap }}
              // Variants carry the exit down to each avatar, and the tray unmounts after they fold back.
              initial="folded"
              animate="fanned"
              exit="folded"
              variants={{ folded: { transition: { when: "afterChildren" } }, fanned: {} }}
            >
              {hidden.map((child, index) => (
                <motion.span
                  key={child.key ?? index}
                  data-slot="avatar-group-item"
                  className="inline-flex"
                  custom={index}
                  variants={{
                    folded: (index: number) => ({
                      x: origin - index * step,
                      y: -metrics.px / 2,
                      scale: 0.4,
                      opacity: 0,
                      rotate: -30,
                      transition: springFor(seconds * 0.6, 0),
                    }),
                    fanned: (index: number) => ({
                      x: 0,
                      y: 0,
                      scale: 1,
                      opacity: 1,
                      rotate: 0,
                      transition: seconds
                        ? {
                            type: "spring",
                            visualDuration: seconds,
                            bounce: 0.3,
                            delay: index * Math.min(0.05, seconds * 0.15),
                          }
                        : { duration: 0 },
                    }),
                  }}
                >
                  <LabelBelowContext.Provider value>{child}</LabelBelowContext.Provider>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GroupContext.Provider>
  );
}

function CountUp({ to, seconds }: { to: number; seconds: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const text = useTransform(count, (value) => `+${Math.round(value)}`);
  const [seen, setSeen] = useState(false);

  // Count once the chip first scrolls into view, so groups further down the page still count.
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!seen) return;
    if (!seconds) {
      count.jump(to);
      return;
    }
    const controls = animate(count, to, { duration: Math.max(0.5, seconds * 2.5), ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [count, to, seconds, seen]);

  return (
    <motion.span ref={ref} aria-hidden="true" data-slot="avatar-group-count" data-value={to}>
      {text}
    </motion.span>
  );
}
