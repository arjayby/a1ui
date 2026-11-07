import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { RootProvider } from "fumadocs-ui/provider/next";

import { siteDescription, siteName, siteUrl } from "@/lib/seo";

import "./globals.css";

// Pages set their own title, description, and canonical path. Open Graph and
// Twitter cards take each page's title and description from those fields.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: "Arjay Bayona", url: "https://github.com/arjayby" }],
  creator: "Arjay Bayona",
  keywords: [
    "React components",
    "animated components",
    "Motion",
    "Tailwind CSS",
    "shadcn registry",
    "UI blocks",
  ],
  openGraph: {
    type: "website",
    siteName,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <RootProvider
          theme={{ defaultTheme: "dark", enableSystem: false, hotKey: false }}
          search={{ enabled: true, options: { api: "/api/search" } }}
        >
          {children}
        </RootProvider>
        {/* Analytics only reports from production builds; in development it would load a debug
            script from Vercel's CDN that the browser blocks, logging a failed request on every page. */}
        {process.env.NODE_ENV === "production" ? <Analytics /> : null}
      </body>
    </html>
  );
}
