"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";

import { ActivityPill, type Activity } from "@/registry/blocks/activity-pill";
import { AsciiLens } from "@/registry/blocks/ascii-lens";
import { AsciiMorph, type AsciiMorphShape } from "@/registry/blocks/ascii-morph";
import { AsciiTerrain } from "@/registry/blocks/ascii-terrain";
import { SpiralText } from "@/registry/blocks/spiral-text";
import { TaskSteps, type TaskStep } from "@/registry/blocks/task-steps";
import { TextBanner } from "@/registry/blocks/text-banner";
import { TextScramble } from "@/registry/blocks/text-scramble";
import { Checkbox } from "@/registry/components/checkbox";
import { ChipGroup, ChipGroupItem } from "@/registry/components/chip-group";
import { Kbd, KbdGroup } from "@/registry/components/kbd";
import { Loader } from "@/registry/components/loader";
import { RadioGroup, RadioGroupItem } from "@/registry/components/radio-group";
import { RollingNumber } from "@/registry/components/rolling-number";
import { Switch } from "@/registry/components/switch";
import { ValidatedInput } from "@/registry/components/validated-input";

/** Counts up once every `interval` milliseconds while the preview is mounted. */
function useTick(interval: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return tick;
}

/** Shrinks a preview that is laid out larger than the card's picture area. */
function Fit({ zoom, children }: { zoom: number; children: ReactNode }) {
  return (
    <span className="flex w-full items-center justify-center" style={{ zoom }}>
      {children}
    </span>
  );
}

const thumbIcons = { checked: <CheckIcon weight="bold" />, unchecked: <XIcon weight="bold" /> };

function SwitchPreview() {
  const tick = useTick(1200);
  return <Switch aria-label="Wi-Fi" thumbIcons={thumbIcons} checked={tick % 2 === 0} />;
}

function CheckboxPreview() {
  const tick = useTick(1300);
  return <Checkbox label="Ship it" strikethrough checked={tick % 2 === 1} />;
}

const plans = ["Hobby", "Pro"];

function RadioGroupPreview() {
  const tick = useTick(1100);
  return (
    <Fit zoom={0.8}>
      <RadioGroup aria-label="Plan" value={plans[tick % plans.length]}>
        {plans.map((plan) => (
          <RadioGroupItem key={plan} value={plan} label={plan} />
        ))}
      </RadioGroup>
    </Fit>
  );
}

const topics = ["Design", "Code"];
const chipSteps = [[], ["Design"], ["Design", "Code"], ["Code"]];

function ChipGroupPreview() {
  const tick = useTick(900);
  return (
    <Fit zoom={0.7}>
      <ChipGroup
        aria-label="Topics"
        value={chipSteps[tick % chipSteps.length]}
        className="flex-wrap justify-center"
      >
        {topics.map((topic) => (
          <ChipGroupItem key={topic} value={topic}>
            {topic}
          </ChipGroupItem>
        ))}
      </ChipGroup>
    </Fit>
  );
}

function LoaderPreview() {
  return (
    <span className="flex items-center gap-5">
      <Loader variant="morph" size={22} label="" />
      <Loader variant="infinity" size={22} label="" />
      <Loader variant="tiles" size={22} label="" />
    </span>
  );
}

const amounts = [1284, 1312, 1297, 1405, 1388];

function RollingNumberPreview() {
  const tick = useTick(1300);
  return (
    <RollingNumber
      value={amounts[tick % amounts.length]}
      locale="en-US"
      format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
      announce={false}
      className="text-xl font-semibold tabular-nums"
    />
  );
}

const combo = ["⌘", "⇧", "↩"];

function KbdPreview() {
  // The keys go down one at a time; with all three held the group lights up, then they let go.
  const tick = useTick(450);
  const held = tick % (combo.length + 4);
  return (
    <KbdGroup>
      {combo.map((key, index) => (
        <Kbd key={key} pressed={index < held && held <= combo.length + 1}>
          {key}
        </Kbd>
      ))}
    </KbdGroup>
  );
}

const emailSchema = z.string().trim().min(1, "Enter your email.").pipe(z.email("Enter a valid email."));

