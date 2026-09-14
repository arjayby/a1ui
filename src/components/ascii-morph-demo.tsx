"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { AsciiMorph, type AsciiMorphShape } from "@/registry/ascii-morph";

const labels = { globe: "Globe", flower: "Flower", a1: "A1 monogram" };
const numbers = { globe: "01", flower: "02", a1: "03" };

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
    <div className="not-prose demo-frame ascii-morph-demo">
      <AsciiMorph onShapeChange={setShape} />
      <div className="ascii-morph-footer" aria-hidden="true">
        <span className="ascii-morph-caption">
          <span>{numbers[shape]} / 03</span>
          {labels[shape]}
        </span>
        <span className="ascii-morph-hint">
          Click to morph <ArrowRight />
        </span>
      </div>
    </div>
  );
}
