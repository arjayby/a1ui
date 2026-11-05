"use client";

import {
  CalculatorIcon,
  CalendarBlankIcon,
  CreditCardIcon,
  GearIcon,
  MoonIcon,
  SmileyIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  type CommandProps,
} from "@/registry/components/command";

type Match = "words" | "prefix";
const matches: Match[] = ["words", "prefix"];
const prefixFilter: CommandProps["filter"] = (value, search, keywords = []) =>
  [value, ...keywords].some((text) => text.toLowerCase().startsWith(search.trim().toLowerCase()));

type Entry = { value: string; icon: ReactNode; keywords?: string[]; shortcut?: string };
const groups: { heading: string; items: Entry[] }[] = [
  {
    heading: "Suggestions",
    items: [
      { value: "Calendar", icon: <CalendarBlankIcon />, keywords: ["schedule", "events"] },
      { value: "Search emoji", icon: <SmileyIcon />, keywords: ["emoticon"] },
      { value: "Calculator", icon: <CalculatorIcon />, keywords: ["math"] },
      { value: "Toggle dark mode", icon: <MoonIcon />, keywords: ["theme"], shortcut: "⌘D" },
    ],
  },
  {
    heading: "Settings",
    items: [
      { value: "Profile", icon: <UserIcon />, keywords: ["account"], shortcut: "⌘P" },
      { value: "Billing", icon: <CreditCardIcon />, keywords: ["invoice", "payment"], shortcut: "⌘B" },
      { value: "Preferences", icon: <GearIcon />, keywords: ["settings"], shortcut: "⌘," },
    ],
  },
];

function Palette({ duration, filter, onSelect }: Pick<CommandProps, "duration" | "filter" | "onSelect">) {
  return (
    <Command duration={duration} filter={filter} onSelect={onSelect}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem key={item.value} value={item.value} keywords={item.keywords}>
                {item.icon}
                <span>{item.value}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

export function CommandPreview() {
  return (
    <div className="w-64">
      <Command>
        <CommandInput placeholder="Search…" />
        <CommandList>
          <CommandGroup heading="Suggestions">
            <CommandItem value="Calendar">
              <CalendarBlankIcon />
              Calendar
            </CommandItem>
            <CommandItem value="Profile">
              <UserIcon />
              Profile
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

export function CommandDemo() {
  const [match, setMatch] = useState<Match>("words");
  const [duration, setDuration] = useState(0.3);
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState<string | null>(null);
  const filter = match === "prefix" ? prefixFilter : undefined;

  return (
    <div className="not-prose demo-frame">
      {/* Inline style: the stage's global CSS outranks layered utilities. */}
      <div className="component-demo-stage" style={{ minHeight: "30rem", alignItems: "flex-start" }}>
        {/* Controls sit above the palette so the page stays put while results shrink. */}
        <div key={`${match}-${duration}`} className="grid w-full max-w-sm gap-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs" aria-live="polite" data-slot="command-demo-result">
              {ran ? `Ran “${ran}”` : "Pick a command"}
            </p>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              Press ⌘K
            </Button>
          </div>
          <Palette duration={duration} filter={filter} onSelect={setRan} />
          <CommandDialog open={open} onOpenChange={setOpen} shortcut duration={duration}>
            <Palette duration={duration} filter={filter} onSelect={setRan} />
          </CommandDialog>
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Match" value={match} options={matches} onChange={setMatch} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
