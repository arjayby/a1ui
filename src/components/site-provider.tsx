"use client";

import { Analytics } from "@vercel/analytics/next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Theme, search and analytics for the whole site. The framed catalog previews under
 * /preview are one demo each inside a card: they take the theme, leave the search dialog
 * out, and are not counted as page views.
 */
export function SiteProvider({ children }: { children: ReactNode }) {
  const framed = usePathname().startsWith("/preview/");

  return (
    <>
      <RootProvider
        theme={{ defaultTheme: "light", enableSystem: false, hotKey: false }}
        search={framed ? { enabled: false } : { enabled: true, options: { api: "/api/search" } }}
      >
        {children}
      </RootProvider>
      {/* Analytics only reports from production builds; in development it would load a debug
          script from Vercel's CDN that the browser blocks, logging a failed request on every page. */}
      {process.env.NODE_ENV === "production" && !framed ? <Analytics /> : null}
    </>
  );
}
