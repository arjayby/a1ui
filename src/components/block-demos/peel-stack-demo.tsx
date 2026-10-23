import type { CSSProperties } from "react";

import { PeelStack, type PeelStackItem } from "@/registry/blocks/peel-stack";

function PaperArtwork({ variant }: { variant: "form" | "material" | "sound" | "light" | "motion" }) {
  return (
    <svg
      viewBox="0 0 220 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.85"
      aria-hidden="true"
      className="absolute top-7 -right-6 h-[78%] w-[78%] text-[var(--peel-stack-foreground)] opacity-35"
    >
      {Array.from({ length: 11 }, (_, index) => {
        if (variant === "light") {
          return <path key={index} d={`M110 150 ${30 + index * 16} 30`} />;
        }
        if (variant === "motion") {
          return (
            <path key={index} d={`M20 ${40 + index * 9} Q110 ${-20 + index * 14} 200 ${40 + index * 9}`} />
          );
        }
        if (variant === "material") {
          const size = 35 + index * 9;
          return (
            <rect
              key={index}
              x={110 - size / 2}
              y={90 - size / 2}
              width={size}
              height={size}
              rx="1"
              transform={`rotate(${index * 5 - 25} 110 90)`}
            />
          );
        }
        return (
          <ellipse
            key={index}
            cx="110"
            cy="90"
            rx={18 + index * 5.5}
            ry={variant === "form" ? 31 + index * 3.2 : 10 + index * 5.5}
            transform={variant === "form" ? `rotate(${index * 7 - 25} 110 90)` : undefined}
          />
        );
      })}
    </svg>
  );
}

const studies: PeelStackItem[] = [
  {
    id: "form",
    title: "Form studies",
    description: "Explorations in shape and balance",
    label: "Studies",
    artwork: <PaperArtwork variant="form" />,
  },
  {
    id: "material",
    title: "Material notes",
    description: "A collection of surfaces and textures",
    label: "Archive",
    artwork: <PaperArtwork variant="material" />,
  },
  {
    id: "sound",
    title: "Field recordings",
    description: "Sounds gathered from everyday places",
    label: "Sound",
    artwork: <PaperArtwork variant="sound" />,
  },
  {
    id: "light",
    title: "Light studies",
    description: "Patterns of shadow and reflection",
    label: "Light",
    artwork: <PaperArtwork variant="light" />,
  },
  {
    id: "motion",
    title: "Motion sketches",
    description: "Small experiments in rhythm and movement",
    label: "Motion",
    artwork: <PaperArtwork variant="motion" />,
  },
];

export function PeelStackPreview() {
  return (
    <div aria-hidden="true" inert className="h-full">
      <PeelStack
        items={studies}
        showControls={false}
        className="h-full"
        style={
          {
            "--peel-stack-stage-height": "100%",
            "--peel-stack-card-height": "8.75rem",
            "--peel-stack-card-width": "11.75rem",
            "--peel-stack-title-size": "0.875rem",
            "--peel-stack-label-size": "0.5rem",
          } as CSSProperties
        }
      />
    </div>
  );
}

export function PeelStackDemo() {
  return (
    <>
      <div className="not-prose demo-frame">
        <PeelStack items={studies} ariaLabel="Design studies" showControls={false} />
      </div>
      <p className="demo-caption text-center">
        Swipe a card to cycle the stack. Focus the stack and use Left, Right, Home, or End.
      </p>
    </>
  );
}
