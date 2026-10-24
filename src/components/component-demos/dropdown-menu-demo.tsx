"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/components/dropdown-menu";

const groups = [
  {
    label: "Workspace",
    items: [
      { label: "New project", shortcut: "⇧⌘N" },
      { label: "Projects", shortcut: "⌘O" },
      { label: "Invite members", shortcut: "⇧⌘I", disabled: true },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", shortcut: "⇧⌘P" },
      { label: "Billing", shortcut: "⇧⌘B" },
      { label: "Settings", shortcut: "⌘," },
    ],
  },
];

export function DropdownMenuPreview() {
  const [action, setAction] = useState("");

  return (
    <div className="flex flex-col items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>Workspace</DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" aria-label="Workspace actions">
          {groups.map((group, index) => (
            <DropdownMenuGroup key={group.label}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuItem
                  key={item.label}
                  disabled={"disabled" in item && item.disabled}
                  label={item.label}
                  onClick={() => setAction(item.label)}
                >
                  <span>{item.label}</span>
                  <kbd
                    aria-hidden="true"
                    className="text-muted-foreground ml-auto pl-6 font-sans text-xs tracking-widest"
                  >
                    {item.shortcut}
                  </kbd>
                </DropdownMenuItem>
              ))}
              {group.label === "Workspace" && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Switch workspace</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52" aria-label="Switch workspace">
                    {["Personal workspace", "Design team", "Engineering"].map((workspace) => (
                      <DropdownMenuItem key={workspace} onClick={() => setAction(workspace)}>
                        {workspace}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span role="status" className="sr-only">
        {action ? `${action} selected` : ""}
      </span>
    </div>
  );
}

export function DropdownMenuDemo() {
  return (
    <div className="not-prose demo-frame flex min-h-80 items-center justify-center px-6 py-10">
      <DropdownMenuPreview />
    </div>
  );
}
