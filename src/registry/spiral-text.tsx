"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

type CoilState = { scale: number; opacity: number; scaleVelocity?: number; opacityVelocity?: number };
type CoilGeometry = { progress: number; radius: number };

const HOLD_DURATION = 450;
const RIPPLE_WIDTH = 0.3;
const RIPPLE_HEIGHT = 24;
const KEYFRAME_STEPS = 90;

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function keyframe(state: CoilState, offset: number): Keyframe {
  return { offset, transform: `scale(${state.scale.toFixed(5)})`, opacity: state.opacity };
}

function holdKeyframes(start: CoilState, tightenStrength: number): Keyframe[] {
  return Array.from({ length: 91 }, (_, index) => {
    const progress = index / 90;
    const seconds = (progress * HOLD_DURATION) / 1000;
    const settle = 1 - smoothstep((progress - 0.8) / 0.2);
    const spring = (value: number, target: number, velocity = 0) => {
      const displacement = value - target;
      return (
        target + (displacement + (velocity + 18 * displacement) * seconds) * Math.exp(-18 * seconds) * settle
      );
    };
    return keyframe(
      {
        scale: spring(start.scale, 1 - tightenStrength * 0.4, start.scaleVelocity),
        opacity: Math.min(1, Math.max(0, spring(start.opacity, 1, start.opacityVelocity))),
      },
      progress,
    );
  });
}

function rippleKeyframes(
  coil: CoilGeometry,
  start: CoilState,
  tension: number,
  duration: number,
): Keyframe[] {
  return Array.from({ length: KEYFRAME_STEPS + 1 }, (_, index) => {
    const progress = index / KEYFRAME_STEPS;
    const waveFront = progress * 1.4;
    const attack = smoothstep(progress / 0.04);
    const life = attack * (1 - smoothstep((progress - 0.78) / 0.22));
    const wave = (1 - smoothstep(Math.abs(coil.progress - waveFront) / RIPPLE_WIDTH)) * life;
    // The leading edge releases each ring, so the outward swell stays circular.
    const releaseAmount = smoothstep((waveFront + RIPPLE_WIDTH - coil.progress) / RIPPLE_WIDTH) * attack;
    const seconds = (progress * duration) / 1000;
    const momentum = seconds * Math.exp(-seconds / 0.08) * (1 - smoothstep(progress / 0.2));
    return keyframe(
      {
        scale:
          start.scale +
          (1 - start.scale) * releaseAmount +
          (wave * RIPPLE_HEIGHT * (0.35 + tension * 0.65)) / Math.max(40, coil.radius) +
          (start.scaleVelocity ?? 0) * momentum,
        opacity: Math.min(
          1,
          Math.max(
            0,
            (start.opacity + (1 - start.opacity) * releaseAmount) * (1 - wave * 0.45) +
              (start.opacityVelocity ?? 0) * momentum,
          ),
        ),
      },
      progress,
    );
  });
}

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

function readCoil(element: HTMLDivElement | null): CoilState {
  if (!element) return { scale: 1, opacity: 1 };
  const style = getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
  return { scale: Math.hypot(matrix.a, matrix.b), opacity: Number(style.opacity) };
}

