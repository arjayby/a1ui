"use client";

import { Box, FlaskConical, Globe, LockKeyhole } from "lucide-react";
import { useState } from "react";

import { SelectMenu, type SelectMenuOption } from "@/registry/select-menu";

const environments: SelectMenuOption[] = [
  {
    value: "production",
    label: "Production",
    description: "Visible to everyone",
    icon: <Globe />,
    shortcut: "1",
  },
  {
    value: "staging",
    label: "Staging",
    description: "Review changes with your team",
    icon: <FlaskConical />,
    shortcut: "2",
  },
  {
    value: "development",
    label: "Development",
    description: "Your local workspace",
    icon: <Box />,
    shortcut: "3",
  },
  {
    value: "archived",
    label: "Archived",
    description: "This environment is read-only",
    icon: <LockKeyhole />,
    shortcut: "4",
    disabled: true,
  },
];

export function SelectMenuPreview() {
  return (
    <div className="not-prose demo-frame select-menu-preview">
      <span className="text-muted-foreground text-[10px]">Environment</span>
      <SelectMenu
        options={environments}
        value="production"
        onValueChange={() => {}}
        ariaLabel="Preview environment"
        className="w-full"
      />
      <SelectMenu
        options={environments}
        value="staging"
        onValueChange={() => {}}
        ariaLabel="Preview staging"
        variant="ghost"
        className="w-full"
      />
    </div>
  );
}

export function SelectMenuDemo() {
  const [value, setValue] = useState("production");
  return (
    <>
      <div className="not-prose demo-frame select-menu-demo">
        <div className="flex w-full max-w-xs flex-col gap-3">
          <label htmlFor="environment-demo" className="text-muted-foreground text-[11px]">
            Environment
          </label>
          <SelectMenu
            id="environment-demo"
            options={environments}
            value={value}
            onValueChange={setValue}
            ariaLabel="Environment"
            className="w-full"
          />
          <span role="status" className="text-muted-foreground text-[10px]">
            Selected: {environments.find((option) => option.value === value)?.label}
          </span>
        </div>
      </div>
      <p className="demo-caption">
        Open the menu and press 1, 2, or 3 to select an environment. Arrow keys and typing a name also work.
        Escape closes the menu.
      </p>
    </>
  );
}
