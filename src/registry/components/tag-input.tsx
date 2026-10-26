"use client";

import { XIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type ReactNode } from "react";

import { Label } from "@/components/ui/label";

export interface TagInputProps {
  /** Visible label for the field. */
  label: ReactNode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (tags: string[]) => void;
  /** Most tags the field accepts. Shows a counter next to the label. */
  max?: number;
  /** Hint shown under the field. */
  description?: ReactNode;
  placeholder?: string;
  /** Submits each tag as a separate form value under this name. */
  name?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

// Tags are trimmed and compared case-insensitively, so "React" and "react " count as one.
const normalize = (tags: readonly string[]) => {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export function TagInput({
  label,
  value,
  defaultValue = [],
  onValueChange,
  max,
  description,
  placeholder,
  name,
  disabled = false,
  id: idProp,
  className,
}: TagInputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const [internalTags, setInternalTags] = useState(() => normalize(defaultValue));
  const [draft, setDraft] = useState("");
  // The first Backspace on an empty draft highlights the last tag; the second removes it.
  const [armed, setArmed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const tags = normalize(value ?? internalTags);
  const full = max !== undefined && tags.length >= max;
  const lastTag = tags.at(-1);
  const highlighted = armed && lastTag !== undefined ? lastTag : undefined;
  const descriptionId = description ? `${id}-description` : undefined;
  const countId = max !== undefined ? `${id}-count` : undefined;

  const update = (next: string[]) => {
    if (value === undefined) setInternalTags(next);
    onValueChange?.(next);
  };

  const reject = (message: string) => {
    setAnnouncement(message);
    if (!reducedMotion) animate(scope.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.36 });
  };

  // Adds every comma- or newline-separated entry in text, up to max. Returns whether any was added.
  const add = (text: string) => {
    const keys = new Set(tags.map((tag) => tag.toLowerCase()));
    const entries = normalize(text.split(/[,\n]/));
    const fresh = entries.filter((tag) => !keys.has(tag.toLowerCase()));
    const added = max === undefined ? fresh : fresh.slice(0, Math.max(0, max - tags.length));
    if (added.length > 0) {
      update([...tags, ...added]);
      setAnnouncement(`Added ${added.join(", ")}.`);
    }
    if (added.length < fresh.length) reject(`Limit of ${max} tags reached.`);
    else if (fresh.length < entries.length)
      reject(`${entries.find((tag) => !fresh.includes(tag))} is already added.`);
    return added.length > 0;
  };

  const remove = (index: number) => {
    const tag = tags[index];
    if (tag === undefined) return;
    update(tags.filter((_, i) => i !== index));
    setArmed(false);
    setAnnouncement(`Removed ${tag}.`);
  };

  return (
    <div
      data-slot="tag-input"
      data-full={full || undefined}
      data-disabled={disabled || undefined}
      className={`w-full ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {max !== undefined && (
          <span
            id={countId}
            data-slot="tag-input-count"
            className={`font-mono text-xs tabular-nums transition-colors ${full ? "text-foreground" : "text-muted-foreground"}`}
          >
            {tags.length}/{max}
          </span>
        )}
      </div>
      <div
        ref={scope}
        data-slot="tag-input-field"
        className={`bg-background border-border focus-within:border-ring focus-within:ring-ring/30 mt-2 flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border p-1.5 text-sm transition-[border-color,box-shadow] focus-within:ring-3 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        onPointerDown={(event) => {
          // Clicking the empty space of the field focuses the text input.
          if (disabled || event.target !== event.currentTarget) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <ul role="list" aria-label="Tags" className="contents">
          <AnimatePresence initial={false} mode="popLayout">
            {tags.map((tag, index) => {
              const active = tag === highlighted;
              return (
                <motion.li
                  key={tag.toLowerCase()}
                  layout={!reducedMotion}
                  data-slot="tag-input-tag"
                  data-highlighted={active || undefined}
                  className={`flex h-6 max-w-full min-w-0 items-center gap-0.5 rounded-sm pr-0.5 pl-2 text-xs font-medium ring-1 transition-colors ${active ? "bg-destructive/15 text-destructive ring-destructive" : "bg-muted text-foreground ring-transparent"}`}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={
                    reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.8 }
                  }
                  transition={{ type: "spring", duration: reducedMotion ? 0 : 0.3, bounce: 0.2 }}
                >
                  <span className="truncate">{tag}</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove ${tag}`}
                    data-slot="tag-input-remove"
                    disabled={disabled}
                    className="hover:bg-foreground/10 grid size-5 shrink-0 place-items-center rounded-xs opacity-60 transition-opacity hover:opacity-100 disabled:pointer-events-none"
                    // Keeps focus in the text input so typing can continue after a removal.
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => {
                      remove(index);
                      inputRef.current?.focus();
                    }}
                  >
                    <XIcon aria-hidden="true" weight="bold" className="size-3" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        <motion.input
          ref={inputRef}
          id={id}
          layout={reducedMotion ? false : "position"}
          value={draft}
          disabled={disabled}
          readOnly={full}
          placeholder={full ? undefined : placeholder}
          autoComplete="off"
          enterKeyHint="enter"
          aria-describedby={[descriptionId, countId].filter(Boolean).join(" ") || undefined}
          className="placeholder:text-muted-foreground h-6 min-w-24 flex-1 bg-transparent px-1 outline-none disabled:cursor-not-allowed"
          onChange={(event) => {
            setArmed(false);
            setDraft(event.currentTarget.value);
          }}
          onBlur={() => setArmed(false)}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (!/[,\n]/.test(text)) return;
            event.preventDefault();
            if (add(draft + text)) setDraft("");
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            const caretAtStart =
              event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
            if (event.key === "Backspace" && caretAtStart && lastTag !== undefined) {
              event.preventDefault();
              if (armed) remove(tags.length - 1);
              else {
                setArmed(true);
                setAnnouncement(`${lastTag} selected. Press Backspace again to remove it.`);
              }
              return;
            }
            if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
            setArmed(false);
            if (event.key === "Enter" || event.key === ",") {
              // An empty Enter is left alone so it can still submit the surrounding form.
              if (event.key === "Enter" && !draft.trim()) return;
              event.preventDefault();
              if (add(draft)) setDraft("");
            } else if (full && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
              reject(`Limit of ${max} tags reached.`);
            }
          }}
        />
      </div>
      {description && (
        <p
          id={descriptionId}
          data-slot="tag-input-description"
          className="text-muted-foreground mt-2 text-sm"
        >
          {description}
        </p>
      )}
      {name !== undefined && tags.map((tag) => <input key={tag} type="hidden" name={name} value={tag} />)}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
