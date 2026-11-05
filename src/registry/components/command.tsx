"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useIsPresent,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Entry = { group: string | null; match: boolean };

type CommandContextValue = {
  matches: (value: string, keywords?: string[]) => boolean;
  highlighted: string | null;
  register: (id: string, entry: Entry) => void;
  unregister: (id: string) => void;
  /** False until items have registered, so server HTML never flashes the empty state. */
  ready: boolean;
  markReady: () => void;
  count: number;
  groups: Set<string>;
  select: (value: string) => void;
  transition: Transition;
  reducedMotion: boolean;
};

const CommandContext = createContext<CommandContextValue | null>(null);
const GroupContext = createContext<string | null>(null);
const DialogContext = createContext<{ close: () => void } | null>(null);

function useCommand(part: string) {
  const context = useContext(CommandContext);
  if (!context) throw new Error(`${part} must be used within Command.`);
  return context;
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Matches when every word of the search appears in the value or its keywords. */
function defaultFilter(value: string, search: string, keywords: string[] = []) {
  const haystack = normalize([value, ...keywords].join(" "));
  return normalize(search)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export interface CommandProps {
  /** The search text when controlled by the caller. */
  search?: string;
  /** The initial search text when uncontrolled. */
  defaultSearch?: string;
  onSearchChange?: (search: string) => void;
  /** Decides whether an item matches the search. Defaults to a word-by-word contains match. */
  filter?: (value: string, search: string, keywords?: string[]) => boolean;
  /** Called with the value of any item the user runs, after the item's own `onSelect`. */
  onSelect?: (value: string) => void;
  /** Wrap the arrow keys from the last item back to the first. */
  loop?: boolean;
  /** Highlight, reorder, and height animation time in seconds. */
  duration?: number;
  className?: string;
  children?: ReactNode;
}

export function Command({
  search,
  defaultSearch = "",
  onSearchChange,
  filter = defaultFilter,
  onSelect,
  loop = true,
  duration = 0.3,
  className,
  children,
}: CommandProps) {
  const id = useId();
  const dialog = useContext(DialogContext);
  const reducedMotion = useReducedMotion() ?? false;
  const [internalSearch, setInternalSearch] = useState(defaultSearch);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [ready, setReady] = useState(false);
  const query = search ?? internalSearch;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.3;
  const transition: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.15 };

  const markReady = useCallback(() => setReady(true), []);
  const register = useCallback((key: string, entry: Entry) => {
    setEntries((current) => {
      const previous = current[key];
      if (previous?.group === entry.group && previous.match === entry.match) return current;
      return { ...current, [key]: entry };
    });
  }, []);
  const unregister = useCallback((key: string) => {
    setEntries((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const visible = Object.values(entries).filter((entry) => entry.match);
  const groups = new Set(visible.flatMap((entry) => (entry.group ? [entry.group] : [])));

  return (
    <LayoutGroup id={id}>
      <CommandContext.Provider
        value={{
          matches: (value, keywords) => !query.trim() || filter(value, query, keywords),
          highlighted,
          register,
          unregister,
          ready,
          markReady,
          count: visible.length,
          groups,
          select: (value) => {
            onSelect?.(value);
            dialog?.close();
          },
          transition,
          reducedMotion,
        }}
      >
        <Autocomplete.Root
          inline
          open
          mode="none"
          autoHighlight="always"
          keepHighlight
          loopFocus={loop}
          value={query}
          onValueChange={(next, details) => {
            // Running a command should not copy its label into the search field.
            if (details.reason === "item-press") return;
            if (search === undefined) setInternalSearch(next);
            onSearchChange?.(next);
          }}
          onItemHighlighted={(value) => setHighlighted(typeof value === "string" ? value : null)}
        >
          <div
            data-slot="command"
            className={`bg-background text-foreground flex w-full flex-col overflow-hidden ${dialog ? "" : "border-border focus-within:ring-ring/30 rounded-xl border shadow-sm focus-within:ring-3"} ${className ?? ""}`}
          >
            {children}
          </div>
        </Autocomplete.Root>
      </CommandContext.Provider>
    </LayoutGroup>
  );
}

export interface CommandInputProps {
  placeholder?: string;
  /** Accessible name for the search field. */
  "aria-label"?: string;
  className?: string;
}

export function CommandInput({
  placeholder = "Type a command or search…",
  "aria-label": ariaLabel = "Search commands",
  className,
}: CommandInputProps) {
  useCommand("CommandInput");

  return (
    <div data-slot="command-input-wrapper" className="border-border flex items-center gap-2 border-b px-3">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-muted-foreground size-4 shrink-0"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </svg>
      <Autocomplete.Input
        data-slot="command-input"
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={`placeholder:text-muted-foreground h-11 w-full min-w-0 bg-transparent text-base outline-none sm:text-sm ${className ?? ""}`}
      />
    </div>
  );
}

export interface CommandListProps {
  className?: string;
  children?: ReactNode;
}

export function CommandList({ className, children }: CommandListProps) {
  const command = useCommand("CommandList");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  // Follow the content's height so the panel grows and shrinks with the results.
  const { markReady } = command;
  // Items inside commit their layout effects first, so their registrations land in this render.
  useLayoutEffect(() => markReady(), [markReady]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    const measure = () => {
      const max = Number.parseFloat(getComputedStyle(scroller).maxHeight);
      const next = content.offsetHeight;
      setHeight(Number.isFinite(max) ? Math.min(next, max) : next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={scrollerRef}
      data-slot="command-list"
      layoutScroll
      initial={false}
      animate={{ height }}
      transition={command.transition}
      className={`max-h-80 overflow-x-hidden overflow-y-auto overscroll-contain ${className ?? ""}`}
    >
      <div ref={contentRef}>
        <Autocomplete.List className="relative isolate [scroll-padding-block:0.25rem] p-1">
          {children}
        </Autocomplete.List>
      </div>
    </motion.div>
  );
}

export interface CommandEmptyProps {
  className?: string;
  children?: ReactNode;
}

export function CommandEmpty({ className, children = "No results found." }: CommandEmptyProps) {
  const command = useCommand("CommandEmpty");
  const empty = command.ready && command.count === 0;

  // The live region stays mounted so screen readers announce each change.
  return (
    <div role="status" aria-live="polite" data-slot="command-empty-status">
      <AnimatePresence initial={false}>
        {empty && (
          <motion.div
            key="empty"
            data-slot="command-empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={command.transition}
            className={`text-muted-foreground py-6 text-center text-sm ${className ?? ""}`}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface CommandGroupProps {
  /** Visible heading that also names the group for assistive technology. */
  heading?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CommandGroup({ heading, className, children }: CommandGroupProps) {
  const command = useCommand("CommandGroup");
  const id = useId();
  const visible = !command.ready || command.groups.has(id);

  return (
    <GroupContext.Provider value={id}>
      <Autocomplete.Group
        data-slot="command-group"
        aria-hidden={visible ? undefined : true}
        className={className}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {heading && visible && (
            <motion.div
              key="heading"
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={command.transition}
            >
              <Autocomplete.GroupLabel
                data-slot="command-group-heading"
                className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium select-none"
              >
                {heading}
              </Autocomplete.GroupLabel>
            </motion.div>
          )}
        </AnimatePresence>
        {children}
      </Autocomplete.Group>
    </GroupContext.Provider>
  );
}

export interface CommandItemProps {
  /** Unique text the search matches against. Also identifies the item. */
  value: string;
  /** Extra words that match the item without being shown. */
  keywords?: string[];
  disabled?: boolean;
  /** Runs when the item is clicked or chosen with Enter. */
  onSelect?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}

const itemClass =
  "relative flex min-h-9 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:text-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

export function CommandItem({ value, keywords, disabled, onSelect, className, children }: CommandItemProps) {
  const command = useCommand("CommandItem");
  const group = useContext(GroupContext);
  const id = useId();
  const match = command.matches(value, keywords);
  const { register, unregister } = command;

  useLayoutEffect(() => register(id, { group, match }), [register, id, group, match]);
  useLayoutEffect(() => () => unregister(id), [unregister, id]);

  const initial = command.reducedMotion ? false : { opacity: 0, scale: 0.98 };

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {match && (
        <motion.div
          key="item"
          role="presentation"
          layout="position"
          initial={initial}
          animate={{ opacity: 1, scale: 1 }}
          exit={
            command.reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.98 }
          }
          transition={command.transition}
        >
          <ItemBody value={value} disabled={disabled} onSelect={onSelect} className={className}>
            {children}
          </ItemBody>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ItemBody({ value, disabled, onSelect, className, children }: Omit<CommandItemProps, "keywords">) {
  const command = useCommand("CommandItem");
  const present = useIsPresent();

  // A leaving item becomes a plain copy so the keyboard can no longer land on it.
  if (!present) {
    return (
      <div
        aria-hidden="true"
        data-slot="command-item"
        data-exiting=""
        className={`${itemClass} ${className ?? ""}`}
      >
        {children}
      </div>
    );
  }

  return (
    <Autocomplete.Item
      value={value}
      disabled={disabled}
      data-slot="command-item"
      onClick={() => {
        onSelect?.(value);
        command.select(value);
      }}
      className={`${itemClass} ${className ?? ""}`}
    >
      {command.highlighted === value && (
        <motion.span
          aria-hidden="true"
          data-slot="command-highlight"
          layoutId="command-highlight"
          initial={false}
          transition={command.transition}
          className="bg-muted pointer-events-none absolute inset-0 -z-10 rounded-md"
        />
      )}
      {children}
    </Autocomplete.Item>
  );
}

export interface CommandShortcutProps {
  className?: string;
  children?: ReactNode;
}

export function CommandShortcut({ className, children }: CommandShortcutProps) {
  return (
    <kbd
      data-slot="command-shortcut"
      className={`text-muted-foreground border-border ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-sans text-[0.6875rem] tracking-wide ${className ?? ""}`}
    >
      {children}
    </kbd>
  );
}

export interface CommandDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Toggle the dialog with ⌘ or Ctrl plus this key. `true` uses K. */
  shortcut?: boolean | string;
  /** Accessible title, visually hidden. */
  title?: string;
  /** Accessible description, visually hidden. */
  description?: string;
  /** Entrance spring time in seconds. */
  duration?: number;
  className?: string;
  children?: ReactNode;
}

export function CommandDialog({
  open,
  defaultOpen = false,
  onOpenChange,
  shortcut = false,
  title = "Command palette",
  description,
  duration = 0.35,
  className,
  children,
}: CommandDialogProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;
  const seconds = reducedMotion ? 0 : Number.isFinite(duration) ? Math.max(0, duration) : 0.35;
  const spring: Transition =
    seconds === 0 ? { duration: 0 } : { type: "spring", visualDuration: seconds, bounce: 0.2 };
  const fade: Transition = { duration: seconds === 0 ? 0 : Math.min(seconds, 0.2) };

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    const key = typeof shortcut === "string" ? shortcut.toLowerCase() : "k";
    if (event.key.toLowerCase() !== key || !(event.metaKey || event.ctrlKey)) return;
    if (event.altKey || event.shiftKey || event.repeat) return;
    // Claim the shortcut so another ⌘K listener, such as a site search, does not open too.
    event.preventDefault();
    event.stopPropagation();
    setOpen(!isOpen);
  });

  useEffect(() => {
    if (!shortcut) return;
    const listener = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  }, [shortcut]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal keepMounted>
            <Dialog.Backdrop
              data-slot="command-dialog-backdrop"
              className="bg-background/70 fixed inset-0 z-50 backdrop-blur-[2px]"
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fade}
                />
              }
            />
            <Dialog.Viewport className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[min(18vh,8rem)]">
              <Dialog.Popup
                data-slot="command-dialog"
                className={`border-border bg-background w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl outline-none ${className ?? ""}`}
                render={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -8, transition: fade }}
                    transition={spring}
                  />
                }
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
                <DialogContext.Provider value={{ close: () => setOpen(false) }}>
                  {children}
                </DialogContext.Provider>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
