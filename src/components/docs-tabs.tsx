"use client";

import { useSyncExternalStore, type ComponentProps, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DocsTabs({
  items,
  label = "Code examples",
  children,
  ...props
}: Pick<ComponentProps<typeof Tabs>, "value" | "onValueChange" | "defaultValue"> & {
  items: string[];
  label?: string;
  children: ReactNode;
}) {
  return (
    <Tabs className="docs-tabs not-prose" defaultValue={items[0]} {...props}>
      <TabsList aria-label={label}>
        {items.map((item) => (
          <TabsTrigger key={item} value={item}>
            {item}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

export function DocsTab({ value, children }: { value: string; children: ReactNode }) {
  return <TabsContent value={value}>{children}</TabsContent>;
}

const packageManagers = ["npm", "pnpm", "yarn", "bun"];
const preferenceEvent = "a1ui:package-manager";
let fallbackPackageManager = "pnpm";
let storageBlocked = false;

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(preferenceEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(preferenceEvent, listener);
  };
}

function getPackageManager() {
  if (storageBlocked) return fallbackPackageManager;
  try {
    const stored = localStorage.getItem("package-manager");
    return stored && packageManagers.includes(stored) ? stored : fallbackPackageManager;
  } catch {
    return fallbackPackageManager;
  }
}

export function InstallationTabs({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(subscribe, getPackageManager, () => "pnpm");

  return (
    <DocsTabs
      items={packageManagers}
      label="Package manager"
      value={stored}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        fallbackPackageManager = value;
        try {
          localStorage.setItem("package-manager", value);
        } catch {
          storageBlocked = true;
        }
        window.dispatchEvent(new Event(preferenceEvent));
      }}
    >
      {children}
    </DocsTabs>
  );
}
