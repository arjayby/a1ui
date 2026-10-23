"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = Primitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof Primitive.List>) {
  return (
    <Primitive.List
      activateOnFocus
      data-slot="tabs-list"
      className={(state) =>
        cn("ui-tabs-list", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof Primitive.Tab>) {
  return (
    <Primitive.Tab
      data-slot="tabs-trigger"
      className={(state) =>
        cn("ui-tabs-trigger", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
export function TabsContent({ className, ...props }: ComponentProps<typeof Primitive.Panel>) {
  return (
    <Primitive.Panel
      data-slot="tabs-content"
      className={(state) =>
        cn("ui-tabs-content", typeof className === "function" ? className(state) : className)
      }
      {...props}
    />
  );
}
