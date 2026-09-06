"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
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
  rotating?: boolean;
  rotationSpeed?: number;
  className?: string;
}

type Interaction = "resting" | "tightening" | "releasing" | "pressed-reduced";
type CoilState = { scale: number; opacity: number };

function readCoil(element: HTMLDivElement | null): CoilState {
  return {
    scale: Number(element?.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? 1),
    opacity: Number(element?.style.opacity || 1),
  };
}

function paintCoil(element: HTMLDivElement, scale: number, opacity: number) {
  element.style.transform = `scale(${scale.toFixed(5)})`;
  element.style.opacity = String(opacity);
}

const VIEWBOX_SIZE = 640;
const CENTER = VIEWBOX_SIZE / 2;
const OUTER_RADIUS = 448;
const HOLD_DURATION = 1200;
const TAU = Math.PI * 2;
const RIPPLE_WIDTH = 0.3;
const RIPPLE_HEIGHT = 24;
const FONT_SIZE = 14;
const LETTER_SPACING = 0.8;
const GLYPH_ADVANCE = FONT_SIZE * 0.6 + LETTER_SPACING;

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function createGlyphLayout(text: string, density: number) {
  const safeDensity = Math.min(1.6, Math.max(0.65, density));
  const turns = 13.5 * safeDensity;
  const phrase = Array.from(`${text.trim()} `);
  let characterIndex = 0;

  return Array.from({ length: Math.ceil(turns) }, (_, index) => {
    const progress = Math.min(1, (index + 0.5) / turns);
    const radius = 5 + progress * (OUTER_RADIUS - 5);
    const glyphCount = Math.max(1, Math.floor((TAU * radius) / GLYPH_ADVANCE));
    const characters: string[] = [];
    const x: string[] = [];
    const y: string[] = [];
    const rotations: string[] = [];

    // Every glyph in a layer shares a radius, so scaling the layer preserves a circle.
    // Divide the full circumference evenly to avoid a gap or overlap at the seam.
    for (let glyphIndex = 0; glyphIndex < glyphCount; glyphIndex += 1) {
      const angle = (glyphIndex / glyphCount) * TAU - Math.PI / 2;
      characters.push(phrase[characterIndex % phrase.length]);
      characterIndex += 1;
      x.push((CENTER + Math.cos(angle) * radius).toFixed(2));
      y.push((CENTER + Math.sin(angle) * radius).toFixed(2));
      rotations.push(((angle * 180) / Math.PI + 90).toFixed(2));
    }

    return {
      progress,
      radius,
      diameter: 2 * (radius + FONT_SIZE),
      characters: characters.join(""),
      x: x.join(" "),
      y: y.join(" "),
      rotations: rotations.join(" "),
    };
  });
}

