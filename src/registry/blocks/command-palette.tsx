"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";

export interface CommandPaletteItem {
  /** Stable and unique among its siblings. Rows keep their identity through it while results reorder. */
  id: string;
  label: string;
  description?: string;
  /** Extra search terms that match without being shown. */
  keywords?: string[];
  icon?: ReactNode;
  /** Keys shown as a hint, such as `["⌘", "N"]`. The palette does not bind them. */
  shortcut?: string[];
  /** Heading the item is listed under. Items without one come first. */
  group?: string;
  disabled?: boolean;
  /** Opens a nested page of items instead of running. */
  children?: CommandPaletteItem[];
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  items: CommandPaletteItem[];
  /** Called with the item that ran, after the item's own `onSelect`. */
  onSelect?: (item: CommandPaletteItem) => void;
  /** Whether the palette is open when controlled by the caller. */
  open?: boolean;
  /** Whether the palette starts open when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Key that toggles the palette together with ⌘ or Ctrl. `false` turns the shortcut off. */
  shortcut?: string | false;
  /** Render the built-in trigger button. Turn it off to open the palette from your own control. */
  trigger?: boolean;
  placeholder?: string;
  /** Shown when nothing matches. Defaults to a line that quotes the query. */
  emptyMessage?: ReactNode;
  /** Accessible name of the dialog and its list. */
  label?: string;
  /** Classes for the trigger button. */
  className?: string;
  /** Trigger content. Defaults to a search label with the shortcut hint. */
  children?: ReactNode;
}

export interface CommandMatch {
  /** Higher is a better match. */
  score: number;
  /** Positions in the text of the matched characters, in order. */
  indices: number[];
}

const NO_MATCH = Number.NEGATIVE_INFINITY;
const GAP_OUTER = -0.005;
const GAP_INNER = -0.01;
const RUN = 1;

/** How much a match at each position is worth: word starts and camelCase humps beat mid-word letters. */
function positionBonus(text: string, index: number) {
  if (index === 0) return 0.9;
  const before = text[index - 1];
  if (/[\s\-_/.:]/.test(before)) return 0.8;
  const here = text[index];
  if (before === before.toLowerCase() && here !== here.toLowerCase()) return 0.7;
  return 0;
}

/**
 * Matches the query's characters in order anywhere in the text, and picks the alignment that favors
 * word starts and unbroken runs. Returns `null` when a character is missing.
 */
export function matchCommand(query: string, text: string): CommandMatch | null {
  const needle = query.toLowerCase().replace(/\s+/g, "");
  if (!needle) return { score: 0, indices: [] };
  const lowered = text.toLowerCase();
  // A few characters change length when lowercased, which would shift the indices.
  const hay = lowered.length === text.length ? lowered : text;
  const rows = needle.length;
  const columns = hay.length;
  if (rows > columns) return null;

  // ending[i][j]: best score with needle[i] matched exactly at hay[j].
  // within[i][j]: best score for needle[0..i] matched anywhere in hay[0..j].
  const ending: number[][] = [];
  const within: number[][] = [];
  for (let i = 0; i < rows; i++) {
    const endingRow = new Array<number>(columns).fill(NO_MATCH);
    const withinRow = new Array<number>(columns).fill(NO_MATCH);
    const gap = i === rows - 1 ? GAP_OUTER : GAP_INNER;
    let best = NO_MATCH;
    for (let j = 0; j < columns; j++) {
      if (needle[i] === hay[j]) {
        let score = NO_MATCH;
        if (i === 0) score = j * GAP_OUTER + positionBonus(text, j);
        else if (j > 0) {
          score = Math.max(within[i - 1][j - 1] + positionBonus(text, j), ending[i - 1][j - 1] + RUN);
        }
        endingRow[j] = score;
        best = Math.max(score, best + gap);
      } else {
        best += gap;
      }
      withinRow[j] = best;
    }
    ending.push(endingRow);
    within.push(withinRow);
  }

  const score = within[rows - 1][columns - 1];
  if (score === NO_MATCH) return null;

  // Walk back from the end to recover which characters the best alignment used.
  const indices = new Array<number>(rows);
  let inRun = false;
  for (let i = rows - 1, j = columns - 1; i >= 0; i--) {
    for (; j >= 0; j--) {
      if (ending[i][j] !== NO_MATCH && (inRun || ending[i][j] === within[i][j])) {
        inRun = i > 0 && j > 0 && within[i][j] === ending[i - 1][j - 1] + RUN;
        indices[i] = j--;
        break;
      }
    }
  }
  return { score, indices };
}

