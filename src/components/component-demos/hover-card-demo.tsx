"use client";

import { CalendarBlankIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { DemoDuration, DemoSelect } from "@/components/component-demos/demo-controls";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  type HoverCardContentProps,
} from "@/registry/components/hover-card";

type Side = NonNullable<HoverCardContentProps["side"]>;
const sides: Side[] = ["bottom", "top", "right", "left"];
type Delay = "instant" | "short" | "long";
const delays: Delay[] = ["instant", "short", "long"];
const openDelays: Record<Delay, number> = { instant: 0, short: 300, long: 700 };

const profile = {
  name: "Arjay Bayona",
  handle: "arjayby",
  avatar: "/images/avatar-group/hollow-seer.svg",
  bio: "Building a1ui: animated React components and blocks. Install one with an agent, then edit it to make it yours.",
  repository: "arjayby/a1ui",
  started: "Started September 2026",
  stack: ["React", "Motion", "Tailwind"],
};

// Each direct child of the card staggers in: avatar, name, bio, details, then counts.
const cardLayout = "grid grid-cols-[2.75rem_1fr] items-center gap-x-3";

function ProfileCard() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a small static SVG portrait */}
      <img
        src={profile.avatar}
        alt=""
        aria-hidden="true"
        className="bg-chart-3 size-11 rounded-full object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold">{profile.name}</p>
        <p className="text-muted-foreground truncate">@{profile.handle}</p>
      </div>
      <p className="col-span-2 mt-3 leading-relaxed">{profile.bio}</p>
      <div className="text-muted-foreground col-span-2 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <GithubLogoIcon aria-hidden="true" className="size-3.5" />
          {profile.repository}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarBlankIcon aria-hidden="true" className="size-3.5" />
          {profile.started}
        </span>
      </div>
      <div className="border-border text-muted-foreground col-span-2 mt-3 flex flex-wrap gap-x-2 gap-y-1 border-t pt-3 text-xs">
        <span>Built with</span>
        {profile.stack.map((tool) => (
          <span key={tool} className="text-foreground font-medium">
            {tool}
          </span>
        ))}
      </div>
    </>
  );
}

export function HoverCardPreview() {
  return (
    <p className="text-muted-foreground text-sm">
      Designed by{" "}
      <HoverCard openDelay={0}>
        <HoverCardTrigger href="#" onClick={(event) => event.preventDefault()}>
          @{profile.handle}
        </HoverCardTrigger>
        <HoverCardContent className={cardLayout}>
          <ProfileCard />
        </HoverCardContent>
      </HoverCard>
    </p>
  );
}

export function HoverCardDemo() {
  const [side, setSide] = useState<Side>("bottom");
  const [delay, setDelay] = useState<Delay>("instant");
  const [duration, setDuration] = useState(0.35);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <p className="text-muted-foreground max-w-xs px-4 text-center text-sm leading-relaxed">
          a1ui is designed and built by{" "}
          <HoverCard key={`${delay}-${duration}`} openDelay={openDelays[delay]} duration={duration}>
            <HoverCardTrigger href="#" onClick={(event) => event.preventDefault()}>
              @{profile.handle}
            </HoverCardTrigger>
            <HoverCardContent side={side} className={cardLayout}>
              <ProfileCard />
            </HoverCardContent>
          </HoverCard>
          .
        </p>
      </div>
      <div className="component-demo-controls">
        <DemoSelect label="Side" value={side} options={sides} onChange={setSide} />
        <DemoSelect label="Delay" value={delay} options={delays} onChange={setDelay} />
        <DemoDuration value={duration} onChange={setDuration} />
      </div>
    </div>
  );
}
