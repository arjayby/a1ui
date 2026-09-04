import type { ReactNode } from "react";

import { DesktopNavigation, MobileNavigation } from "@/components/site-navigation";
import { HydrationMarker } from "@/components/hydration-marker";

export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <div className="docs-shell">
      <HydrationMarker />
      <DesktopNavigation />
      <div className="docs-main">
        <MobileNavigation />
        <main>{children}</main>
      </div>
    </div>
  );
}
