"use client";

import { useState } from "react";

import { DemoSelect } from "@/components/component-demos/demo-controls";
import { MenuGlyph, type MenuGlyphShape } from "@/components/component-demos/menu-glyphs";
import { Menu, MenuItem, type MenuIndicator } from "@/registry/components/menu";

const items: { value: string; label: string; shape: MenuGlyphShape }[] = [
  { value: "overview", label: "Overview", shape: "dome" },
  { value: "projects", label: "Projects", shape: "bloom" },
  { value: "analytics", label: "Analytics", shape: "shell" },
  { value: "settings", label: "Settings", shape: "cog" },
];

const indicatorOptions: MenuIndicator[] = ["dot", "fill", "muted"];

export function MenuPreview({ indicator = "dot" }: { indicator?: MenuIndicator }) {
  const [value, setValue] = useState("overview");

  return (
    <Menu
      value={value}
      indicator={indicator}
      role="group"
      aria-label="Workspace views"
      className="bg-popover text-popover-foreground flex w-56 flex-col gap-1 rounded-xl border p-1.5 shadow-sm"
    >
      {items.map(({ value: itemValue, label, shape }) => (
        <MenuItem
          key={itemValue}
          value={itemValue}
          aria-pressed={value === itemValue}
          onClick={() => setValue(itemValue)}
          // The dot sits in the row's left padding, so dotted rows start a little further in.
          className={`text-muted-foreground focus-visible:ring-ring flex h-10 items-center gap-3 pr-3 text-xs outline-none focus-visible:ring-2 ${
            indicator === "dot"
              ? "data-highlighted:text-foreground pl-5"
              : indicator === "fill"
                ? "pl-3"
                : "data-highlighted:text-foreground pl-3"
          }`}
        >
          <MenuGlyph shape={shape} className="size-5 shrink-0" />
          <span>{label}</span>
        </MenuItem>
      ))}
    </Menu>
  );
}

export function MenuDemo() {
  const [indicator, setIndicator] = useState<MenuIndicator>("dot");

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage min-h-80">
        <MenuPreview indicator={indicator} />
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Indicator" value={indicator} options={indicatorOptions} onChange={setIndicator} />
      </div>
    </div>
  );
}
