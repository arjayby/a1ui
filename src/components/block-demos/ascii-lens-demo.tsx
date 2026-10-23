import { AsciiLens } from "@/registry/blocks/ascii-lens";

const src = "/images/arc-reel/city.webp";
const alt = "City buildings glowing at dusk";

export function AsciiLensPreview() {
  return (
    <div className="not-prose demo-frame flex h-full items-center justify-center overflow-hidden p-3">
      <AsciiLens src={src} alt={alt} interactive={false} cellSize={7} className="aspect-auto h-full" />
    </div>
  );
}

export function AsciiLensDemo() {
  return (
    <>
      <div className="not-prose demo-frame mx-auto max-w-3xl overflow-hidden">
        <AsciiLens src={src} alt={alt} cellSize={9} radius={104} />
      </div>
      <p className="demo-caption text-center">Move to reveal. Use arrow keys when focused.</p>
    </>
  );
}
