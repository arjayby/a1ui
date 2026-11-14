"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Loader, loaderVariants } from "@/registry/components/loader";

const sizes = ["16", "24", "32", "48"] as const;
type Size = (typeof sizes)[number];

export function LoaderDemo() {
  const [size, setSize] = useState<Size>("32");
  const [cycle, setCycle] = useState(1.2);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <ul className="m-0! grid w-full max-w-lg list-none grid-cols-3 gap-x-4 gap-y-8 p-0! px-4! py-6! sm:grid-cols-4">
          {loaderVariants.map((variant) => (
            <li key={variant} className="m-0! flex flex-col items-center gap-3 p-0!">
              <span className="flex h-12 items-center justify-center">
                <Loader
                  variant={variant}
                  size={Number(size)}
                  cycle={cycle}
                  aria-label={`Loading, ${variant} style`}
                  className={variant === "line" ? "w-20" : undefined}
                />
              </span>
              <span className="text-muted-foreground font-mono text-[11px] leading-none">{variant}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-24">
        <DemoSelect label="Size" value={size} options={sizes} onChange={setSize} />
        <DemoDuration label="Cycle" value={cycle} max={2.5} onChange={setCycle} />
      </div>
    </div>
  );
}
