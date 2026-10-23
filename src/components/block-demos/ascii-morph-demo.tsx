"use client";

import { useState } from "react";

import { AsciiMorph, type AsciiMorphShape } from "@/registry/blocks/ascii-morph";

const labels = { globe: "Globe", flower: "Flower", a1: "A1 monogram" };
const numbers = { globe: 1, flower: 2, a1: 3 };

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
        <AsciiMorph onShapeChange={setShape} />
      </div>
      <p className="demo-caption text-center" aria-hidden="true">
        Click to morph · {numbers[shape]}/3 {labels[shape]}
      </p>
    </>
  );
}
