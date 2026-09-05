"use client";

import { useState } from "react";

import { ParticleMenu, type ParticleMenuItem } from "@/registry/particle-menu";

const demoItems: ParticleMenuItem[] = [
  { id: "grace", label: "Grace", shape: "grace" },
  { id: "runes", label: "Runes", shape: "runes" },
  { id: "ashes", label: "Ashes", shape: "ashes" },
  { id: "oaths", label: "Oaths", shape: "oaths" },
];

const descriptions: Record<string, string> = {
  grace: "Rest beneath the light of grace.",
  runes: "Read the marks of a fractured age.",
  ashes: "Gather what the fire left behind.",
  oaths: "Remember the vows that bind you.",
};

export function ParticleMenuPreview() {
  return (
    <div className="demo-frame particle-menu-preview">
      <ParticleMenu items={demoItems.slice(1, 3)} />
    </div>
  );
}

export function ParticleMenuDemo() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="demo-frame particle-menu-demo">
        <div className="particle-menu-demo-heading" aria-hidden="true">
          <span>Sigils of the fallen</span>
          <span>Trace a sigil.</span>
        </div>
        <ParticleMenu
          ariaLabel="Particle menu demo"
          items={demoItems.map((item) => ({ ...item, onSelect: () => setSelected(item.id) }))}
        />
        <div className="particle-menu-demo-status" role="status">
          {selected ? descriptions[selected] : "Move through a sigil to stir its ashes."}
        </div>
      </div>
      <p className="demo-caption">
        Move through a symbol. Its particles scatter, then settle back into place.
      </p>
    </>
  );
}