export function SpiralText({
  text,
  density = 1,
  tightenStrength = 0.35,
  rippleDuration = 1800,
  rotating = true,
  rotationSpeed = 1,
  className,
}: SpiralTextProps) {
  const generatedId = useId();
  const gridId = `a1ui-spiral-grid-${generatedId.replaceAll(":", "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef<HTMLDivElement>(null);
  const coilRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef(0);
  const tensionRef = useRef(0);
  const pointerRef = useRef<number | null>(null);
  const motionActiveRef = useRef(true);
  const [interaction, setInteraction] = useState<Interaction>("resting");

  const safeTightenStrength = Math.min(0.7, Math.max(0.08, tightenStrength));
  const safeRotationSpeed = Number.isFinite(rotationSpeed) && rotationSpeed > 0 ? rotationSpeed : 1;
  const safeRippleDuration = Number.isFinite(rippleDuration) ? Math.max(300, rippleDuration) : 1800;
  const coils = useMemo(() => createGlyphLayout(text, density), [density, text]);

  // Glyphs are laid out once. Animation updates only a small number of composited layers.
  const draw = useCallback(
    (tension: number, rippleProgress?: number, startingCoils?: CoilState[]) => {
      const waveFront = rippleProgress === undefined ? -1 : smoothstep(rippleProgress) * 1.4;
      const life =
        rippleProgress === undefined
          ? 0
          : smoothstep(rippleProgress / 0.2) * (1 - smoothstep((rippleProgress - 0.78) / 0.22));
      for (let index = 0; index < coils.length; index += 1) {
        const element = coilRefs.current[index];
        if (!element) continue;
        const coil = coils[index];
        const wave = (1 - smoothstep(Math.abs(coil.progress - waveFront) / RIPPLE_WIDTH)) * life;
        // Each coil stays gathered until the leading edge reaches it.
        const releaseAmount =
          rippleProgress === undefined
            ? 0
            : smoothstep((waveFront + RIPPLE_WIDTH - coil.progress) / RIPPLE_WIDTH) *
              smoothstep(rippleProgress / 0.12);
        const start = startingCoils?.[index] ?? {
          scale: 1 - safeTightenStrength * tension * 0.4,
          opacity: 1,
        };
        const scale =
          start.scale +
          (1 - start.scale) * releaseAmount +
          (wave * RIPPLE_HEIGHT * (0.35 + tension * 0.65)) / Math.max(40, coil.radius);
        const opacity = start.opacity + (1 - start.opacity) * releaseAmount;
        paintCoil(element, scale, opacity * (1 - wave * 0.45));
      }
    },
    [coils, safeTightenStrength],
  );

  const stopAnimation = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  }, []);

  const syncRotation = useEffectEvent(() => {
    if (rotationRef.current) {
      rotationRef.current.style.animationPlayState =
        rotating && motionActiveRef.current ? "running" : "paused";
    }
  });

  useEffect(() => {
    syncRotation();
  }, [rotating]);

  useEffect(() => {
    const root = rootRef.current;
    const rotation = rotationRef.current;
    if (!root || !rotation) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const reset = () => {
      stopAnimation();
      if (pointerRef.current !== null && root.hasPointerCapture?.(pointerRef.current)) {
        root.releasePointerCapture(pointerRef.current);
      }
      pointerRef.current = null;
      tensionRef.current = 0;
      draw(0);
      setInteraction("resting");
    };
    const syncMotion = () => {
      const active = visible && !document.hidden && !preference.matches;
      motionActiveRef.current = active;
      syncRotation();
      if (!active) reset();
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            syncMotion();
          });
    observer?.observe(root);
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    reset();
    syncMotion();
    return () => {
      stopAnimation();
      observer?.disconnect();
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, [draw, stopAnimation]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    stopAnimation();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInteraction("pressed-reduced");
      return;
    }

    setInteraction("tightening");
    const startedAt = performance.now();
    const startingTension = tensionRef.current;
    const startingCoils = coilRefs.current.map(readCoil);
    const tighten = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / HOLD_DURATION);
      const eased = smoothstep(progress);
      tensionRef.current = startingTension + (1 - startingTension) * eased;
      for (let index = 0; index < coils.length; index += 1) {
        const element = coilRefs.current[index];
        if (!element) continue;
        const start = startingCoils[index];
        paintCoil(
          element,
          start.scale + (1 - safeTightenStrength * 0.4 - start.scale) * eased,
          start.opacity + (1 - start.opacity) * eased,
        );
      }
      if (progress < 1) frameRef.current = window.requestAnimationFrame(tighten);
    };
    frameRef.current = window.requestAnimationFrame(tighten);
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stopAnimation();

    if (interaction === "pressed-reduced") {
      setInteraction("resting");
      return;
    }

    const releaseStartedAt = performance.now();
    const releaseTension = tensionRef.current;
    const startingCoils = coilRefs.current.map(readCoil);
    setInteraction("releasing");
    const ripple = (now: number) => {
      const progress = Math.min(1, (now - releaseStartedAt) / safeRippleDuration);
      tensionRef.current = releaseTension * (1 - smoothstep(progress));
      draw(releaseTension, progress, startingCoils);
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(ripple);
        return;
      }
      tensionRef.current = 0;
      draw(0);
      setInteraction("resting");
    };
    frameRef.current = window.requestAnimationFrame(ripple);
  };

  return (
    <div
      ref={rootRef}
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
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      >
        <defs>
          <pattern id={gridId} width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.75" fill="currentColor" opacity="0.16" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>
      <div
        ref={rotationRef}
        data-spiral-rotation=""
        className="relative size-full animate-spin motion-reduce:animate-none"
        style={{
          animationDuration: `${60 / safeRotationSpeed}s`,
          animationPlayState: rotating ? "running" : "paused",
        }}
      >
        {coils.map((coil, index) => (
          <div
            key={index}
            ref={(element) => {
              coilRefs.current[index] = element;
            }}
            data-spiral-coil={index}
            className="pointer-events-none absolute"
            style={{
              width: `${(coil.diameter / VIEWBOX_SIZE) * 100}%`,
              height: `${(coil.diameter / VIEWBOX_SIZE) * 100}%`,
              left: `${((VIEWBOX_SIZE - coil.diameter) / VIEWBOX_SIZE) * 50}%`,
              top: `${((VIEWBOX_SIZE - coil.diameter) / VIEWBOX_SIZE) * 50}%`,
              willChange: interaction === "resting" ? undefined : "transform, opacity",
            }}
          >
            <svg
              aria-hidden="true"
              className="size-full overflow-visible"
              viewBox={`${CENTER - coil.diameter / 2} ${CENTER - coil.diameter / 2} ${coil.diameter} ${coil.diameter}`}
            >
              <text
                x={coil.x}
                y={coil.y}
                rotate={coil.rotations}
                fill="currentColor"
                fontSize={FONT_SIZE}
                letterSpacing={LETTER_SPACING}
                xmlSpace="preserve"
              >
                {coil.characters}
              </text>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
