"use client";

import { Analytics } from "@vercel/analytics/next";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

/** Theme, search and analytics for the whole site. */
export function SiteProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <RootProvider
        theme={{ defaultTheme: "light", enableSystem: false, hotKey: false }}
        search={{ enabled: true, options: { api: "/api/search" } }}
      >
        {children}
      </RootProvider>
      {/* Analytics only reports from production builds; in development it would load a debug
          script from Vercel's CDN that the browser blocks, logging a failed request on every page. */}
      {process.env.NODE_ENV === "production" ? <Analytics /> : null}
    </>
  );
}
