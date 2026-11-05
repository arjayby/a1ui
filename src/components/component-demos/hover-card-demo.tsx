"use client";

import { CalendarBlankIcon, MapPinIcon } from "@phosphor-icons/react";
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
  name: "Mara Okafor",
  handle: "maraokafor",
  initials: "MO",
  bio: "Designs motion systems for interfaces. Currently making spring curves feel less like physics homework.",
  location: "Lisbon",
  joined: "Joined March 2021",
  following: "312",
  followers: "18.4K",
};

// Each direct child of the card staggers in: avatar, name, bio, details, then counts.
const cardLayout = "grid grid-cols-[2.75rem_1fr] items-center gap-x-3";

function ProfileCard() {
  return (
    <>
      <span
        aria-hidden="true"
        className="bg-foreground text-background grid size-11 place-items-center rounded-full text-sm font-semibold"
      >
        {profile.initials}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">{profile.name}</p>
        <p className="text-muted-foreground truncate">@{profile.handle}</p>
      </div>
      <p className="col-span-2 mt-3 leading-relaxed">{profile.bio}</p>
      <div className="text-muted-foreground col-span-2 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <MapPinIcon aria-hidden="true" className="size-3.5" />
          {profile.location}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarBlankIcon aria-hidden="true" className="size-3.5" />
          {profile.joined}
        </span>
      </div>
      <div className="border-border col-span-2 mt-3 flex gap-4 border-t pt-3">
        <span>
          <strong className="font-semibold tabular-nums">{profile.following}</strong>{" "}
          <span className="text-muted-foreground">Following</span>
        </span>
        <span>
          <strong className="font-semibold tabular-nums">{profile.followers}</strong>{" "}
          <span className="text-muted-foreground">Followers</span>
        </span>
      </div>
    </>
  );
}

export function HoverCardPreview() {
  return (
    <p className="text-muted-foreground text-sm">
      Designed by{" "}
      <HoverCard openDelay={300}>
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
  const [delay, setDelay] = useState<Delay>("short");
  const [duration, setDuration] = useState(0.35);

  return (
    <div className="not-prose demo-frame">
      <div className="component-demo-stage">
        <p className="text-muted-foreground max-w-xs px-4 text-center text-sm leading-relaxed">
          The new motion guidelines were written by{" "}
          <HoverCard key={`${delay}-${duration}`} openDelay={openDelays[delay]} duration={duration}>
            <HoverCardTrigger href="#" onClick={(event) => event.preventDefault()}>
              @{profile.handle}
            </HoverCardTrigger>
            <HoverCardContent side={side} className={cardLayout}>
              <ProfileCard />
            </HoverCardContent>
          </HoverCard>{" "}
          and the design systems team.
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
