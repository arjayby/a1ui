import Image from "next/image";

import { Button } from "@/components/ui/button";
import { CardVortex, type CardVortexItem } from "@/registry/blocks/card-vortex";

// The artwork is shared with the Arc Reel demo. Each card opens another block's page.
const destinations = [
  { id: "arc-reel", title: "Arc Reel", scene: "astral" },
  { id: "ascii-lens", title: "ASCII Lens", scene: "radio-telescope" },
  { id: "particle-menu", title: "Particle Menu", scene: "sound-wave" },
  { id: "section-rail", title: "Section Rail", scene: "railway" },
  { id: "shape-flow", title: "Shape Flow", scene: "deep-ocean" },
  { id: "spiral-text", title: "Spiral Text", scene: "library" },
  { id: "task-steps", title: "Task Steps", scene: "airport-runway" },
  { id: "text-banner", title: "Text Banner", scene: "city" },
];

const items: CardVortexItem[] = destinations.map(({ id, title, scene }) => ({
  id,
  title,
  href: `/blocks/${id}`,
  image: (
    <Image
      src={`/images/arc-reel/${scene}.webp`}
      alt=""
      fill
      sizes="200px"
      className="object-cover"
      draggable={false}
    />
  ),
}));

export function CardVortexDemo() {
  return (
    <>
      <div className="not-prose demo-frame card-vortex-demo-stage" data-card-vortex-boundary="">
        <CardVortex items={items} ariaLabel="More blocks">
          <Button variant="outline">Blocks</Button>
        </CardVortex>
      </div>
      <p className="demo-caption text-center">
        Hover, focus or tap the button. Each card is a link to another block.
      </p>
    </>
  );
}
