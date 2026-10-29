import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { siteUrl } from "@/lib/seo";

export const ogImageSize = { width: 1200, height: 630 };

const fontDirectory = join(process.cwd(), "public/fonts/graphite");
const [headingFont, bodyFont, monoFont] = await Promise.all([
  readFile(join(fontDirectory, "stack-sans-notch-500.ttf")),
  readFile(join(fontDirectory, "inter-400.ttf")),
  readFile(join(fontDirectory, "dm-mono-400.ttf")),
]);

// The brand mark from src/app/icon.svg.
const brandMarkPath =
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
        background: "#101010",
        color: "#f2f2ee",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: "Stack Sans Notch",
          fontSize: 36,
        }}
      >
        <svg width="44" height="44" viewBox="0 0 256 256" fill="#f2f2ee">
          <path d={brandMarkPath} />
        </svg>
        a1ui
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontFamily: "DM Mono", fontSize: 26, color: "#a3a39e", textTransform: "uppercase" }}>
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: "Stack Sans Notch",
            fontSize: 88,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 32, lineHeight: 1.4, color: "#a3a39e", maxWidth: 960 }}>{description}</div>
      </div>
      <div style={{ display: "flex", fontFamily: "DM Mono", fontSize: 24, color: "#a3a39e" }}>
        {new URL(siteUrl).host}
      </div>
    </div>,
    {
      ...ogImageSize,
      fonts: [
        { name: "Stack Sans Notch", data: headingFont, weight: 500, style: "normal" },
        { name: "Inter", data: bodyFont, weight: 400, style: "normal" },
        { name: "DM Mono", data: monoFont, weight: 400, style: "normal" },
      ],
    },
  );
}