type Row = { item: CommandPaletteItem; domId: string; indices: number[]; score: number; order: number };
type Section = { key: string; heading?: string; rows: Row[]; best: number; order: number };

/** Filters and ranks one page of items, keeping them under their headings. */
function buildSections(items: CommandPaletteItem[], query: string, idPrefix: string) {
  const searching = query.trim() !== "";
  const sections = new Map<string, Section>();
  items.forEach((item, order) => {
    let match: CommandMatch | null = { score: 0, indices: [] };
    if (searching) {
      match = matchCommand(query, item.label);
      for (const keyword of item.keywords ?? []) {
        // A keyword hit ranks slightly below the same hit in the label, and marks nothing.
        const hit = matchCommand(query, keyword);
        if (hit && (!match || hit.score * 0.9 > match.score)) {
          match = { score: hit.score * 0.9, indices: match?.indices ?? [] };
        }
      }
    }
    if (!match) return;
    const key = item.group ?? "";
    let section = sections.get(key);
    if (!section) {
      section = { key, heading: item.group, rows: [], best: NO_MATCH, order };
      sections.set(key, section);
    }
    section.rows.push({ item, domId: `${idPrefix}-${order}`, order, ...match });
    section.best = Math.max(section.best, match.score);
  });

  const ordered = [...sections.values()];
  if (searching) {
    for (const section of ordered) section.rows.sort((a, b) => b.score - a.score || a.order - b.order);
    ordered.sort((a, b) => b.best - a.best || a.order - b.order);
  } else {
    ordered.sort((a, b) => Number(a.key !== "") - Number(b.key !== "") || a.order - b.order);
  }
  return ordered;
}

/** The label with each run of matched characters wrapped in a `mark`. */
function Marked({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (let i = 0; i < indices.length;) {
    let end = i;
    while (indices[end + 1] === indices[end] + 1) end++;
    if (indices[i] > cursor) parts.push(text.slice(cursor, indices[i]));
    parts.push(
      <mark
        key={indices[i]}
        className="text-foreground bg-transparent font-semibold contrast-more:underline contrast-more:underline-offset-2"
      >
        {text.slice(indices[i], indices[end] + 1)}
      </mark>,
    );
    cursor = indices[end] + 1;
    i = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

const noopSubscribe = () => () => {};

/** Apple keyboards label the modifier ⌘, the rest Ctrl. Assumes ⌘ until the browser can say. */
function useAppleKeyboard() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent),
    () => true,
  );
}

const keyClass =
  "border-border bg-background/60 text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border px-1 font-sans text-[0.6875rem] leading-none font-medium";

// A translucent material over the scrim. It turns solid when the system asks for less transparency
// or more contrast, and takes a full-strength border for the latter.
const surfaceClass =
  "bg-popover/75 text-popover-foreground border-border backdrop-blur-2xl backdrop-saturate-150 [@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none contrast-more:bg-popover contrast-more:border-foreground contrast-more:backdrop-filter-none";

// The trigger wears the Input component's field styling, so it reads as a search box.
const triggerClass =
  "ui-input text-muted-foreground hover:text-foreground inline-flex w-auto min-w-56 cursor-pointer items-center gap-2 pr-1.5 text-left select-none";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className={className}
    >
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.25 10.25 13.5 13.5" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}

