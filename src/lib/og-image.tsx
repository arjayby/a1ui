import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { siteUrl } from "@/lib/seo";

export const ogImageSize = { width: 1200, height: 630 };

// Endless (Regular only) sets the wordmark, title and description; JetBrains Mono 500 sets the mono labels.
const fontDirectory = join(process.cwd(), "public/fonts/stipple");
const [endless, mono] = await Promise.all([
  readFile(join(fontDirectory, "endless-400.ttf")),
  readFile(join(fontDirectory, "jetbrains-mono-500.ttf")),
]);

// Stipple colours (Paper theme) from docs/stipple/tokens.json.
const paper = "#ece9df";
const ink = "#2a261f";
const inkFaint = "#6a665c";
const cobaltInk = "#3444da";

// The mono-label style: JetBrains Mono 500, uppercase, tracked 0.12em, in ink-faint.
const monoLabel = {
  fontFamily: "JetBrains Mono",
  fontWeight: 500,
  fontSize: 20,
  letterSpacing: "0.12em",
  color: inkFaint,
  textTransform: "uppercase",
} as const;

// Endless covers basic Latin only, so typographic punctuation is set as its ASCII form.
const asciiForms: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
  "\u00b7": "/",
  "\u00a0": " ",
};
const inEndless = (text: string) =>
  text.replace(/[\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u00b7\u00a0]/g, (c) => asciiForms[c]);

// The brand mark from src/app/icon.svg.
export const brandMarkPath =
  "M108 0c11.046 0 20 8.954 20 20l.007-.517C128.281 8.676 137.127 0 148 0h88c11.046 0 20 8.954 20 20v88c0 11.046-8.954 20-20 20 11.046 0 20 8.954 20 20v88c0 11.046-8.954 20-20 20h-88c-11.046 0-20-8.954-20-20 0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20v-88c0-10.873 8.676-19.719 19.483-19.993L20 128c-11.046 0-20-8.954-20-20V20C0 8.954 8.954 0 20 0Zm20 64c0 35.346-28.654 64-64 64 35.346 0 64 28.654 64 64 0-35.346 28.654-64 64-64-35.346 0-64-28.654-64-64";

export function renderOgImage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: paper,
        color: ink,
        fontFamily: "Endless",
      }}
    >
      {/* The wordmark: uppercase, tracked 0.14em, in cobalt-ink. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 36,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: cobaltInk,
        }}
      >
        <svg width="44" height="44" viewBox="0 0 256 256" fill={cobaltInk}>
          <path d={brandMarkPath} />
        </svg>
        a1ui
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ ...monoLabel, display: "flex" }}>{eyebrow}</div>
        <div style={{ fontSize: 88, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{inEndless(title)}</div>
        <div style={{ fontSize: 32, lineHeight: 1.4, color: inkFaint, maxWidth: 960 }}>
          {inEndless(description)}
        </div>
      </div>
      <div style={{ ...monoLabel, display: "flex" }}>{new URL(siteUrl).host}</div>
    </div>,
    {
      ...ogImageSize,
      fonts: [
        { name: "Endless", data: endless, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
