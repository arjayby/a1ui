"use client";

import { Shuffle } from "lucide-react";
import { useState } from "react";

import { TextScramble } from "@/registry/blocks/text-scramble";

const phrases = ["MAKE IT CLEAR.", "MAKE IT COUNT.", "MAKE IT YOURS."];

// Site press feedback: scale down the instant the pointer goes down, spring back on release.
const pressable =
  "transition-transform duration-(--ease-spring-snappy-duration) ease-(--ease-spring-snappy) active:scale-[0.96] active:duration-75 active:ease-(--ease-press) motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-60";

export function TextScrambleDemo() {
  const [index, setIndex] = useState(0);

  const randomizePhrase = () => {
    const offset = 1 + Math.floor(Math.random() * (phrases.length - 1));
    setIndex((current) => (current + offset) % phrases.length);
  };

  return (
    <>
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
      </div>
      <div className="not-prose demo-caption text-scramble-demo-controls">
        <button type="button" className={pressable} onClick={randomizePhrase}>
          <Shuffle aria-hidden="true" />
          Randomize phrase
        </button>
      </div>
    </>
  );
}
