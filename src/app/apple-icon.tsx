import { ImageResponse } from "next/og";

import { brandMarkPath } from "@/lib/og-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home screens and some search and chat previews ignore SVG icons and look for this PNG.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#101010",
      }}
    >
      <svg width="100" height="100" viewBox="0 0 256 256" fill="#f2f2ee">
        <path d={brandMarkPath} />
      </svg>
    </div>,
    size,
  );
}
