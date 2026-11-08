"use client";

import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { AsciiTerrain } from "@/registry/blocks/ascii-terrain";

// The full-bleed terrain behind the playground, with a control to stop its drift.
export function LandingTerrain() {
  const [paused, setPaused] = useState(false);

  return (
    <>
      {/* Not inert: the terrain stops animating and ignores input inside inert subtrees. */}
      <div className="landing-stage-art">
        <AsciiTerrain
          cellSize={12}
          amplitude={1.2}
          speed={1}
          paused={paused}
          ariaLabel="Interactive ASCII terrain"
          className="landing-terrain"
        />
      </div>
      <div className="landing-stage-hint landing-width">
        <span className="landing-stage-hint-motion" aria-hidden="true">
          {paused ? "Paused." : "Move to shape. Click to ripple."}
        </span>
        <span className="landing-stage-hint-reduced" aria-hidden="true">
          Point to highlight.
        </span>
        <button type="button" className="landing-stage-pause" onClick={() => setPaused((value) => !value)}>
          {paused ? <PlayIcon aria-hidden="true" /> : <PauseIcon aria-hidden="true" />}
          {paused ? "Resume terrain" : "Pause terrain"}
        </button>
      </div>
    </>
  );
}
