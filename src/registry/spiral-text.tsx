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

function spiralPath({
  density,
  tension = 0,
  tightenStrength,
  rippleProgress,
  rippleStrength = 0,
}: {
  density: number;
  tension?: number;
  tightenStrength: number;
  rippleProgress?: number;
  rippleStrength?: number;
}) {
  const safeDensity = Math.min(1.6, Math.max(0.65, density));
  const turns = 13.5 * safeDensity * (1 + tightenStrength * tension);
  const outerRadius = OUTER_RADIUS * (1 - tension * 0.055);
  const samples = Math.ceil(turns * 42);
  const points: string[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples;
    const angle = progress * turns * TAU - Math.PI / 2;
    let radius = 5 + progress * (outerRadius - 5);

    if (rippleProgress !== undefined) {
      const wave = rippleProgress * 1.16 - 0.04;
      const distance = progress - wave;
      const envelope = Math.exp(-Math.pow(distance / 0.075, 2));
      const decay = Math.pow(1 - rippleProgress, 1.5);
      radius += Math.sin(distance * 92) * envelope * decay * rippleStrength * 26;
    }

    const x = CENTER + Math.cos(angle) * radius;
    const y = CENTER + Math.sin(angle) * radius;
    points.push(`${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return points.join(" ");
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function SpiralText({
  text,
  density = 1,
  tightenStrength = 0.35,
  rippleDuration = 1100,
  className,
}: SpiralTextProps) {
  const generatedId = useId();
  const pathId = `a1ui-spiral-${generatedId.replaceAll(":", "")}`;
  const gridId = `${pathId}-grid`;
  const pathRef = useRef<SVGPathElement>(null);
  const frameRef = useRef(0);
  const holdStartedAtRef = useRef(0);
  const tensionRef = useRef(0);
  const [interaction, setInteraction] = useState<Interaction>("resting");

  const safeTightenStrength = Math.min(0.7, Math.max(0.08, tightenStrength));
  const restingPath = useMemo(
    () => spiralPath({ density, tightenStrength: safeTightenStrength }),
    [density, safeTightenStrength],
  );
  const repeatedText = useMemo(() => `${text.trim()} `.repeat(120), [text]);

  const draw = useCallback(
    (tension: number, rippleProgress?: number, rippleStrength = 0) => {
      pathRef.current?.setAttribute(
        "d",
        spiralPath({
          density,
          tension,
          tightenStrength: safeTightenStrength,
          rippleProgress,
          rippleStrength,
        }),
      );
    },
    [density, safeTightenStrength],
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
      const remainingTension = releaseTension * (1 - easeOutCubic(progress));
      draw(remainingTension, progress, releaseTension);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(ripple);
        return;
      }

      tensionRef.current = 0;
      pathRef.current?.setAttribute("d", restingPath);
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
          <path ref={pathRef} id={pathId} d={restingPath} fill="none" />
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
        <text fill="currentColor" fontSize="14" letterSpacing="0.8">
          <textPath href={`#${pathId}`}>{repeatedText}</textPath>
        </text>
      </svg>
    </div>
  );
}
