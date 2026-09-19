import type { CSSProperties } from "react";

import { PeelStack, type PeelStackItem } from "@/registry/peel-stack";

function PaperArtwork({ variant }: { variant: "form" | "material" | "sound" }) {
  return (
    <svg
      viewBox="0 0 220 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.85"
      aria-hidden="true"
      className="absolute top-7 -right-6 h-[78%] w-[78%] text-[var(--peel-stack-foreground)] opacity-55"
    >
      {Array.from({ length: 11 }, (_, index) => {
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
    description: "12 experiments / 2026",
    label: "A1 / Studies",
    artwork: <PaperArtwork variant="form" />,
  },
  {
    id: "material",
    title: "Material notes",
    description: "08 textures / 2026",
    label: "A1 / Archive",
    artwork: <PaperArtwork variant="material" />,
  },
  {
    id: "sound",
    title: "Field recordings",
    description: "24 moments / 2026",
    label: "A1 / Sound",
    artwork: <PaperArtwork variant="sound" />,
  },
];

export function PeelStackPreview() {
  return (
    <div aria-hidden="true" inert className="h-full">
      <PeelStack
        items={studies}
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
        <PeelStack items={studies} ariaLabel="Design studies" />
      </div>
      <p className="demo-caption">
        Swipe a card or use the arrows to cycle the stack. Focus the stack and use Left, Right, Home, or End.
      </p>
    </>
  );
}