const VIEWBOX_SIZE = 640;
const CENTER = VIEWBOX_SIZE / 2;
const OUTER_RADIUS = 448;
const TAU = Math.PI * 2;
const FONT_SIZE = 14;
const LETTER_SPACING = 0.8;
const GLYPH_ADVANCE = FONT_SIZE * 0.6 + LETTER_SPACING;

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
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const animationsRef = useRef<Animation[]>([]);
  const keyframesRef = useRef<Keyframe[][]>([]);
  const durationRef = useRef(0);
  const interactionRef = useRef<Interaction>("resting");
  const rotatingRef = useRef(rotating);
  const pointerRef = useRef<number | null>(null);
  const motionActiveRef = useRef(true);

  const safeTightenStrength = Math.min(0.7, Math.max(0.08, tightenStrength));
  const safeRotationSpeed = Number.isFinite(rotationSpeed) && rotationSpeed > 0 ? rotationSpeed : 1;
  const safeRippleDuration = Number.isFinite(rippleDuration) ? Math.max(300, rippleDuration) : 1800;
  const coils = useMemo(() => createGlyphLayout(text, density), [density, text]);

  const setInteraction = useCallback((value: Interaction) => {
    interactionRef.current = value;
    if (rootRef.current) rootRef.current.dataset.interaction = value;
  }, []);

  const stopAnimation = useCallback(() => {
    for (const animation of animationsRef.current) {
      animation.onfinish = null;
      animation.cancel();
    }
    animationsRef.current = [];
    keyframesRef.current = [];
  }, []);

  const readMotion = () =>
    coilRefs.current.map((element, index) => {
      const state = readCoil(element);
      const time = animationsRef.current[index]?.currentTime;
      const frames = keyframesRef.current[index];
      if (!frames || typeof time !== "number" || time < 0 || time >= durationRef.current) return state;
      // Sample the existing browser timeline, including velocity, before replacing its motion.
      const step = durationRef.current / (frames.length - 1);
      const frame = Math.max(0, Math.min(frames.length - 2, Math.ceil(time / step) - 1));
      const from = frames[frame];
      const to = frames[frame + 1];
      const scale = (value: Keyframe) => Number(String(value.transform).match(/scale\(([^)]+)\)/)?.[1] ?? 1);
      return {
        ...state,
        scaleVelocity: ((scale(to) - scale(from)) / step) * 1000,
        opacityVelocity: ((Number(to.opacity) - Number(from.opacity)) / step) * 1000,
      };
    });

  const syncRotation = useCallback(() => {
    if (rotationRef.current) {
      const pressed = interactionRef.current === "tightening" || interactionRef.current === "pressed-reduced";
      rotationRef.current.style.animationPlayState =
        rotatingRef.current && motionActiveRef.current && !pressed ? "running" : "paused";
    }
  }, []);

  useEffect(() => {
    rotatingRef.current = rotating;
    syncRotation();
  }, [rotating, syncRotation]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.closest("[inert]") || !document.fonts) return;
    const canvases = canvasRefs.current.slice(0, coils.length);
    const layers = coilRefs.current.slice(0, coils.length);
    let disposed = false;
    let fontsReady = false;
    let cacheKey = "";
    const paint = () => {
      if (disposed || !fontsReady || !root.clientWidth) return;
      const text = root.querySelector("text");
      if (!text) return;
      const style = getComputedStyle(text);
      const font = `${style.fontStyle} ${style.fontWeight} ${FONT_SIZE}px ${style.fontFamily}`;
      const pixelRatio = window.devicePixelRatio || 1;
      const key = `${root.clientWidth}|${pixelRatio}|${font}|${style.fill}`;
      if (key === cacheKey) return;
      cacheKey = key;
      coils.forEach((coil, index) => {
        const canvas = canvases[index];
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        // Cache glyphs once at display resolution with some headroom for the swell.
        // Transforming these bitmaps avoids re-rasterizing SVG text on every re-grab.
        const maxScale = 1 + RIPPLE_HEIGHT / Math.max(40, coil.radius);
        const size = Math.ceil((coil.diameter / VIEWBOX_SIZE) * root.clientWidth * pixelRatio * maxScale);
        canvas.width = canvas.height = size;
        context.font = font;
        context.fillStyle = style.fill;
        const scale = size / coil.diameter;
        const origin = CENTER - coil.diameter / 2;
        const x = coil.x.split(" ").map(Number);
        const y = coil.y.split(" ").map(Number);
        const angles = coil.rotations.split(" ").map(Number);
        Array.from(coil.characters).forEach((character, glyph) => {
          const angle = (angles[glyph] * Math.PI) / 180;
          const cos = Math.cos(angle) * scale;
          const sin = Math.sin(angle) * scale;
          context.setTransform(cos, sin, -sin, cos, (x[glyph] - origin) * scale, (y[glyph] - origin) * scale);
          context.fillText(character, 0, 0);
        });
        canvas.dataset.ready = "true";
        canvas.style.visibility = "visible";
        const svg = layers[index]?.querySelector("svg");
        if (svg) svg.style.visibility = "hidden";
      });
    };
    const fontsChanged = () => {
      cacheKey = "";
      paint();
    };
    const resize = new ResizeObserver(paint);
    const theme = new MutationObserver(paint);
    // Inherited font/color may change on any ancestor, without changing the ring geometry.
    for (let element: HTMLElement | null = root; element; element = element.parentElement) {
      theme.observe(element, { attributes: true, attributeFilter: ["class", "style"] });
    }
    void document.fonts.ready.then(() => {
      if (disposed) return;
      fontsReady = true;
      paint();
      resize.observe(root);
      document.fonts.addEventListener("loadingdone", fontsChanged);
      window.addEventListener("resize", paint);
    });
    return () => {
      disposed = true;
      resize.disconnect();
      theme.disconnect();
      document.fonts.removeEventListener("loadingdone", fontsChanged);
      window.removeEventListener("resize", paint);
      for (const canvas of canvases) {
        if (!canvas) continue;
        canvas.width = canvas.height = 0;
        delete canvas.dataset.ready;
        canvas.style.visibility = "hidden";
      }
      for (const coil of layers) {
        const svg = coil?.querySelector("svg");
        if (svg) svg.style.visibility = "visible";
      }
    };
  }, [coils]);

  const animateCoils = (frames: Keyframe[][], duration: number, phase: "tightening" | "releasing") => {
    // One shared timeline keeps every ring synchronized. The browser interpolates transform
    // and opacity without a JavaScript callback or DOM writes on every frame.
    const startedAt = document.timeline.currentTime;
    const animations: Animation[] = [];
    for (let index = 0; index < coils.length; index += 1) {
      const element = coilRefs.current[index];
      if (!element) continue;
      const last = frames[index].at(-1)!;
      element.style.transform = String(last.transform);
      element.style.opacity = String(last.opacity);
      const animation = element.animate(frames[index], {
        duration,
        fill: "both",
        easing: "linear",
        id: `a1ui-spiral-${phase}`,
      });
      if (typeof startedAt === "number") animation.startTime = startedAt;
      animations.push(animation);
    }
    animationsRef.current = animations;
    keyframesRef.current = frames;
    durationRef.current = duration;
    const last = animations.at(-1);
    if (last)
      last.onfinish = () => {
        if (animationsRef.current !== animations) return;
        stopAnimation();
        if (phase === "releasing") setInteraction("resting");
        syncRotation();
      };
  };

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
      for (const coil of coilRefs.current) {
        if (!coil) continue;
        coil.style.transform = "scale(1)";
        coil.style.opacity = "1";
      }
      setInteraction("resting");
    };
    const syncMotion = () => {
      const active = visible && !document.hidden && !preference.matches;
      motionActiveRef.current = active;
      // Prepare visible, interactive rings before a press rather than promoting them on demand.
      const prepare = active && !root.closest("[inert]");
      for (const coil of coilRefs.current) {
        if (coil) coil.style.willChange = prepare ? "transform, opacity" : "auto";
      }
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
  }, [coils, safeTightenStrength, setInteraction, stopAnimation, syncRotation]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const startingCoils = readMotion();
    stopAnimation();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInteraction("pressed-reduced");
      syncRotation();
      return;
    }

    setInteraction("tightening");
    syncRotation();
    animateCoils(
      startingCoils.map((start) => holdKeyframes(start, safeTightenStrength)),
      HOLD_DURATION,
      "tightening",
    );
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const startingCoils = readMotion();
    stopAnimation();

    if (interactionRef.current === "pressed-reduced") {
      setInteraction("resting");
      syncRotation();
      return;
    }

    const minimumScale = Math.min(...startingCoils.map((coil) => coil.scale));
    const tension = Math.min(1, Math.max(0, (1 - minimumScale) / (safeTightenStrength * 0.4)));
    setInteraction("releasing");
    syncRotation();
    animateCoils(
      coils.map((coil, index) => rippleKeyframes(coil, startingCoils[index], tension, safeRippleDuration)),
      safeRippleDuration,
      "releasing",
    );
  };

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={text.trim()}
      data-interaction="resting"
      className={[
        "bg-background text-foreground relative isolate aspect-square w-full touch-none overflow-hidden select-none data-[interaction=pressed-reduced]:opacity-70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={handlePointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
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
            }}
          >
            <canvas
              ref={(element) => {
                canvasRefs.current[index] = element;
              }}
              aria-hidden="true"
              className="absolute inset-0 size-full"
              style={{ visibility: "hidden" }}
            />
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
