import { AsciiLens } from "@/registry/ascii-lens";

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
    <div className="not-prose demo-frame mx-auto max-w-3xl overflow-hidden">
      <AsciiLens src={src} alt={alt} cellSize={9} radius={104} />
      <div className="text-muted-foreground flex items-center justify-between gap-4 px-4 py-3 text-xs">
        <span>01 / CITY AT DUSK</span>
        <span>Move to reveal. Use arrow keys when focused.</span>
      </div>
    </div>
  );
}