const typedEmail = "arjayby@mail";
/** Beats the error stays up, and the field stays empty, before the next round of typing. */
const ERROR_BEATS = 12;
const EMPTY_BEATS = 3;

function ValidatedInputPreview() {
  const ref = useRef<HTMLSpanElement>(null);
  // One beat per typed character; after the last one the field is checked and its error shows.
  const tick = useTick(140);
  const length = typedEmail.length + ERROR_BEATS + EMPTY_BEATS;
  const round = Math.floor(tick / length);
  const beat = (tick % length) - EMPTY_BEATS;
  const typed = typedEmail.slice(0, Math.max(0, beat));
  const done = beat === typedEmail.length;

  // Checking the field fires its invalid event, which shows the error and shakes the input.
  useEffect(() => {
    if (done) ref.current?.querySelector("input")?.checkValidity();
  }, [done]);

  return (
    <Fit zoom={0.72}>
      <span ref={ref} className="block w-full">
        {/* A fresh field each round, so the error from the last round is gone while typing. */}
        <ValidatedInput key={round} label="Email" type="email" value={typed} schema={emailSchema} />
      </span>
    </Fit>
  );
}

const morphShapes: AsciiMorphShape[] = ["globe", "flower"];

function AsciiMorphPreview() {
  const tick = useTick(2600);
  return (
    <AsciiMorph
      shape={morphShapes[tick % morphShapes.length]}
      interactive={false}
      duration={900}
      className="h-full w-full"
    />
  );
}

function AsciiTerrainPreview() {
  return <AsciiTerrain interactive={false} cellSize={8} className="absolute inset-0 size-full" />;
}

const phrases = ["MAKE IT CLEAR.", "MAKE IT COUNT.", "MAKE IT YOURS."];

function TextScramblePreview() {
  const tick = useTick(2200);
  return <TextScramble text={phrases[tick % phrases.length]} duration={900} className="font-mono text-sm" />;
}

function TextBannerPreview() {
  return <TextBanner items={["a1ui", "Blocks"]} speed={40} className="landing-preview-banner w-full" />;
}

function SpiralTextPreview() {
  return <SpiralText text="A1UI · BLOCKS · " className="landing-preview-spiral" />;
}

const stepLabels = ["Install", "Build", "Deploy"];

function TaskStepsPreview() {
  const tick = useTick(900);
  const phase = tick % (stepLabels.length * 2 + 2);
  const steps: TaskStep[] = stepLabels.map((label, index) => {
    const at = phase - index * 2;
    return { id: label, label, status: at >= 2 ? "done" : at >= 0 ? "running" : "pending" };
  });
  return <TaskSteps steps={steps} className="w-full" />;
}

const activities: Activity[] = [
  { id: "upload", status: "running", title: "Uploading" },
  { id: "upload", status: "progress", title: "Uploading", value: 40 },
  { id: "upload", status: "progress", title: "Uploading", value: 85 },
  { id: "upload", status: "success", title: "Uploaded" },
];

function ActivityPillPreview() {
  const tick = useTick(1000);
  return <ActivityPill activity={activities[tick % activities.length]} contained successDuration={0} />;
}

function AsciiLensPreview() {
  return (
    <AsciiLens
      src="/images/arc-reel/city.webp"
      alt=""
      cellSize={6}
      interactive={false}
      className="absolute inset-0 size-full"
    />
  );
}

/** Small, self-running versions of each demo, shown inside the landing page's Card Vortex cards. */
export const componentPreviews: Record<string, () => ReactNode> = {
  switch: SwitchPreview,
  checkbox: CheckboxPreview,
  "radio-group": RadioGroupPreview,
  "chip-group": ChipGroupPreview,
  loader: LoaderPreview,
  "rolling-number": RollingNumberPreview,
  kbd: KbdPreview,
  "validated-input": ValidatedInputPreview,
};

export const blockPreviews: Record<string, () => ReactNode> = {
  "ascii-morph": AsciiMorphPreview,
  "ascii-terrain": AsciiTerrainPreview,
  "text-scramble": TextScramblePreview,
  "text-banner": TextBannerPreview,
  "spiral-text": SpiralTextPreview,
  "task-steps": TaskStepsPreview,
  "activity-pill": ActivityPillPreview,
  "ascii-lens": AsciiLensPreview,
};
