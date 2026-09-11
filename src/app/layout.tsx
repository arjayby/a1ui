import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { RootProvider } from "fumadocs-ui/provider/next";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "a1ui",
    template: "%s | a1ui",
  },
  description: "A collection of React components inspired by designs found online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <RootProvider
          theme={{ defaultTheme: "light", enableSystem: false, hotKey: false }}
          search={{ enabled: true, options: { api: "/api/search" } }}
        >
          {children}
        </RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
