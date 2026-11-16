"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { z } from "zod";

import { ArcReel, type ArcReelItem } from "@/registry/blocks/arc-reel";
import { AsciiLens, type AsciiLensHandle } from "@/registry/blocks/ascii-lens";
import { AsciiTerrain, type AsciiTerrainHandle } from "@/registry/blocks/ascii-terrain";
import { ParticleMenu, type ParticleMenuItem } from "@/registry/blocks/particle-menu";
import { SpiralText, type SpiralTextHandle } from "@/registry/blocks/spiral-text";
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

// Blocks, kept small so each fits its card and eight of them stay smooth while the ring moves.

function TextBannerPreview() {
  return <TextBanner items={["a1ui", "Blocks"]} speed={30} className="landing-preview-banner w-full" />;
}

const reelScenes = ["astral", "city", "railway", "deep-ocean", "library", "sound-wave"];
const reelItems: ArcReelItem[] = reelScenes.map((scene) => ({
  id: scene,
  name: "",
  artwork: (
    <Image
      src={`/images/arc-reel/${scene}.webp`}
      alt=""
      fill
      sizes="64px"
      className="object-cover"
      draggable={false}
    />
  ),
}));

function ArcReelPreview() {
  const ref = useRef<HTMLSpanElement>(null);
  // The reel has no autoplay, so the preview steps it with its own arrow key on a beat. A click
  // on its next button would bubble up to the card's link and follow it.
  useEffect(() => {
    const timer = setInterval(() => {
      const viewport = ref.current?.querySelector("[tabindex='0']");
      viewport?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    }, 1600);
    return () => clearInterval(timer);
  }, []);
  return (
    <span ref={ref} className="landing-preview-reel">
      <ArcReel items={reelItems} initialIndex={1} ariaLabel="" />
    </span>
  );
}

// Where each click lands on the ground, from -1 to 1 across and from back to front.
const terrainClicks = [
  [-0.35, 0.1],
  [0.4, -0.2],
  [0, 0.45],
  [-0.5, -0.4],
  [0.45, 0.35],
];

function AsciiTerrainPreview() {
  const ref = useRef<AsciiTerrainHandle>(null);
  // Clicks only: each sends a ripple, and no hill follows a pointer between them.
  const tick = useTick(1500);
  useEffect(() => {
    const [x, z] = terrainClicks[tick % terrainClicks.length];
    ref.current?.ripple(x, z);
  }, [tick]);
  return <AsciiTerrain ref={ref} interactive={false} cellSize={7} className="landing-preview-fill" />;
}

const words = ["HELLO", "BLOCKS", "A1UI"];

function TextScramblePreview() {
  const tick = useTick(2000);
  return <TextScramble text={words[tick % words.length]} duration={700} className="font-mono text-sm" />;
}

function SpiralTextPreview() {
  // The block spins its coils from JavaScript, on the same thread that flies the cards. Here the
  // coils hold still and a CSS animation turns them on the compositor instead.
  const ref = useRef<SpiralTextHandle>(null);
  // A click every few beats: the press tightens the rings and letting go sends the ripple out.
  const tick = useTick(450);
  const beat = tick % 6;
  useEffect(() => {
    if (beat === 1) ref.current?.press();
    if (beat === 2) ref.current?.release();
  }, [beat]);
  return (
    <SpiralText
      ref={ref}
      text="A1UI · "
      density={0.65}
      rippleDuration={1200}
      rotating={false}
      className="landing-preview-spiral"
    />
  );
}

const stepLabels = ["Build", "Deploy"];

function TaskStepsPreview() {
  const tick = useTick(900);
  const phase = tick % (stepLabels.length * 2 + 2);
  const steps: TaskStep[] = stepLabels.map((label, index) => {
    const at = phase - index * 2;
    return { id: label, label, status: at >= 2 ? "done" : at >= 0 ? "running" : "pending" };
  });
  return (
    <Fit zoom={0.8}>
      <TaskSteps steps={steps} className="w-full" />
    </Fit>
  );
}

// The path a pointer takes over the image, as fractions of its width and height. Null lifts it away.
const lensPath: ([number, number] | null)[] = [
  [0.28, 0.4],
  [0.5, 0.58],
  [0.74, 0.42],
  [0.6, 0.68],
  [0.36, 0.62],
  null,
];

function AsciiLensPreview() {
  const ref = useRef<AsciiLensHandle>(null);
  // The lens glides to each point on its own spring, as it does when a pointer carries it.
  const tick = useTick(800);
  useEffect(() => {
    const point = lensPath[tick % lensPath.length];
    if (point) ref.current?.show(...point);
    else ref.current?.hide();
  }, [tick]);
  return (
    <AsciiLens
      ref={ref}
      src="/images/arc-reel/city.webp"
      alt=""
      cellSize={6}
      radius={32}
      interactive={false}
      className="landing-preview-fill"
    />
  );
}

const particleItems: ParticleMenuItem[] = [
  { id: "grace", label: "Grace", shape: "grace" },
  { id: "runes", label: "Runes", shape: "runes" },
];

/** How long a pointer takes to cross one symbol, and how often it sets off across the next. */
const SWEEP = 700;
const SWEEP_EVERY = 1900;

function ParticleMenuPreview() {
  const ref = useRef<HTMLSpanElement>(null);
  // The grains follow pointer events on each item, so the preview sends its own: a pointer that
  // crosses one symbol, leaves, then crosses the next. They don't bubble, so the card and the
  // ring around it never see them.
  useEffect(() => {
    let turn = 0;
    let frame = 0;
    const sweep = () => {
      const controls = ref.current?.querySelectorAll<HTMLElement>("a, button");
      const control = controls?.[turn++ % (controls.length || 1)];
      const bounds = control?.querySelector("svg")?.getBoundingClientRect();
      if (!control || !bounds?.width) return;
      // Alternate direction, on a slight diagonal so the grains part to both sides.
      const forward = turn % 2 === 1;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / SWEEP);
        const across = forward ? progress : 1 - progress;
        control.dispatchEvent(
          new PointerEvent(progress < 1 ? "pointermove" : "pointerleave", {
            clientX: bounds.left + bounds.width * (0.1 + across * 0.8),
            clientY: bounds.top + bounds.height * (0.35 + progress * 0.3),
            pointerType: "mouse",
          }),
        );
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    };
    const first = setTimeout(sweep, 250);
    const timer = setInterval(sweep, SWEEP_EVERY);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <span ref={ref} className="landing-preview-particles">
      <ParticleMenu items={particleItems} ariaLabel="" />
    </span>
  );
}

/** In ring order: the first sits at the top and the rest go round clockwise. */
export const blockPreviews: Record<string, () => ReactNode> = {
  "particle-menu": ParticleMenuPreview,
  "arc-reel": ArcReelPreview,
  "ascii-terrain": AsciiTerrainPreview,
  "text-scramble": TextScramblePreview,
  "spiral-text": SpiralTextPreview,
  "task-steps": TaskStepsPreview,
  "ascii-lens": AsciiLensPreview,
  "text-banner": TextBannerPreview,
};
