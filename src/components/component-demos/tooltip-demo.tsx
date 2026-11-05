"use client";

import {
  CodeIcon,
  LinkSimpleIcon,
  TextBIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  type Icon,
} from "@phosphor-icons/react";
import { Fragment, useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type TooltipContentProps,
} from "@/registry/components/tooltip";

type Tool = { label: string; hint: string; shortcut?: string; icon: Icon };

const groups: Tool[][] = [
  [
    { label: "Bold", hint: "Bold", shortcut: "⌘B", icon: TextBIcon },
    { label: "Italic", hint: "Italic", shortcut: "⌘I", icon: TextItalicIcon },
    { label: "Underline", hint: "Underline", shortcut: "⌘U", icon: TextUnderlineIcon },
    { label: "Strikethrough", hint: "Strikethrough", shortcut: "⌘⇧X", icon: TextStrikethroughIcon },
  ],
  [
    { label: "Inline code", hint: "Format as inline code", icon: CodeIcon },
    { label: "Link", hint: "Add a link to the selected text", shortcut: "⌘K", icon: LinkSimpleIcon },
  ],
];

type Mode = "glide" | "separate";
const modes: Mode[] = ["glide", "separate"];
type Side = "top" | "bottom";
const sides: Side[] = ["top", "bottom"];

const buttonClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground focus-visible:ring-ring/30 inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3 [&_svg]:size-4";

function Toolbar({ tools, side }: { tools: Tool[][]; side?: TooltipContentProps["side"] }) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="border-border bg-background flex max-w-full items-center gap-0.5 rounded-lg border p-1 shadow-xs"
    >
      {tools.map((group, index) => (
        <Fragment key={group[0].label}>
          {index > 0 && <span aria-hidden="true" className="bg-border mx-1 h-5 w-px shrink-0" />}
          {group.map((tool) => (
            <Tooltip key={tool.label}>
              <TooltipTrigger aria-label={tool.label} className={buttonClass}>
                <tool.icon aria-hidden="true" weight="bold" />
              </TooltipTrigger>
              <TooltipContent side={side}>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {tool.hint}
                  {tool.shortcut && (
                    <kbd className="text-background/60 font-sans text-[11px] tracking-wide">
                      {tool.shortcut}
                    </kbd>
                  )}
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

export function TooltipPreview() {
  return (
    <TooltipProvider delay={200}>
      <Toolbar tools={[groups[0].slice(0, 3)]} />
    </TooltipProvider>
  );
}

export function TooltipDemo() {
  const [mode, setMode] = useState<Mode>("glide");
  const [side, setSide] = useState<Side>("top");
  const [duration, setDuration] = useState(0.3);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <TooltipProvider key={`${mode}-${duration}`} glide={mode === "glide"} duration={duration}>
          <Toolbar tools={groups} side={side} />
        </TooltipProvider>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Mode" value={mode} options={modes} onChange={setMode} />
        <DemoSelect label="Side" value={side} options={sides} onChange={setSide} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
