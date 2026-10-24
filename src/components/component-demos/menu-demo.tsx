"use client";

import { ChartBarIcon, FolderIcon, GearIcon, HouseIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Menu, MenuItem } from "@/registry/components/menu";

const items = [
  { value: "overview", label: "Overview", icon: HouseIcon },
  { value: "projects", label: "Projects", icon: FolderIcon },
  { value: "analytics", label: "Analytics", icon: ChartBarIcon },
  { value: "settings", label: "Settings", icon: GearIcon },
];

export function MenuPreview() {
  const [value, setValue] = useState("overview");

  return (
    <Menu
      value={value}
      role="group"
      aria-label="Workspace views"
      className="bg-popover text-popover-foreground flex w-56 flex-col gap-1 rounded-xl border p-1.5 shadow-sm"
    >
      {items.map(({ value: itemValue, label, icon: Icon }) => (
        <MenuItem
          key={itemValue}
          value={itemValue}
          aria-pressed={value === itemValue}
          onClick={() => setValue(itemValue)}
          className="text-muted-foreground focus-visible:ring-ring data-highlighted:text-foreground flex h-10 items-center gap-3 px-3 text-sm outline-none focus-visible:ring-2"
        >
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
        </MenuItem>
      ))}
    </Menu>
  );
}

export function MenuDemo() {
  return (
    <div className="not-prose demo-frame flex min-h-80 flex-col items-center justify-center gap-6 px-6 py-10">
      <MenuPreview />
    </div>
  );
}
