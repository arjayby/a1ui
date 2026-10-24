"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function DocsPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="docs-page-transition">
      {children}
    </div>
  );
}
