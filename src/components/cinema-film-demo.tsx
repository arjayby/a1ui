import type { CSSProperties } from "react";

import { CinemaFilm, type CinemaFilmItem } from "@/registry/cinema-film";

const providers: CinemaFilmItem[] = [
  { id: "openai", name: "OpenAI" },
  { id: "elevenlabs", name: "ElevenLabs" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "mistral", name: "Mistral AI" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "runway", name: "Runway" },
  { id: "cohere", name: "Cohere" },
  { id: "xai", name: "xAI" },
];

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