export function CommandPalette({
  items,
  onSelect,
  open,
  defaultOpen = false,
  onOpenChange,
  shortcut = "k",
  trigger = true,
  placeholder = "Search commands…",
  emptyMessage,
  label = "Command palette",
  className,
  children,
}: CommandPaletteProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const apple = useAppleKeyboard();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const current = open ?? internalOpen;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // The element that had focus when the palette opened. Focus returns to it on close.
  const [opener, setOpener] = useState<HTMLElement | null>(null);

  // Keep the popup rendered after closing until its exit animation reports that it finished.
  const [present, setPresent] = useState(current);
  if (current && !present) {
    setPresent(true);
    const focused = document.activeElement;
    setOpener(focused instanceof HTMLElement && focused !== document.body ? focused : null);
  }

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const key = shortcut ? shortcut.toLowerCase() : null;
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== key || !(event.metaKey || event.ctrlKey)) return;
    if (event.altKey || event.shiftKey || event.repeat || event.isComposing) return;
    event.preventDefault();
    setOpen(!current);
  });
  useEffect(() => {
    if (!key) return;
    const listener = (event: KeyboardEvent) => onShortcut(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [key]);

  const hint = key ? [apple ? "⌘" : "Ctrl", key.toUpperCase()] : null;

  return (
    <DialogPrimitive.Root open={current} onOpenChange={setOpen}>
      {trigger && (
        <DialogPrimitive.Trigger
          ref={triggerRef}
          data-slot="command-palette-trigger"
          aria-keyshortcuts={key ? `Meta+${key.toUpperCase()} Control+${key.toUpperCase()}` : undefined}
          className={`${triggerClass} ${className ?? ""}`}
        >
          {children ?? (
            <>
              <SearchIcon className="size-4 shrink-0" />
              <span className="flex-1 text-left">Search</span>
              {hint && (
                <span aria-hidden="true" className="flex items-center gap-1.5">
                  {hint.map((keyLabel) => (
                    <kbd key={keyLabel} className={keyClass}>
                      {keyLabel}
                    </kbd>
                  ))}
                </span>
              )}
            </>
          )}
        </DialogPrimitive.Trigger>
      )}
      {(present || current) && (
        <PaletteLayer
          open={current}
          reducedMotion={reducedMotion}
          label={label}
          finalFocus={() => (opener?.isConnected ? opener : triggerRef.current) ?? true}
          onExited={() => setPresent(false)}
        >
          <PalettePanel
            items={items}
            label={label}
            placeholder={placeholder}
            emptyMessage={emptyMessage}
            reducedMotion={reducedMotion}
            onRun={(item) => {
              item.onSelect?.();
              onSelect?.(item);
              setOpen(false);
            }}
          />
        </PaletteLayer>
      )}
    </DialogPrimitive.Root>
  );
}

interface PaletteLayerProps {
  open: boolean;
  reducedMotion: boolean;
  label: string;
  finalFocus: () => HTMLElement | boolean;
  onExited: () => void;
  children: ReactNode;
}

// Mounted fresh for every opening, so the origin is measured and the panel's state starts over each time.
function PaletteLayer({ open, reducedMotion, label, finalFocus, onExited, children }: PaletteLayerProps) {
  // The same entrance and exit as the docs search dialog: the surface settles in from slightly larger
  // and drifts out the same way while it fades. Reduced motion keeps the fade only.
  const ease = [0.16, 1, 0.3, 1] as const;
  const hidden = reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 };
  const shown = reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 };
  const leaving = reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 };
  const transition: Transition = { duration: reducedMotion ? 0.15 : 0.3, ease };

  return (
    <DialogPrimitive.Portal keepMounted>
      <DialogPrimitive.Backdrop
        data-slot="command-palette-scrim"
        hidden={false}
        // A fading scrim lets clicks through, so the trigger can reopen the palette mid-exit.
        style={{ pointerEvents: open ? undefined : "none" }}
        className="bg-foreground/25 dark:bg-background/70 fixed inset-0 z-50 backdrop-blur-xs"
        render={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: open ? 1 : 0 }}
            transition={{ duration: reducedMotion ? 0.15 : 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
        }
      />
      <DialogPrimitive.Viewport
        data-slot="command-palette-viewport"
        hidden={false}
        className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[max(1rem,12vh)]"
      >
        <DialogPrimitive.Popup
          aria-label={label}
          data-slot="command-palette"
          data-state={open ? "open" : "closed"}
          hidden={false}
          // While closing, the popup only plays its exit and can no longer be focused or clicked.
          inert={!open}
          finalFocus={finalFocus}
          // Focus stays in the input: a press on a row or the back button must not take it.
          onMouseDown={(event) => {
            if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
          }}
          className={`${surfaceClass} relative isolate flex w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl outline-none`}
          render={
            <motion.div
              initial={hidden}
              animate={open ? shown : leaving}
              transition={transition}
              onAnimationComplete={() => {
                if (!open) onExited();
              }}
            />
          }
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

interface PalettePanelProps {
  items: CommandPaletteItem[];
  label: string;
  placeholder: string;
  emptyMessage?: ReactNode;
  reducedMotion: boolean;
  onRun: (item: CommandPaletteItem) => void;
}

const pageVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 16 }),
  rest: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -16 }),
};
const fadeVariants: Variants = { enter: { opacity: 0 }, rest: { opacity: 1 }, exit: { opacity: 0 } };

