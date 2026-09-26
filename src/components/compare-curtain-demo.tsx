"use client";

import { useState } from "react";

import { CompareCurtain } from "@/registry/compare-curtain";

function Design({ published }: { published: boolean }) {
  return (
    <div
      className={`absolute inset-0 grid content-center justify-items-center gap-2 whitespace-nowrap ${
        published ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
      }`}
    >
      <span className="text-[9px] tracking-[0.2em] uppercase">
        {published ? "Published / 02" : "Draft / 01"}
      </span>
      <span className="font-serif text-[clamp(1.5rem,6vw,3rem)] leading-none tracking-[-0.07em]">
        a new perspective.
      </span>
      <span className="text-[10px]">{published ? "Final design" : "Working concept"}</span>
    </div>
  );
}

export function CompareCurtainPreview() {
  return (
    <div className="not-prose demo-frame grid place-items-center p-6">
      <CompareCurtain
        before={<Design published={false} />}
        after={<Design published />}
        defaultValue={50}
        className="max-w-[480px]"
      />
    </div>
  );
}

export function CompareCurtainDemo() {
  const [reveal, setReveal] = useState(50);

  return (
    <>
      <div className="not-prose demo-frame p-5 sm:p-8">
        <div className="mx-auto max-w-[640px]">
          <div className="text-muted-foreground mb-3 flex items-center justify-between gap-3 text-[10px] tracking-wider uppercase">
            <span>Drag the center arrow to compare</span>
            <output>{reveal}%</output>
          </div>
          <CompareCurtain
            before={<Design published={false} />}
            after={<Design published />}
            ariaLabel="Reveal published design"
            beforeLabel="Draft"
            afterLabel="Published"
            value={reveal}
            onValueChange={setReveal}
          />
        </div>
      </div>
      <p className="demo-caption">
        Drag the arrow with a mouse or touch. Focus it and use arrow keys to move one percent, Shift with an
        arrow key to move ten percent, or Home and End to jump to either side.
      </p>
    </>
  );
}
