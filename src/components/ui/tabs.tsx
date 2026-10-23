"use client";

import * as Primitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = Primitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof Primitive.List>) {
  return <Primitive.List data-slot="tabs-list" className={cn("ui-tabs-list", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger data-slot="tabs-trigger" className={cn("ui-tabs-trigger", className)} {...props} />
  );
}
export function TabsContent({ className, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content data-slot="tabs-content" className={cn("ui-tabs-content", className)} {...props} />
  );
}
