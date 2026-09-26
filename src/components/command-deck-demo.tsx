"use client";

import { ArrowUpRight, Grid2X2, MoonStar } from "lucide-react";
import { useState } from "react";

import { CommandDeck, type CommandDeckAction } from "@/registry/command-deck";

const actions: readonly CommandDeckAction[] = [
  { id: "components", label: "Open components", icon: <ArrowUpRight />, shortcut: "G C" },
  { id: "categories", label: "Browse categories", icon: <Grid2X2 />, shortcut: "G B" },
  { id: "appearance", label: "Toggle appearance", icon: <MoonStar />, shortcut: "T" },
];

export function CommandDeckPreview() {
  return (
    <div className="not-prose demo-frame flex min-h-52 items-center justify-center p-4">
      <CommandDeck actions={actions} />
    </div>
  );
}

export function CommandDeckDemo() {
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <>
      <div className="not-prose demo-frame flex min-h-72 items-center justify-center p-4">
        <CommandDeck
          actions={actions}
          onAction={(action) => setLastAction(action.label)}
          enableGlobalShortcut
        />
      </div>
      <p className="demo-caption">
        Press Command/Ctrl+K to focus the search. Use the arrow keys and Enter to choose an action. Escape
        clears the search, then leaves the input. {lastAction ? `Last action: ${lastAction}.` : ""}
      </p>
    </>
  );
}
