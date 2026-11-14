"use client";

import { EnvelopeSimpleIcon, EnvelopeSimpleOpenIcon, PushPinIcon, TrashIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import { SwipeRow, SwipeRowGroup, type SwipeRowAction } from "@/registry/components/swipe-row";

interface Message {
  id: string;
  from: string;
  subject: string;
  time: string;
  unread: boolean;
  pinned: boolean;
}

const inbox: Message[] = [
  {
    id: "registry",
    from: "Registry",
    subject: "54 items built and ready to install",
    time: "9:41",
    unread: true,
  },
  {
    id: "draft",
    from: "Arjay Bayona",
    subject: "Swipe Row docs, ready for review",
    time: "8:12",
    unread: true,
  },
  {
    id: "tests",
    from: "Test suite",
    subject: "All component tests passed",
    time: "Mon",
    unread: false,
  },
  {
    id: "ideas",
    from: "Arjay Bayona",
    subject: "Ideas for the next block",
    time: "Sun",
    unread: false,
  },
].map((message) => ({ ...message, pinned: false }));

const sideOptions = ["both", "trailing", "leading"] as const;

function MessageRow({ message }: { message: Message }) {
  return (
    <div className="bg-card text-foreground flex items-center gap-3 px-4 py-3 text-sm">
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ${message.unread ? "bg-chart-3" : "bg-transparent"}`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{message.from}</span>
          {message.pinned && <PushPinIcon aria-label="Pinned" weight="fill" className="size-3 shrink-0" />}
        </span>
        <span className="text-muted-foreground block truncate">{message.subject}</span>
      </span>
      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">{message.time}</span>
    </div>
  );
}

function useInbox() {
  const [messages, setMessages] = useState(inbox);
  const update = (id: string, patch: Partial<Message>) =>
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );

  return {
    messages,
    reset: () => setMessages(inbox),
    leading: (message: Message): SwipeRowAction[] => [
      {
        label: message.unread ? "Read" : "Unread",
        icon: message.unread ? (
          <EnvelopeSimpleOpenIcon aria-hidden="true" />
        ) : (
          <EnvelopeSimpleIcon aria-hidden="true" />
        ),
        tone: "primary",
        onAction: () => update(message.id, { unread: !message.unread }),
      },
    ],
    trailing: (message: Message): SwipeRowAction[] => [
      {
        label: "Delete",
        icon: <TrashIcon aria-hidden="true" />,
        tone: "destructive",
        removesRow: true,
        onAction: () => setMessages((current) => current.filter(({ id }) => id !== message.id)),
      },
      {
        label: message.pinned ? "Unpin" : "Pin",
        icon: <PushPinIcon aria-hidden="true" />,
        onAction: () => update(message.id, { pinned: !message.pinned }),
      },
    ],
  };
}

export function SwipeRowDemo() {
  const { messages, reset, leading, trailing } = useInbox();
  const [sides, setSides] = useState<(typeof sideOptions)[number]>("both");
  const [fullSwipe, setFullSwipe] = useState(true);
  const reducedMotion = useReducedMotion();

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="flex min-h-64 w-full max-w-sm flex-col justify-center">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">
              No messages. Reset to bring them back.
            </p>
          ) : (
            <SwipeRowGroup
              aria-label="Inbox"
              className="border-border divide-border divide-y overflow-hidden rounded-xl border"
            >
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  // The list closes the gap a deleted row leaves; with reduced motion it only fades.
                  <motion.div
                    key={message.id}
                    className="overflow-hidden"
                    exit={reducedMotion ? { opacity: 0 } : { height: 0 }}
                    transition={
                      reducedMotion ? { duration: 0.2 } : { type: "spring", bounce: 0, duration: 0.4 }
                    }
                  >
                    <SwipeRow
                      leading={sides === "trailing" ? undefined : leading(message)}
                      trailing={sides === "leading" ? undefined : trailing(message)}
                      fullSwipe={fullSwipe}
                    >
                      <MessageRow message={message} />
                    </SwipeRow>
                  </motion.div>
                ))}
              </AnimatePresence>
            </SwipeRowGroup>
          )}
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Actions" value={sides} options={sideOptions} onChange={setSides} />
        <DemoSwitch label="Full swipe" checked={fullSwipe} onChange={setFullSwipe} />
        <div className="component-demo-control">
          <span>Rows</span>
          <Button variant="outline" size="sm" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
