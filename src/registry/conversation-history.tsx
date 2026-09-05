"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type Conversation = { id: string; title: string; preview?: string };
export type ConversationHistoryProps = {
  conversations: readonly Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onNew?: () => void;
  disabled?: boolean;
  className?: string;
};

export function ConversationHistory({
  conversations,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onNew,
  disabled = false,
  className,
}: ConversationHistoryProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const visible = conversations.filter((item) =>
    `${item.title} ${item.preview ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <section
      aria-label="Conversation history"
      className={cn(
        "bg-background text-foreground flex min-w-0 flex-col gap-4 rounded-lg border p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Conversations</h3>
        {onNew && (
          <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onNew}>
            New chat
          </Button>
        )}
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={id}>Search conversations</FieldLabel>
          <Input
            ref={searchRef}
            id={id}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <ul className="m-0 flex max-h-96 list-none flex-col gap-2 overflow-y-auto p-0">
        {visible.map((item) => (
          <HistoryRow
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            disabled={disabled}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={async (itemId) => {
              await onDelete(itemId);
              searchRef.current?.focus();
            }}
          />
        ))}
      </ul>
      {visible.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{query ? "No matching conversations" : "No saved conversations"}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}

function HistoryRow({
  item,
  selected,
  disabled,
  onSelect,
  onRename,
  onDelete,
}: Pick<ConversationHistoryProps, "onSelect" | "onRename" | "onDelete" | "disabled"> & {
  item: Conversation;
  selected: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [title, setTitle] = useState(item.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function close() {
    setMode("view");
    setError("");
    trigger.current?.focus();
  }
  async function save(action: () => void | Promise<void>) {
    if (lock.current || disabled) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save. Try again.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-md border p-2" aria-busy={pending}>
      <Button
        ref={trigger}
        type="button"
        variant={selected ? "secondary" : "ghost"}
        className="w-full justify-start"
        disabled={disabled || pending}
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(item.id)}
      >
        <span className="truncate">{item.title}</span>
      </Button>
      {item.preview && <p className="text-muted-foreground truncate text-xs">{item.preview}</p>}
      {mode === "view" && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={`Rename ${item.title}`}
            onClick={() => {
              setTitle(item.title);
              setMode("rename");
            }}
          >
            Rename
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={`Delete ${item.title}`}
            onClick={() => setMode("delete")}
          >
            Delete
          </Button>
        </div>
      )}
      {mode === "rename" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim()) void save(() => onRename(item.id, title.trim()));
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !pending) close();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={id}>Conversation title</FieldLabel>
              <Input
                id={id}
                autoFocus
                maxLength={200}
                value={title}
                disabled={pending || disabled}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!title.trim() || pending || disabled}>
              {pending ? "Saving…" : "Save title"}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {mode === "delete" && (
        <div className="flex flex-col gap-2">
          <p>Delete “{item.title}”? This removes it from saved history.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || disabled}
              onClick={() => void save(() => onDelete(item.id))}
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </li>
  );
}
