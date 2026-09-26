"use client";

import { clsx as cn } from "clsx";
import { Search } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export interface CommandDeckAction {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Displayed beside the action. The application owns this shortcut. */
  shortcut?: string;
  keywords?: readonly string[];
  disabled?: boolean;
  onSelect?: () => void;
}

export interface CommandDeckProps {
  actions: readonly CommandDeckAction[];
  onAction?: (action: CommandDeckAction) => void;
  ariaLabel?: string;
  placeholder?: string;
  emptyMessage?: string;
  /** Focuses this deck with Command/Ctrl+K. Use on one deck per page. */
  enableGlobalShortcut?: boolean;
  className?: string;
  style?: CSSProperties;
}

const theme = {
  "--command-deck-background": "var(--background, #f8f8f5)",
  "--command-deck-foreground": "var(--foreground, #242423)",
  "--command-deck-muted": "var(--muted-foreground, #73736e)",
  "--command-deck-border": "var(--border, #d4d4cf)",
} as CSSProperties;

export function CommandDeck({
  actions,
  onAction,
  ariaLabel = "Find an action",
  placeholder = "Find an action...",
  emptyMessage = "No matching actions",
  enableGlobalShortcut = false,
  className,
  style,
}: CommandDeckProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [result, setResult] = useState("Select an action to preview the result");
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return actions;
    return actions.filter((action) =>
      [action.label, action.description ?? "", ...(action.keywords ?? [])]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term),
    );
  }, [actions, query]);
  const enabled = matches.filter((action) => !action.disabled);
  const selected = enabled.find((action) => action.id === activeId) ?? enabled[0];

  useEffect(() => {
    if (!enableGlobalShortcut) return;
    const focusOnShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", focusOnShortcut);
    return () => document.removeEventListener("keydown", focusOnShortcut);
  }, [enableGlobalShortcut]);

  function runAction(action: CommandDeckAction) {
    if (action.disabled) return;
    setActiveId(action.id);
    setResult(`${action.label} selected`);
    action.onSelect?.();
    onAction?.(action);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        setQuery("");
        setActiveId(null);
      } else {
        inputRef.current?.blur();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!enabled.length) return;
      const current = enabled.findIndex((action) => action.id === selected?.id);
      const offset = event.key === "ArrowDown" ? 1 : -1;
      setActiveId(enabled[(current + offset + enabled.length) % enabled.length].id);
      return;
    }
    if (event.key === "Enter" && selected && !event.nativeEvent.isComposing) {
      event.preventDefault();
      runAction(selected);
    }
  }

  return (
    <div
      data-command-deck=""
      style={{ ...theme, ...style }}
      className={cn(
        "w-full max-w-[30rem] border border-[var(--command-deck-foreground)] bg-[var(--command-deck-background)] font-mono text-[11px] leading-normal text-[var(--command-deck-foreground)] shadow-[5px_5px_0_color-mix(in_srgb,var(--command-deck-foreground)_10%,transparent)]",
        className,
      )}
    >
      <div className="flex min-h-11 items-center gap-2.5 border-b border-[var(--command-deck-border)] px-3">
        <Search aria-hidden="true" className="size-3.5 shrink-0 text-[var(--command-deck-muted)]" />
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={selected ? `${id}-option-${matches.indexOf(selected)}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveId(null);
          }}
          onKeyDown={onInputKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[12px] text-[var(--command-deck-foreground)] outline-none placeholder:text-[var(--command-deck-muted)] [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd
          aria-hidden="true"
          className="shrink-0 border border-[var(--command-deck-border)] px-1.5 py-0.5 text-[10px] text-[var(--command-deck-muted)]"
        >
          ESC
        </kbd>
      </div>
      <div id={`${id}-list`} role="listbox" aria-label="Actions" className="max-h-64 overflow-y-auto p-1">
        {matches.length ? (
          matches.map((action, index) => (
            <div
              key={action.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={selected?.id === action.id}
              aria-disabled={action.disabled || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runAction(action)}
              onMouseEnter={() => {
                if (!action.disabled) setActiveId(action.id);
              }}
              className={cn(
                "flex min-h-9 items-center gap-2.5 px-2 py-1.5 text-left",
                action.disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                selected?.id === action.id &&
                  "bg-[var(--command-deck-foreground)] text-[var(--command-deck-background)]",
              )}
            >
              {action.icon ? (
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center border border-current [&_svg]:size-3.5"
                >
                  {action.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{action.label}</span>
                {action.description ? (
                  <span className="block truncate text-[10px] opacity-65">{action.description}</span>
                ) : null}
              </span>
              {action.shortcut ? (
                <span aria-hidden="true" className="ml-auto shrink-0 text-[10px] opacity-65">
                  {action.shortcut}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <p className="px-2 py-4 text-center text-[var(--command-deck-muted)]">{emptyMessage}</p>
        )}
      </div>
      <div
        role="status"
        aria-live="polite"
        className="min-h-7 border-t border-[var(--command-deck-border)] px-2.5 py-1.5 text-[10px] text-[var(--command-deck-muted)]"
      >
        {result}
      </div>
    </div>
  );
}