function PalettePanel({ items, label, placeholder, emptyMessage, reducedMotion, onRun }: PalettePanelProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  // Ids of the items whose nested pages are open, outermost first.
  const [path, setPath] = useState<string[]>([]);
  // 1 while going deeper and -1 while coming back, so a page leaves the way it came in.
  const [direction, setDirection] = useState(1);
  // The row the highlight sits on. `id: null` means the first row. `reveal` scrolls it into view, which
  // only keyboard moves and new results ask for: the pointer is already where it points.
  const [cursor, setCursor] = useState<{ id: string | null; reveal: boolean }>({ id: null, reveal: false });
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const height = useMotionValue<number | string>("auto");
  // One highlight for the whole list, moved to the active row. Where it last went, so it is only retargeted
  // when the row actually sits somewhere else.
  const highlightY = useMotionValue(0);
  const highlightHeight = useMotionValue(0);
  const highlightOpacity = useMotionValue(0);
  const highlightTarget = useRef<{ top: number; height: number } | null>(null);

  // Resolve the open pages against the latest items, dropping any that no longer exist.
  const trail: CommandPaletteItem[] = [];
  let pageItems = items;
  for (const step of path) {
    const parent = pageItems.find((item) => item.id === step);
    if (!parent?.children?.length) break;
    trail.push(parent);
    pageItems = parent.children;
  }
  const parent = trail.at(-1);
  const pageKey = trail.map((item) => item.id).join("/");

  const sections = buildSections(pageItems, query, `${id}-${trail.length}`);
  const rows = sections.flatMap((section) => section.rows);
  const enabled = rows.filter((row) => !row.item.disabled);
  const active = enabled.find((row) => row.item.id === cursor.id) ?? enabled[0];
  const activeIndex = active ? enabled.indexOf(active) : -1;

  const spring: Transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring", visualDuration: 0.28, bounce: 0 };
  const rowTransition: Transition = { layout: spring, opacity: { duration: 0.12, ease: "easeOut" } };
  const activeId = active?.domId;
  // Changes whenever a row could have moved: a different page, set of rows, or order.
  const arrangement = rows.map((row) => row.domId).join(" ");

  // Glide the highlight to the active row's resting place. It springs from wherever it is, at whatever
  // speed it has, so the keyboard and the pointer can both redirect it mid-flight. It appears in place
  // instead of flying in, and reduced motion moves it without travel.
  const placeHighlight = useEffectEvent(() => {
    const list = listRef.current;
    const row = activeId ? document.getElementById(activeId) : null;
    if (!list || !row) {
      highlightOpacity.set(0);
      highlightTarget.current = null;
      return;
    }
    let top = 0;
    for (let node: HTMLElement | null = row; node && node !== list;) {
      top += node.offsetTop;
      node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
    }
    const last = highlightTarget.current;
    const next = { top, height: row.offsetHeight };
    highlightTarget.current = next;
    highlightOpacity.set(1);
    if (!last || reducedMotion) {
      highlightY.jump(next.top);
      highlightHeight.jump(next.height);
      return;
    }
    const glide = { type: "spring", visualDuration: 0.18, bounce: 0 } as const;
    if (last.top !== next.top) animate(highlightY, next.top, glide);
    if (last.height !== next.height) animate(highlightHeight, next.height, glide);
  });
  useLayoutEffect(() => {
    placeHighlight();
  }, [activeId, arrangement]);

  // The list's height follows its content on a spring, so the surface resizes with the results
  // instead of snapping. Retargeting mid-flight continues from the live height and velocity.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    let first = true;
    const measure = () => {
      const applied = scroller.style.height;
      scroller.style.height = "auto";
      const natural = scroller.offsetHeight;
      scroller.style.height = applied;
      if (first || reducedMotion) height.jump(natural);
      else animate(height, natural, { type: "spring", visualDuration: 0.28, bounce: 0 });
      first = false;
      // Rows can change height without changing order, such as when a font finishes loading.
      placeHighlight();
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [height, reducedMotion]);

  // Keep the highlighted row in view. Offsets describe the resting layout, so a row still gliding to
  // its new place is revealed where it will land.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!cursor.reveal || !scroller) return;
    if (activeIndex <= 0) {
      scroller.scrollTop = 0;
      return;
    }
    if (activeIndex === enabled.length - 1) {
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    const row = active && document.getElementById(active.domId);
    if (!row) return;
    let top = 0;
    for (let node: HTMLElement | null = row; node && node !== scroller;) {
      top += node.offsetTop;
      node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
    }
    const margin = 6;
    if (top - margin < scroller.scrollTop) scroller.scrollTop = top - margin;
    else if (top + row.offsetHeight + margin > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTop = top + row.offsetHeight + margin - scroller.clientHeight;
    }
    // `cursor` changes identity on every move, including ones that land on the same row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const run = (item: CommandPaletteItem) => {
    if (item.disabled) return;
    if (!item.children?.length) {
      onRun(item);
      return;
    }
    setPath([...trail.map((step) => step.id), item.id]);
    setDirection(1);
    setQuery("");
    setCursor({ id: null, reveal: true });
  };

  const back = () => {
    if (!parent) return;
    setPath(trail.slice(0, -1).map((step) => step.id));
    setDirection(-1);
    setQuery("");
    // Land on the item this page was opened from.
    setCursor({ id: parent.id, reveal: true });
  };

  const moveTo = (index: number) => {
    const row = enabled[Math.max(0, Math.min(enabled.length - 1, index))];
    if (row) setCursor({ id: row.item.id, reveal: true });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveTo(activeIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        event.preventDefault();
        moveTo(enabled.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        if (active) run(active.item);
        break;
      case "Tab":
        // The input is the palette's only stop, so Tab has nowhere to go.
        event.preventDefault();
        break;
      case "Backspace":
        if (query === "" && parent) {
          event.preventDefault();
          back();
        }
        break;
    }
  };

  // Rows that glide or scroll under a resting pointer fire moves too. Only a pointer that actually
  // travelled takes the highlight, so it never pulls it back from the keyboard.
  const pointAt = (event: ReactPointerEvent, item: CommandPaletteItem) => {
    const last = pointer.current;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (!last || (last.x === event.clientX && last.y === event.clientY)) return;
    if (!item.disabled && item.id !== active?.item.id) setCursor({ id: item.id, reveal: false });
  };

  const listId = `${id}-list`;
  const count = rows.length;

  return (
    <>
      <div className="border-border flex h-12 shrink-0 items-center gap-2.5 border-b px-3.5">
        <SearchIcon className="text-muted-foreground size-4 shrink-0" />
        <AnimatePresence initial={false} mode="popLayout">
          {parent && (
            <motion.button
              key={pageKey}
              type="button"
              tabIndex={-1}
              data-slot="command-palette-back"
              aria-label={`Back from ${parent.label}`}
              onClick={back}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              whileTap={reducedMotion ? undefined : { scale: 0.95 }}
              transition={
                reducedMotion ? { duration: 0.1 } : { type: "spring", visualDuration: 0.2, bounce: 0 }
              }
              className="bg-foreground/8 text-foreground contrast-more:border-foreground inline-flex h-6 max-w-40 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-transparent pr-2 pl-1 text-xs font-medium"
            >
              <Chevron className="size-3 shrink-0 rotate-180" />
              <span className="truncate">{parent.label}</span>
            </motion.button>
          )}
        </AnimatePresence>
        <input
          role="combobox"
          aria-label={parent ? `Search ${parent.label}` : placeholder}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active?.domId}
          data-slot="command-palette-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder={parent ? `Search ${parent.label.toLowerCase()}…` : placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor({ id: null, reveal: true });
          }}
          onKeyDown={onKeyDown}
          className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </div>

      <motion.div
        ref={scrollerRef}
        // Rows measure their positions inside this scroller, so scrolling does not read as movement.
        layoutScroll
        // Browsers put a scrollable box in the tab order. Focus belongs to the input.
        tabIndex={-1}
        data-slot="command-palette-list"
        style={{ height }}
        className="relative max-h-[min(22rem,55dvh)] overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <div ref={contentRef} className="relative p-1.5">
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={parent?.label ?? label}
            className="relative isolate"
          >
            <motion.div
              aria-hidden="true"
              data-slot="command-palette-highlight"
              style={{ y: highlightY, height: highlightHeight, opacity: highlightOpacity }}
              className="bg-foreground/8 contrast-more:ring-foreground [[role=listbox]:has([role=option]:not([aria-disabled]):active)>&]:bg-foreground/12 pointer-events-none absolute inset-x-0 top-0 -z-10 rounded-lg contrast-more:ring-1 contrast-more:ring-inset"
            />
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.div
                key={pageKey}
                role="presentation"
                custom={direction}
                variants={reducedMotion ? fadeVariants : pageVariants}
                initial="enter"
                animate="rest"
                exit="exit"
                transition={
                  reducedMotion
                    ? { duration: 0.1 }
                    : { x: spring, opacity: { duration: 0.14, ease: "easeOut" } }
                }
                className="relative"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {sections.map((section) => (
                    <motion.div
                      key={section.key}
                      role={section.heading ? "group" : "presentation"}
                      aria-labelledby={
                        section.heading ? `${id}-${trail.length}-${section.order}-heading` : undefined
                      }
                      layout={reducedMotion ? false : "position"}
                      variants={fadeVariants}
                      initial="enter"
                      animate="rest"
                      exit="exit"
                      transition={rowTransition}
                      className="relative"
                    >
                      {section.heading && (
                        <div
                          id={`${id}-${trail.length}-${section.order}-heading`}
                          className="text-muted-foreground px-2.5 pt-2.5 pb-1 text-xs font-medium"
                        >
                          {section.heading}
                        </div>
                      )}
                      <AnimatePresence initial={false} mode="popLayout">
                        {section.rows.map((row) => (
                          <PaletteRow
                            key={row.item.id}
                            row={row}
                            active={row === active}
                            reducedMotion={reducedMotion}
                            transition={rowTransition}
                            onPoint={pointAt}
                            onPress={(item) => {
                              if (!item.disabled) setCursor({ id: item.id, reveal: false });
                            }}
                            onRun={run}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
          {count === 0 && (
            <motion.p
              data-slot="command-palette-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="text-muted-foreground px-4 py-8 text-center text-sm text-balance"
            >
              {emptyMessage ?? (query.trim() ? <>No results for “{query.trim()}”</> : "Nothing here yet")}
            </motion.p>
          )}
        </div>
      </motion.div>

      <div
        aria-hidden="true"
        data-slot="command-palette-hints"
        className="border-border text-muted-foreground flex shrink-0 items-center gap-4 border-t px-3.5 py-2 text-xs [@media(pointer:coarse)]:hidden"
      >
        <span className="flex items-center gap-1.5">
          <kbd className={keyClass}>↑</kbd>
          <kbd className={keyClass}>↓</kbd>
          Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className={keyClass}>↵</kbd>
          {active?.item.children?.length ? "Open" : "Run"}
        </span>
        {parent && (
          <span className="flex items-center gap-1.5">
            <kbd className={keyClass}>⌫</kbd>
            Back
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <kbd className={keyClass}>Esc</kbd>
          Close
        </span>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {count === 0 ? "No results" : `${count} ${count === 1 ? "result" : "results"}`}
      </div>
    </>
  );
}

interface PaletteRowProps {
  row: Row;
  active: boolean;
  reducedMotion: boolean;
  transition: Transition;
  onPoint: (event: ReactPointerEvent, item: CommandPaletteItem) => void;
  onPress: (item: CommandPaletteItem) => void;
  onRun: (item: CommandPaletteItem) => void;
  /** Passed by AnimatePresence to lift a leaving row out of the flow. */
  ref?: Ref<HTMLDivElement>;
}

function PaletteRow({
  row,
  active,
  reducedMotion,
  transition,
  onPoint,
  onPress,
  onRun,
  ref,
}: PaletteRowProps) {
  const { item, domId, indices } = row;
  const nested = Boolean(item.children?.length);

  return (
    <motion.div
      ref={ref}
      // Position only: a row keeps its size and glides to its new place when the results reorder.
      layout={reducedMotion ? false : "position"}
      variants={fadeVariants}
      initial="enter"
      animate="rest"
      exit="exit"
      transition={transition}
      id={domId}
      role="option"
      aria-selected={active}
      aria-disabled={item.disabled || undefined}
      aria-labelledby={`${domId}-label`}
      aria-describedby={
        [item.description && `${domId}-description`, nested && `${domId}-nested`].filter(Boolean).join(" ") ||
        undefined
      }
      data-slot="command-palette-item"
      data-value={item.id}
      data-active={active || undefined}
      onPointerMove={(event) => onPoint(event, item)}
      // The highlight lands on press, before the click commits, and deepens while the row is held.
      onPointerDown={() => onPress(item)}
      onClick={() => onRun(item)}
      className="group relative flex min-h-11 cursor-default items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm select-none"
    >
      {item.icon && (
        <span
          aria-hidden="true"
          className="text-muted-foreground group-data-active:text-foreground flex size-5 shrink-0 items-center justify-center transition-colors duration-100 group-aria-disabled:opacity-50 [&_svg]:size-4"
        >
          {item.icon}
        </span>
      )}
      {/* The row fades itself in and out, so a disabled row dims its contents instead. */}
      <span className="min-w-0 flex-1 group-aria-disabled:opacity-50">
        <span id={`${domId}-label`} className="block truncate">
          <Marked text={item.label} indices={indices} />
        </span>
        {item.description && (
          <span id={`${domId}-description`} className="text-muted-foreground block truncate text-xs">
            {item.description}
          </span>
        )}
      </span>
      {item.shortcut?.length ? (
        <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
          {item.shortcut.map((keyLabel, index) => (
            <kbd key={index} className={keyClass}>
              {keyLabel}
            </kbd>
          ))}
        </span>
      ) : null}
      {nested && (
        <>
          <span id={`${domId}-nested`} className="sr-only">
            Opens a list
          </span>
          <Chevron className="text-muted-foreground size-3.5 shrink-0" />
        </>
      )}
    </motion.div>
  );
}
