"use client";

import { useSyncExternalStore } from "react";
import { ConversationHistory, type Conversation } from "@/registry/conversation-history";

const key = "a1ui:conversation-history:v1";
const initial = {
  version: 1,
  selectedId: "research",
  conversations: [
    { id: "research", title: "Research a new idea", preview: "Compare the options and constraints." },
    { id: "launch", title: "Plan the launch", preview: "A checklist for the next release." },
  ],
};
const fallback = JSON.stringify(initial);
function snapshot() {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(key, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(key, notify);
  };
}
function parse(raw: string): typeof initial {
  try {
    const value = JSON.parse(raw);
    if (
      value.version === 1 &&
      typeof value.selectedId === "string" &&
      Array.isArray(value.conversations) &&
      value.conversations.every(
        (item: Conversation) =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.preview === "string",
      ) &&
      new Set(value.conversations.map((item: Conversation) => item.id)).size === value.conversations.length
    )
      return value;
  } catch {
    /* Recover from stale or malformed browser storage. */
  }
  return initial;
}
function update(change: (value: typeof initial) => typeof initial) {
  // Read the latest snapshot so another tab's changes aren't silently overwritten.
  localStorage.setItem(key, JSON.stringify(change(parse(snapshot()))));
  window.dispatchEvent(new Event(key));
}
export function ConversationHistoryDemo() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => fallback);
  const value = parse(raw);
  return (
    <div className="not-prose flex flex-col gap-4">
      <ConversationHistory
        conversations={value.conversations}
        selectedId={value.selectedId}
        onSelect={(id) => {
          try {
            update((current) => ({ ...current, selectedId: id }));
          } catch {
            window.alert("Browser storage is unavailable.");
          }
        }}
        onNew={() => {
          try {
            const id = crypto.randomUUID();
            update((current) => ({
              ...current,
              selectedId: id,
              conversations: [
                { id, title: "Untitled conversation", preview: "Start a new topic." },
                ...current.conversations,
              ],
            }));
          } catch {
            window.alert("Browser storage is unavailable.");
          }
        }}
        onRename={(id, title) =>
          update((current) => ({
            ...current,
            conversations: current.conversations.map((item) => (item.id === id ? { ...item, title } : item)),
          }))
        }
        onDelete={(id) =>
          update((current) => ({
            ...current,
            selectedId: current.selectedId === id ? "" : current.selectedId,
            conversations: current.conversations.filter((item) => item.id !== id),
          }))
        }
      />
      <p className="text-muted-foreground text-sm">
        Saved in this browser. Reload to restore titles and selection. This example stores conversation
        summaries, not message bodies.
      </p>
      <p role="status">
        Selected: {value.conversations.find((item) => item.id === value.selectedId)?.title ?? "None"}
      </p>
    </div>
  );
}
