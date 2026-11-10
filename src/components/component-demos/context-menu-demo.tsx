"use client";

import { useState } from "react";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/registry/components/context-menu";

const actions = [
  { label: "Open", shortcut: "⌘O" },
  { label: "Rename", shortcut: "↩" },
  { label: "Duplicate", shortcut: "⌘D" },
];

export function ContextMenuPreview() {
  const [action, setAction] = useState("");
  const [pinned, setPinned] = useState(true);
  const [shared, setShared] = useState(false);
  const [sort, setSort] = useState("name");

  return (
    <div className="flex flex-col items-center gap-4">
      <ContextMenu>
        <ContextMenuTrigger
          tabIndex={0}
          role="group"
          aria-label="Report file"
          className="border-border text-muted-foreground focus-visible:ring-ring/30 data-popup-open:bg-muted/50 flex h-36 w-64 max-w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm transition-[scale,background-color] duration-150 outline-none select-none focus-visible:ring-3 data-pressing:scale-[0.98] motion-reduce:transition-none"
        >
          <span className="text-foreground font-medium pointer-coarse:hidden">Right-click here</span>
          <span className="text-foreground hidden font-medium pointer-coarse:inline">
            Press and hold here
          </span>
          <span className="text-xs pointer-coarse:hidden">or focus it and press Shift F10</span>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52" aria-label="File actions">
          {actions.map((item) => (
            <ContextMenuItem key={item.label} inset label={item.label} onClick={() => setAction(item.label)}>
              {item.label}
              <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>
            </ContextMenuItem>
          ))}
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>Share</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40" aria-label="Share">
              {["Copy link", "Email", "Messages"].map((target) => (
                <ContextMenuItem key={target} onClick={() => setAction(target)}>
                  {target}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>
            Pin to sidebar
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={shared} onCheckedChange={setShared}>
            Share with team
          </ContextMenuCheckboxItem>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuLabel inset>Sort by</ContextMenuLabel>
            <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
              <ContextMenuRadioItem value="name">Name</ContextMenuRadioItem>
              <ContextMenuRadioItem value="modified">Date modified</ContextMenuRadioItem>
              <ContextMenuRadioItem value="size">Size</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuItem
            inset
            disabled
            label="Move to archive"
            onClick={() => setAction("Move to archive")}
          >
            Move to archive
          </ContextMenuItem>
          <ContextMenuItem inset label="Delete" onClick={() => setAction("Delete")}>
            Delete
            <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <span role="status" className="sr-only">
        {action ? `${action} selected` : ""}
      </span>
    </div>
  );
}

export function ContextMenuDemo() {
  return (
    <div className="not-prose demo-frame flex min-h-80 items-center justify-center px-6 py-10">
      <ContextMenuPreview />
    </div>
  );
}
