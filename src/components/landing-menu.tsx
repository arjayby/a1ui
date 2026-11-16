"use client";

import { startTransition, useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { blockPreviews, componentPreviews } from "@/components/landing-previews";
import { blocks } from "@/lib/block-catalog";
import { components } from "@/lib/component-catalog";
import { CardVortex, type CardVortexItem } from "@/registry/blocks/card-vortex";
import { ParticleMenu, type ParticleMenuItem } from "@/registry/blocks/particle-menu";

/** How long after opening the previews mount: the last card has landed by then. */
const MOUNT_DELAY = 320;
/** How long the previews stay mounted after the ring closes, so they don't vanish mid-exit. */
const UNMOUNT_DELAY = 600;

const sections = {
  components: {
    label: "Components",
    base: "/components",
    previews: componentPreviews,
    catalog: components,
  },
  blocks: {
    label: "Blocks",
    base: "/blocks",
    previews: blockPreviews,
    catalog: blocks,
  },
};

type SectionId = keyof typeof sections;

// The block sets its theme inline, so overrides go through its style prop. The page background
// behind each preview lets muted surfaces, such as chips and key caps, stand out from it.
const vortexStyle = { "--card-vortex-image": "var(--background)" } as CSSProperties;

function PreviewStage({ children }: { children: ReactNode }) {
  // A live render of the component, for looking at only: the card itself is the link.
  return (
    <span className="landing-preview" data-live={children ? "" : undefined} inert aria-hidden="true">
      {children}
    </span>
  );
}

function SectionVortex({ id, control }: { id: SectionId; control: ReactNode }) {
  const { label, base, previews, catalog } = sections[id];
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);

  // The previews run only while the ring is open, and a moment after so the exit stays intact.
  // The cards fly out on a main-thread spring, so the previews wait until they have landed: setting
  // up eight live demos mid-flight dropped frames. The mount is a transition, so it can yield too.
  useEffect(() => {
    const timer = open
      ? setTimeout(() => startTransition(() => setLive(true)), MOUNT_DELAY)
      : setTimeout(() => setLive(false), UNMOUNT_DELAY);
    return () => clearTimeout(timer);
  }, [open]);

  const items: CardVortexItem[] = Object.entries(previews).flatMap(([slug, Preview]) => {
    const entry = catalog.find((item) => item.slug === slug);
    if (!entry) return [];
    return [
      {
        id: slug,
        title: entry.title,
        href: `${base}/${slug}`,
        image: <PreviewStage>{live ? <Preview /> : null}</PreviewStage>,
      },
    ];
  });

  return (
    <CardVortex
      items={items}
      open={open}
      onOpenChange={setOpen}
      ariaLabel={`${label} previews`}
      className="landing-vortex"
      style={vortexStyle}
    >
      {control}
    </CardVortex>
  );
}

export function LandingMenu({ githubUrl }: { githubUrl: string }) {
  const menu: ParticleMenuItem[] = [
    { id: "components", label: "Components", shape: "ring", href: "/components" },
    { id: "blocks", label: "Blocks", shape: "lattice", href: "/blocks" },
    { id: "agents", label: "For agents", shape: "halo", href: "/agents" },
    { id: "github", label: "GitHub", shape: "spiral", href: githubUrl },
  ];

  return (
    <ParticleMenu
      items={menu}
      ariaLabel="Main navigation"
      className="landing-menu"
      renderItem={(item, control) =>
        item.id in sections ? <SectionVortex id={item.id as SectionId} control={control} /> : control
      }
    />
  );
}
