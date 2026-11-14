"use client";

import {
  BookOpenIcon,
  BuildingsIcon,
  ChatCircleIcon,
  CopyIcon,
  CubeIcon,
  KeyboardIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  SquaresFourIcon,
  SunIcon,
  TrashIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { useTheme } from "fumadocs-ui/provider/base";
import { useEffect, useMemo, useState } from "react";

import { CommandPalette, type CommandPaletteItem } from "@/registry/blocks/command-palette";

function useDemoItems(): CommandPaletteItem[] {
  const { setTheme } = useTheme();

  return useMemo(
    () => [
      {
        id: "components",
        group: "Go to",
        label: "Components",
        description: "Animated building blocks for forms, menus, and overlays",
        keywords: ["ui", "library"],
        icon: <CubeIcon />,
        shortcut: ["G", "C"],
      },
      {
        id: "blocks",
        group: "Go to",
        label: "Blocks",
        description: "Ready-made compositions",
        keywords: ["sections", "templates"],
        icon: <SquaresFourIcon />,
        shortcut: ["G", "B"],
      },
      {
        id: "docs",
        group: "Go to",
        label: "Documentation",
        description: "Installation and agent setup",
        keywords: ["guide", "help", "readme"],
        icon: <BookOpenIcon />,
        shortcut: ["G", "D"],
      },
      {
        id: "new-project",
        group: "Actions",
        label: "New project",
        keywords: ["create", "add"],
        icon: <PlusIcon />,
        shortcut: ["⌘", "N"],
      },
      {
        id: "copy-install",
        group: "Actions",
        label: "Copy install command",
        description: "pnpm dlx shadcn@latest add",
        keywords: ["cli", "shadcn", "clipboard"],
        icon: <CopyIcon />,
      },
      {
        id: "invite",
        group: "Actions",
        label: "Invite a teammate",
        keywords: ["share", "member", "people"],
        icon: <UserPlusIcon />,
      },
      {
        id: "theme",
        group: "Actions",
        label: "Change theme",
        description: "Switch this site between light and dark",
        keywords: ["appearance", "color", "mode"],
        icon: <PaletteIcon />,
        children: [
          { id: "light", label: "Light", icon: <SunIcon />, onSelect: () => setTheme("light") },
          { id: "dark", label: "Dark", icon: <MoonIcon />, onSelect: () => setTheme("dark") },
        ],
      },
      {
        id: "workspace",
        group: "Actions",
        label: "Switch workspace",
        keywords: ["team", "organization", "account"],
        icon: <BuildingsIcon />,
        children: ["Acme", "Globex", "Initech", "Umbrella", "Hooli"].map((name) => ({
          id: name.toLowerCase(),
          group: "Workspaces",
          label: name,
          icon: <BuildingsIcon />,
        })),
      },
      {
        id: "delete-project",
        group: "Actions",
        label: "Delete project",
        description: "Only owners can delete",
        icon: <TrashIcon />,
        disabled: true,
      },
      {
        id: "shortcuts",
        group: "Help",
        label: "Keyboard shortcuts",
        keywords: ["keys", "hotkeys", "bindings"],
        icon: <KeyboardIcon />,
        shortcut: ["?"],
      },
      {
        id: "feedback",
        group: "Help",
        label: "Send feedback",
        keywords: ["contact", "support", "bug"],
        icon: <ChatCircleIcon />,
      },
    ],
    [setTheme],
  );
}

export function CommandPaletteDemo() {
  const items = useDemoItems();
  const [last, setLast] = useState<string | null>(null);

  // The site search listens for the same shortcut on the window. On this page it belongs to the demo.
  useEffect(() => {
    const claim = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) event.stopPropagation();
    };
    document.addEventListener("keydown", claim);
    return () => document.removeEventListener("keydown", claim);
  }, []);

  return (
    <>
      <div className="not-prose demo-frame">
        <div className="component-demo-stage flex-col gap-4">
          <CommandPalette items={items} onSelect={(item) => setLast(item.label)} />
          <p role="status" className="text-muted-foreground m-0 min-h-5 text-xs">
            {last ? `Ran “${last}”` : "Nothing run yet"}
          </p>
        </div>
      </div>
      <p className="demo-caption text-center">
        Press the button, or ⌘K (Ctrl+K on Windows and Linux). Type to filter, use the arrow keys, and open
        Change theme for a nested list.
      </p>
    </>
  );
}
