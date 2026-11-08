"use client";

import { useState } from "react";

import { AsciiMorph, type AsciiMorphShape } from "@/registry/blocks/ascii-morph";

const shapes: AsciiMorphShape[] = ["globe", "flower", "a1"];
const labels: Partial<Record<AsciiMorphShape, string>> = {
  globe: "Globe",
  flower: "Flower",
  a1: "a1 monogram",
};

export function AsciiMorphPreview() {
  return (
    <div className="not-prose demo-frame ascii-morph-preview">
      <AsciiMorph interactive={false} />
    </div>
  );
}

export function AsciiMorphDemo() {
  const [shape, setShape] = useState<AsciiMorphShape>("globe");

  return (
    <>
      <div className="not-prose demo-frame ascii-morph-demo">
        <AsciiMorph shapes={shapes} onShapeChange={setShape} />
      </div>
      <p className="demo-caption text-center" aria-hidden="true">
        Click to morph · {shapes.indexOf(shape) + 1}/{shapes.length} {labels[shape]}
      </p>
    </>
  );
}
