"use client";

import { ParticleMenu, type ParticleMenuItem } from "@/registry/particle-menu";

const demoItems: ParticleMenuItem[] = [
  { id: "grace", label: "Grace", shape: "grace" },
  { id: "runes", label: "Runes", shape: "runes" },
  { id: "ashes", label: "Ashes", shape: "ashes" },
  { id: "oaths", label: "Oaths", shape: "oaths" },
];

export function ParticleMenuPreview() {
  return (
    <div className="demo-frame particle-menu-preview">
      <ParticleMenu items={demoItems.slice(1, 3)} />
    </div>
  );
}

export function ParticleMenuDemo() {
  return (
    <>
      <div className="demo-frame particle-menu-demo">
        <ParticleMenu ariaLabel="Particle menu demo" items={demoItems} />
      </div>
      <p className="demo-caption">
        Move through a symbol. Its particles scatter, then settle back into place.
      </p>
    </>
  );
}
