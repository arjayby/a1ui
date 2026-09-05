import Image from "next/image";
import type { CSSProperties } from "react";

import { CinemaFilm, type CinemaFilmItem } from "@/registry/cinema-film";

function FilmArtwork({ scene }: { scene: string }) {
  return (
    <div aria-hidden="true" className="cinema-film-artwork">
      <Image
        src={`/images/cinema-film/${scene}.webp`}
        alt=""
        fill
        sizes="(max-width: 640px) 200px, 320px"
        className="object-cover"
        draggable={false}
      />
    </div>
  );
}

const providers: CinemaFilmItem[] = [
  { id: "openai", name: "OpenAI", scene: "astral" },
  { id: "elevenlabs", name: "ElevenLabs", scene: "sound-wave" },
  { id: "anthropic", name: "Anthropic", scene: "porsche-garage" },
  { id: "google", name: "Google", scene: "city" },
  { id: "mistral", name: "Mistral AI", scene: "railway" },
  { id: "deepseek", name: "DeepSeek", scene: "deep-ocean" },
  { id: "runway", name: "Runway", scene: "airport-runway" },
  { id: "cohere", name: "Cohere", scene: "library" },
  { id: "xai", name: "xAI", scene: "radio-telescope" },
].map(({ scene, ...provider }) => ({ ...provider, artwork: <FilmArtwork scene={scene} /> }));

export function CinemaFilmPreview() {
  return (
    <CinemaFilm
      items={providers}
      initialIndex={2}
      className="h-full"
      style={
        {
          "--film-card-width": "7.25rem",
          "--film-stage-padding": "1rem",
          "--film-name-size": "0.625rem",
          "--film-gap": "1rem",
          "--film-controls-padding": "0rem",
        } as CSSProperties
      }
    />
  );
}

export function CinemaFilmDemo() {
  return (
    <>
      <div className="demo-frame">
        <CinemaFilm items={providers} initialIndex={3} ariaLabel="AI provider cinema film" />
      </div>
      <p className="demo-caption">
        Drag left or right. Use the arrows or scrub the line below to move through the providers.
      </p>
    </>
  );
}
