import type { Metadata } from "next";

import { SiteProvider } from "@/components/site-provider";
import { author, sharedOpenGraph, siteDescription, siteName, siteUrl } from "@/lib/seo";

import "./globals.css";

// Pages set their own title, description, canonical path, and Open Graph URL through
// pageMetadata in lib/seo.tsx. Open Graph and Twitter cards take each page's title and
// description from those fields.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [author],
  creator: author.name,
  keywords: [
    "React components",
    "animated components",
    "Motion",
    "Tailwind CSS",
    "shadcn registry",
    "UI blocks",
    "React animation",
    "copy and paste components",
  ],
  openGraph: sharedOpenGraph,
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <SiteProvider>{children}</SiteProvider>
      </body>
    </html>
  );
}
