"use client";

import { useState } from "react";

import { DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import { Lightbox, type LightboxImage } from "@/registry/components/lightbox";

// Generated artwork, exported as 768 × 768 WebP files.
const images: LightboxImage[] = [
  { name: "chrome-bloom", alt: "A four-petal chrome flower on a violet haze", caption: "Chrome bloom" },
  {
    name: "iridescent-film",
    alt: "Folds of iridescent film shifting from pink to green",
    caption: "Iridescent film",
  },
  {
    name: "distorted-fox",
    alt: "A red fox in profile, its fur streaking into motion blur",
    caption: "Fox in motion",
  },
  { name: "glass-hare", alt: "A white hare sculpted from glass against deep blue", caption: "Glass hare" },
  { name: "coral-fan", alt: "An orange sea fan beside pale branching coral", caption: "Coral fan" },
  { name: "sand-dunes", alt: "Sand dunes rolling under a golden evening sky", caption: "Dunes at dusk" },
].map(({ name, ...image }) => ({ src: `/images/lightbox/${name}.webp`, width: 768, height: 768, ...image }));

const sets = { gallery: images, single: images.slice(0, 1) } satisfies Record<string, LightboxImage[]>;

export function LightboxPreview() {
  return <Lightbox images={images.slice(0, 3)} className="w-48" />;
}

export function LightboxDemo() {
  const [set, setSet] = useState<keyof typeof sets>("gallery");
  const [showArrows, setShowArrows] = useState(true);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="w-full max-w-sm px-4">
          <Lightbox
            key={set}
            images={sets[set]}
            showArrows={showArrows}
            className={set === "single" ? "mx-auto max-w-40 grid-cols-1" : undefined}
          />
        </div>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Images" value={set} options={["gallery", "single"]} onChange={setSet} />
        <DemoSwitch label="Arrow buttons" checked={showArrows} onChange={setShowArrows} />
      </div>
    </div>
  );
}
