import type { Metadata } from "next";
import { RootProvider } from "fumadocs-ui/provider/next";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "a1ui",
    template: "%s | a1ui",
  },
  description: "Original React components built to be copied, changed, and shipped.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <RootProvider theme={{ enabled: false }} search={{ enabled: true, options: { api: "/api/search" } }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
