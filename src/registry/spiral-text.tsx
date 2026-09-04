"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface SpiralTextProps {
  text: string;
  density?: number;
  tightenStrength?: number;
  rippleDuration?: number;
  className?: string;
}

type Interaction = "resting" | "tightening" | "releasing" | "pressed-reduced";

const VIEWBOX_SIZE = 640;
const CENTER = VIEWBOX_SIZE / 2;
const OUTER_RADIUS = 448;
const HOLD_DURATION = 1200;
const TAU = Math.PI * 2;
const RELEASE_OVERSHOOT = 0.2;
const RIPPLE_HEIGHT = 18;
const RIPPLE_WAVELENGTH = 0.18;
const FONT_SIZE = 14;
const LETTER_SPACING = 0.8;
const GLYPH_ADVANCE = FONT_SIZE * 0.6 + LETTER_SPACING;

type SpiralMotion = {
  density: number;
  tension?: number;
  tightenStrength: number;
  rippleProgress?: number;
  rippleStrength?: number;
};

function spiralPoint(
  progress: number,
  { density, tension = 0, tightenStrength, rippleProgress, rippleStrength = 0 }: SpiralMotion,
) {
  const safeDensity = Math.min(1.6, Math.max(0.65, density));
  const turns = 13.5 * safeDensity;
  const radialScale = 1 - tightenStrength * tension * 0.4;
  const angle = progress * turns * TAU - Math.PI / 2;
  let radius = (5 + progress * (OUTER_RADIUS - 5)) * radialScale;

  if (rippleProgress !== undefined) {
    const waveFront = rippleProgress * 1.12 - 0.02;
    const distance = progress - waveFront;
    const envelopeWidth = distance > 0 ? 0.055 : 0.18;
    const envelope = Math.exp(-Math.pow(distance / envelopeWidth, 2));
    const oscillation = Math.cos((distance / RIPPLE_WAVELENGTH) * TAU);
    const attack = Math.min(1, rippleProgress / 0.12);
    const decay = attack * Math.pow(1 - rippleProgress, 0.75);
    radius += oscillation * envelope * decay * rippleStrength * RIPPLE_HEIGHT;
  }

  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function createGlyphLayout(text: string, density: number) {
  const safeDensity = Math.min(1.6, Math.max(0.65, density));
  const turns = 13.5 * safeDensity;
  const samples = Math.ceil(turns * 42);
  const motion = { density, tightenStrength: 0 };
  const points = Array.from({ length: samples + 1 }, (_, index) => spiralPoint(index / samples, motion));
  const cumulativeLengths = [0];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    cumulativeLengths.push(
      cumulativeLengths[index - 1] + Math.hypot(current.x - previous.x, current.y - previous.y),
    );
  }

  const pathLength = cumulativeLengths.at(-1) ?? 0;
  const glyphCount = Math.max(1, Math.floor(pathLength / GLYPH_ADVANCE));
  const phrase = `${text.trim()} `;
  const characters = phrase.repeat(Math.ceil(glyphCount / phrase.length)).slice(0, glyphCount);
  const progresses: number[] = [];
  const rotations: string[] = [];
  let segment = 1;

  for (let index = 0; index < glyphCount; index += 1) {
    const targetLength = index * GLYPH_ADVANCE;
    while (segment < cumulativeLengths.length - 1 && cumulativeLengths[segment] < targetLength) {
      segment += 1;
    }

    const segmentStart = cumulativeLengths[segment - 1];
    const segmentLength = cumulativeLengths[segment] - segmentStart;
    const segmentProgress = segmentLength === 0 ? 0 : (targetLength - segmentStart) / segmentLength;
    const progress = (segment - 1 + segmentProgress) / samples;
    const radius = 5 + progress * (OUTER_RADIUS - 5);
    const angle = progress * turns * TAU - Math.PI / 2;
    const radialVelocity = OUTER_RADIUS - 5;
    const angularVelocity = turns * TAU;
    const tangentX = Math.cos(angle) * radialVelocity - Math.sin(angle) * radius * angularVelocity;
    const tangentY = Math.sin(angle) * radialVelocity + Math.cos(angle) * radius * angularVelocity;

    progresses.push(progress);
    rotations.push(((Math.atan2(tangentY, tangentX) * 180) / Math.PI).toFixed(2));
  }

  return { characters, progresses, rotations: rotations.join(" ") };
}

