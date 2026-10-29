import { ogImageSize, renderOgImage } from "@/lib/og-image";

export const alt = "a1ui — Animated React components and blocks";
export const size = ogImageSize;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "Animated React UI",
    title: "Animated React components and blocks.",
    description: "Copy and paste them, or install them with your agent.",
  });
}
