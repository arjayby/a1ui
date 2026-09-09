"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

import { AsciiTerrain } from "@/registry/ascii-terrain";

export function AsciiTerrainPreview() {
  return (
    <div className="not-prose demo-frame ascii-terrain-preview">
      <AsciiTerrain paused interactive={false} cellSize={6} style={{ height: "100%" }} />
    </div>
  );
}

export function AsciiTerrainDemo() {
  const [paused, setPaused] = useState(false);
  const [seed, setSeed] = useState(7);

  return (
    <div className="not-prose demo-frame ascii-terrain-demo">
      <AsciiTerrain key={seed} seed={seed} paused={paused} />
      <div className="ascii-terrain-footer">
        <span className="ascii-terrain-hint">Move to shape. Click to ripple.</span>
        <span className="ascii-terrain-reduced-hint">Static terrain. Reduced motion is on.</span>
        <div className="ascii-terrain-controls">
          <button type="button" onClick={() => setSeed((value) => value + 1)}>
            <RotateCcw aria-hidden="true" /> New terrain
          </button>
          <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>
    </div>
  );
}