function glyphCoordinates(progresses: number[], motion: SpiralMotion) {
  const x: string[] = [];
  const y: string[] = [];

  for (const progress of progresses) {
    const point = spiralPoint(progress, motion);
    x.push(point.x.toFixed(2));
    y.push(point.y.toFixed(2));
  }

  return { x: x.join(" "), y: y.join(" ") };
}

function releaseTensionAt(progress: number, releaseTension: number) {
  const recoil = Math.pow(1 - progress, 3);
  const overshoot = Math.pow(Math.sin(Math.PI * progress), 2) * RELEASE_OVERSHOOT;
  return releaseTension * (recoil - overshoot);
}

export function SpiralText({
  text,
  density = 1,
  tightenStrength = 0.35,
  rippleDuration = 1100,
  className,
}: SpiralTextProps) {
  const generatedId = useId();
  const gridId = `a1ui-spiral-grid-${generatedId.replaceAll(":", "")}`;
  const textRef = useRef<SVGTextElement>(null);
  const frameRef = useRef(0);
  const holdStartedAtRef = useRef(0);
  const tensionRef = useRef(0);
  const [interaction, setInteraction] = useState<Interaction>("resting");

  const safeTightenStrength = Math.min(0.7, Math.max(0.08, tightenStrength));
  const glyphLayout = useMemo(() => createGlyphLayout(text, density), [density, text]);
  const restingCoordinates = useMemo(
    () =>
      glyphCoordinates(glyphLayout.progresses, {
        density,
        tightenStrength: safeTightenStrength,
      }),
    [density, glyphLayout.progresses, safeTightenStrength],
  );

  const draw = useCallback(
    (tension: number, rippleProgress?: number, rippleStrength = 0) => {
      const coordinates = glyphCoordinates(glyphLayout.progresses, {
        density,
        tension,
        tightenStrength: safeTightenStrength,
        rippleProgress,
        rippleStrength,
      });
      textRef.current?.setAttribute("x", coordinates.x);
      textRef.current?.setAttribute("y", coordinates.y);
    },
    [density, glyphLayout.progresses, safeTightenStrength],
  );

  const stopAnimation = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => stopAnimation, [stopAnimation]);

  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    stopAnimation();

    if (prefersReducedMotion()) {
      setInteraction("pressed-reduced");
      return;
    }

    setInteraction("tightening");
    holdStartedAtRef.current = performance.now();

    const tighten = (now: number) => {
      tensionRef.current = Math.min(1, (now - holdStartedAtRef.current) / HOLD_DURATION);
      draw(tensionRef.current);
      if (tensionRef.current < 1) frameRef.current = window.requestAnimationFrame(tighten);
    };

    frameRef.current = window.requestAnimationFrame(tighten);
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (interaction === "resting") return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    stopAnimation();

    if (interaction === "pressed-reduced") {
      setInteraction("resting");
      return;
    }

    const releaseStartedAt = performance.now();
    const releaseTension = tensionRef.current;
    setInteraction("releasing");

    const ripple = (now: number) => {
      const progress = Math.min(1, (now - releaseStartedAt) / Math.max(300, rippleDuration));
      const rippleStrength = Math.min(0.55, 0.1 + releaseTension * 0.45);
      tensionRef.current = releaseTensionAt(progress, releaseTension);
      draw(tensionRef.current, progress, rippleStrength);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(ripple);
        return;
      }

      tensionRef.current = 0;
      textRef.current?.setAttribute("x", restingCoordinates.x);
      textRef.current?.setAttribute("y", restingCoordinates.y);
      setInteraction("resting");
    };

    frameRef.current = window.requestAnimationFrame(ripple);
  };

  return (
    <div
      role="img"
      aria-label={text.trim()}
      data-interaction={interaction}
      className={[
        "bg-background text-foreground relative isolate aspect-square w-full touch-none overflow-hidden select-none data-[interaction=pressed-reduced]:opacity-70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={handlePointerDown}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <svg aria-hidden="true" className="size-full" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
        <defs>
          <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.75" fill="currentColor" opacity="0.16" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
        <text
          ref={textRef}
          x={restingCoordinates.x}
          y={restingCoordinates.y}
          rotate={glyphLayout.rotations}
          fill="currentColor"
          fontSize={FONT_SIZE}
          letterSpacing={LETTER_SPACING}
          xmlSpace="preserve"
        >
          {glyphLayout.characters}
        </text>
      </svg>
    </div>
  );
}
