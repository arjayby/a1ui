import Image from "next/image";
import type { CSSProperties } from "react";

import { ArcReel, type ArcReelItem } from "@/registry/blocks/arc-reel";

function ReelArtwork({ scene, eager = false }: { scene: string; eager?: boolean }) {
  return (
    <div aria-hidden="true" className="arc-reel-artwork">
      <Image
        src={`/images/arc-reel/${scene}.webp`}
        alt=""
        fill
        sizes="(max-width: 640px) 200px, 320px"
        loading={eager ? "eager" : "lazy"}
        className="object-cover"
        draggable={false}
      />
    </div>
  );
}

const scenes = [
  { id: "openai", name: "OpenAI", scene: "astral" },
  { id: "elevenlabs", name: "ElevenLabs", scene: "sound-wave" },
  { id: "anthropic", name: "Anthropic", scene: "porsche-garage" },
  { id: "google", name: "Google", scene: "city" },
  { id: "mistral", name: "Mistral AI", scene: "railway" },
  { id: "deepseek", name: "DeepSeek", scene: "deep-ocean" },
  { id: "runway", name: "Runway", scene: "airport-runway" },
  { id: "cohere", name: "Cohere", scene: "library" },
  { id: "xai", name: "xAI", scene: "radio-telescope" },
];

// Previews sit further down the landing and catalog pages, so their artwork loads lazily. On the
// block's own page the reel is above the fold and its cards are the largest paint, so load eagerly.
const reel = (eager: boolean): ArcReelItem[] =>
  scenes.map(({ scene, ...provider }) => ({
    ...provider,
    artwork: <ReelArtwork scene={scene} eager={eager} />,
  }));
const providers = reel(false);
const eagerProviders = reel(true);

export function ArcReelPreview() {
  return (
    <ArcReel
      items={providers}
      initialIndex={2}
      className="h-full"
      style={
        {
          "--arc-reel-card-width": "7.25rem",
          "--arc-reel-stage-padding": "1rem",
          "--arc-reel-name-size": "0.625rem",
          "--arc-reel-gap": "1rem",
          "--arc-reel-controls-padding": "0rem",
        } as CSSProperties
      }
    />
  );
}

export function ArcReelDemo() {
  return (
    <>
      <div className="not-prose demo-frame">
        <ArcReel items={eagerProviders} initialIndex={3} ariaLabel="AI provider arc reel" />
      </div>
      <p className="demo-caption text-center">
        Drag left or right. Use the arrows or scrub the line below to move through the providers.
      </p>
    </>
  );
}
