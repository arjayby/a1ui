"use client";

import {
  CalendarBlankIcon,
  KanbanIcon,
  ListBulletsIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { ToggleGroup, ToggleGroupItem, type ToggleGroupProps } from "@/registry/components/toggle-group";

type Mode = "single" | "multiple";
const modes: Mode[] = ["single", "multiple"];
type Variant = NonNullable<ToggleGroupProps["variant"]>;
const variants: Variant[] = ["muted", "outline"];

const topics = ["Design", "Engineering", "Marketing", "Sales", "Support"];

export function ToggleGroupPreview() {
  return (
    <ToggleGroup aria-label="View" defaultValue={["list"]}>
      <ToggleGroupItem value="list">List</ToggleGroupItem>
      <ToggleGroupItem value="board">Board</ToggleGroupItem>
      <ToggleGroupItem value="calendar">Calendar</ToggleGroupItem>
    </ToggleGroup>
  );
}

export function ToggleGroupDemo() {
  const [mode, setMode] = useState<Mode>("single");
  const [variant, setVariant] = useState<Variant>("muted");
  const [duration, setDuration] = useState(0.35);
  const [selected, setSelected] = useState<string[]>(["Design", "Engineering"]);
  const shared = { variant, duration };

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div
          key={`${mode}-${variant}-${duration}`}
          className="grid w-full max-w-md justify-items-center gap-4 px-4"
        >
          {mode === "single" ? (
            <>
              <ToggleGroup {...shared} aria-label="View" defaultValue={["list"]}>
                <ToggleGroupItem value="list">
                  <ListBulletsIcon aria-hidden="true" />
                  List
                </ToggleGroupItem>
                <ToggleGroupItem value="board">
                  <KanbanIcon aria-hidden="true" />
                  Board
                </ToggleGroupItem>
                <ToggleGroupItem value="calendar">
                  <CalendarBlankIcon aria-hidden="true" />
                  Calendar
                </ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup {...shared} aria-label="Text alignment" defaultValue={["left"]}>
                <ToggleGroupItem value="left" aria-label="Align left">
                  <TextAlignLeftIcon aria-hidden="true" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Align center">
                  <TextAlignCenterIcon aria-hidden="true" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Align right">
                  <TextAlignRightIcon aria-hidden="true" />
                </ToggleGroupItem>
                <ToggleGroupItem value="justify" aria-label="Justify" disabled>
                  <TextAlignJustifyIcon aria-hidden="true" />
                </ToggleGroupItem>
              </ToggleGroup>
            </>
          ) : (
            <>
              <ToggleGroup
                {...shared}
                multiple
                aria-label="Teams"
                value={selected}
                onValueChange={setSelected}
                className="justify-center"
              >
                {topics.map((topic) => (
                  <ToggleGroupItem key={topic} value={topic} disabled={topic === "Support"}>
                    {topic}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-muted-foreground text-xs tabular-nums">
                {selected.length === 0 ? "No teams selected" : `${selected.length} teams selected`}
              </p>
              <ToggleGroup {...shared} multiple aria-label="Formatting" defaultValue={["bold"]}>
                <ToggleGroupItem value="bold" aria-label="Bold">
                  <TextBIcon aria-hidden="true" />
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" aria-label="Italic">
                  <TextItalicIcon aria-hidden="true" />
                </ToggleGroupItem>
                <ToggleGroupItem value="underline" aria-label="Underline">
                  <TextUnderlineIcon aria-hidden="true" />
                </ToggleGroupItem>
              </ToggleGroup>
            </>
          )}
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Mode" value={mode} options={modes} onChange={setMode} />
        <DemoSelect label="Variant" value={variant} options={variants} onChange={setVariant} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
