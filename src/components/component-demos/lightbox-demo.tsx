"use client";

import { useState } from "react";

import { DemoSelect, DemoSwitch } from "@/components/component-demos/demo-controls";
import { Lightbox, type LightboxImage } from "@/registry/components/lightbox";

type Scene = {
  alt: string;
  caption: string;
  width: number;
  height: number;
  sky: [string, string];
  sun: string;
  ridges: string[];
};

// Drawn locally as SVG so the demo never depends on a remote image.
function draw({ width, height, sky, sun, ridges }: Scene) {
  // A fixed pseudo-random scatter, so the picture is the same on the server and in the browser.
  const scatter = (seed: number) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };
  const stars = Array.from({ length: 60 }, (_, i) => {
    const x = Math.round(scatter(i + 1) * width);
    const y = Math.round(scatter(i + 101) * height * 0.5);
    const opacity = (0.25 + scatter(i + 201) * 0.5).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#fff" opacity="${opacity}"/>`;
  }).join("");
  const hills = ridges
    .map((fill, layer) => {
      const base = height * (0.52 + layer * 0.13);
      const swell = height * (0.09 - layer * 0.015);
      const points = Array.from({ length: 25 }, (_, i) => {
        const x = (i / 24) * width;
        const y =
          base -
          Math.sin(i * (0.55 + layer * 0.21) + layer * 2) * swell -
          Math.sin(i * 1.7 + layer) * swell * 0.3;
        return `${x.toFixed(0)},${y.toFixed(0)}`;
      });
      return `<polygon points="0,${height} ${points.join(" ")} ${width},${height}" fill="${fill}"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#s)"/>${stars}<circle cx="${width * 0.68}" cy="${height * 0.34}" r="${Math.min(width, height) * 0.09}" fill="${sun}"/>${hills}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const scenes: Scene[] = [
  {
    alt: "Blue ridges under a pale morning sun",
    caption: "First light over the northern ridge",
    width: 1800,
    height: 1200,
    sky: ["#1d2b53", "#f2b880"],
    sun: "#ffe9c4",
    ridges: ["#51618f", "#38466f", "#232c4b", "#141a2e"],
  },
  {
    alt: "Tall pine-green hills at dusk",
    caption: "The valley trail, an hour before dark",
    width: 1200,
    height: 1800,
    sky: ["#0f2a2e", "#e9c46a"],
    sun: "#fff3c4",
    ridges: ["#4f8a7b", "#2f6b5e", "#1e4b43", "#0f2a27"],
  },
  {
    alt: "Rose-coloured dunes below a white moon",
    caption: "Dunes after the wind dropped",
    width: 1600,
    height: 1600,
    sky: ["#3a1c40", "#f7a7a6"],
    sun: "#ffffff",
    ridges: ["#c9788c", "#a0556f", "#733a55", "#45223a"],
  },
  {
    alt: "A wide amber plain with distant mesas",
    caption: "Mesa country, looking west",
    width: 1920,
    height: 1080,
    sky: ["#40223b", "#ffb347"],
    sun: "#fff0b3",
    ridges: ["#d98a4e", "#b3643a", "#7d4030", "#472320"],
  },
  {
    alt: "Violet hills beneath a field of stars",
    caption: "Clear night at the pass",
    width: 1440,
    height: 1800,
    sky: ["#0b1026", "#5b4b9a"],
    sun: "#d9d2ff",
    ridges: ["#6f62b5", "#4d438c", "#322c62", "#1a1736"],
  },
  {
    alt: "Grey fjord walls fading into fog",
    caption: "Fog lifting off the fjord",
    width: 1800,
    height: 1200,
    sky: ["#3c4a57", "#dfe7ea"],
    sun: "#ffffff",
    ridges: ["#9fb0b8", "#768a94", "#4f626d", "#2b3840"],
  },
];

const images: LightboxImage[] = scenes.map((scene) => ({
  src: draw(scene),
  alt: scene.alt,
  caption: scene.caption,
  width: scene.width,
  height: scene.height,
}));

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
