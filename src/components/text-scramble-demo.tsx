"use client";

import { Shuffle } from "lucide-react";
import { useState } from "react";

import { TextScramble } from "@/registry/text-scramble";

const phrases = ["MAKE IT CLEAR.", "MAKE IT COUNT.", "MAKE IT YOURS."];

export function TextScramblePreview() {
  return (
    <div className="not-prose demo-frame text-scramble-preview">
      <TextScramble text="7#A? %Q 2X@9G/" disabled className="text-scramble-preview-text" />
    </div>
  );
}

export function TextScrambleDemo() {
  const [index, setIndex] = useState(0);

  const randomizePhrase = () => {
    const offset = 1 + Math.floor(Math.random() * (phrases.length - 1));
    setIndex((current) => (current + offset) % phrases.length);
  };

  return (
    <div className="not-prose demo-frame text-scramble-demo">
      <div className="text-scramble-demo-stage">
        <TextScramble
          text={phrases[index]}
          duration={1000}
          aria-live="polite"
          aria-atomic="true"
          className="text-scramble-demo-text"
        />
      </div>
      <button type="button" className="text-scramble-demo-button" onClick={randomizePhrase}>
        <Shuffle aria-hidden="true" />
        Randomize phrase
      </button>
    </div>
  );
}
