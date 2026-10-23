import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { DocsHeader } from "@/components/site-navigation";
import { HydrationMarker } from "@/components/hydration-marker";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="docs-shell">
      <HydrationMarker />
      <AppSidebar />
      <SidebarInset className="docs-main md:ring-border min-w-0 md:ring-1">
        <DocsHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
