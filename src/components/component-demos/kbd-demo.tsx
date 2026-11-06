"use client";

import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import { Kbd, KbdGroup, type KbdPlatform } from "@/registry/components/kbd";

// Combos the browser and this site leave alone, so holding them only presses the keys.
const combos = {
  "mod + shift + enter": ["mod", "shift", "enter"],
  "mod + enter": ["mod", "enter"],
  "shift + enter": ["shift", "enter"],
} satisfies Record<string, string[]>;
type Combo = keyof typeof combos;
const comboOptions = Object.keys(combos) as Combo[];

type Labels = "auto" | KbdPlatform;
const labelOptions: Labels[] = ["auto", "mac", "other"];

const singles = ["Escape", "Shift", "Control", "Alt", "Meta", "Enter"];

export function KbdPreview() {
  return <KbdGroup keys={["mod", "k"]} listen />;
}

export function KbdDemo() {
  const [combo, setCombo] = useState<Combo>("mod + shift + enter");
  const [labels, setLabels] = useState<Labels>("auto");
  const [duration, setDuration] = useState(0.3);
  const platform = labels === "auto" ? undefined : labels;

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <div className="grid justify-items-center gap-8">
          <KbdGroup key={combo} keys={combos[combo]} listen platform={platform} duration={duration} />
          <div data-slot="kbd-demo-keys" className="flex flex-wrap justify-center gap-2">
            {singles.map((key) => (
              <Kbd key={key} listen={key} platform={platform} duration={duration} />
            ))}
          </div>
        </div>
      </div>
      <div className="component-demo-controls [&_[data-slot=demo-select-trigger]]:w-44">
        <DemoSelect label="Combo" value={combo} options={comboOptions} onChange={setCombo} />
        <DemoSelect label="Labels" value={labels} options={labelOptions} onChange={setLabels} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
