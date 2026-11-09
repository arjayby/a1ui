import type { Metadata } from "next";
import Link from "next/link";

import "./landing.css";

// Without this file Next.js renders its own 404 body, which adds a second <title> to the page.
// Next.js marks the page noindex on its own.
export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="landing landing-single">
      <article className="landing-card">
        <h1>Page not found</h1>
        <p>This page doesn’t exist or has moved.</p>
        <footer className="landing-card-footer">
          <span>404</span>
          <span className="landing-card-links">
            <Link href="/components">Components</Link>
            <Link href="/blocks">Blocks</Link>
          </span>
        </footer>
      </article>
    </main>
  );
}
