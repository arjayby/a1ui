"use client";

import {
  animate,
  cancelFrame,
  frame,
  motionValue,
  spring,
  type FrameData,
  type KeyframeGenerator,
  type MotionValue,
} from "motion";
import { motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
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
type CoilGeometry = { progress: number; radius: number };
type CoilValues = { scale: MotionValue<number>; opacity: MotionValue<number> };
// A value that follows a target with a Motion spring, advanced on the spiral's own clock so a
// retarget always starts from the value and velocity that are on screen.
type Follower = {
  value: number;
  target: number;
  elapsed: number;
  generator: KeyframeGenerator<number> | null;
};
// `releaseAt` is the moment on the wave's clock when its leading edge lets the ring go.
type Ring = { scale: Follower; opacity: Follower; releaseAt: number };
type Wave = { elapsed: number; duration: number; height: number; frequency: number };
type Settings = {
  tightenStrength: number;
  rippleDuration: number;
  degreesPerSecond: number;
  rotating: boolean;
  reducedMotion: boolean;
};

const RIPPLE_WIDTH = 0.3;
const RIPPLE_HEIGHT = 24;
const RIPPLE_DIM = 0.45;
// The crest starts at the center and ends this far along the radius, past the outer ring.
const RIPPLE_TRAVEL = 1.4;
// Natural frequencies of the critically damped springs, in radians per second: a ring closes
// under a press in about a third of a second, and the spin changes speed in about half.
const GRIP_FREQUENCY = 18;
const SPIN_FREQUENCY = 12;
const PRESSED_OPACITY = 0.7;
const FADE = { duration: 0.15, ease: "easeOut" } as const;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function smoothstep(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

// Height of the travelling crest at a ring, from 0 to 1, for a wave that is `progress` through.
function crestAt(ring: number, progress: number) {
  const life = smoothstep(progress / 0.04) * (1 - smoothstep((progress - 0.78) / 0.22));
  return (1 - smoothstep(Math.abs(ring - progress * RIPPLE_TRAVEL) / RIPPLE_WIDTH)) * life;
}

function follower(value: number): Follower {
  return { value, target: value, elapsed: 0, generator: null };
}
function velocityOf(follow: Follower) {
  return follow.generator?.velocity?.(follow.elapsed) ?? 0;
}
function advance(follow: Follower, milliseconds: number) {
  if (!follow.generator) return;
  follow.elapsed += milliseconds;
  // Motion's generators are analytic, so the response is the same at any refresh rate.
  const state = follow.generator.next(follow.elapsed);
  follow.value = state.value;
  if (state.done) follow.generator = null;
}
function springTo(follow: Follower, target: number, frequency: number, velocity = velocityOf(follow)) {
  follow.generator = spring({
    keyframes: [follow.value, target],
    velocity,
    // Stiffness ω² with damping 2ω is critically damped: it settles without overshoot. Motion's
    // duration-based springs would drop the velocity a retarget hands them, so set both directly.
    stiffness: frequency * frequency,
    damping: 2 * frequency,
    mass: 1,
    restDelta: 0.0001,
    restSpeed: 0.001,
  });
  follow.target = target;
  follow.elapsed = 0;
}
function jump(follow: Follower, value: number) {
  Object.assign(follow, follower(value));
}

/**
 * Drives the whole figure from one callback on Motion's frame loop. Each ring's scale and
 * opacity is a spring, and the ripple is added on top of those springs, so a press, a release
 * or a new prop only ever changes a target: nothing restarts from a stored pose.
 */
function createSpiralMotion(root: HTMLElement, rotation: MotionValue<number>, dim: MotionValue<number>) {
  let settings: Settings | null = null;
  let geometry: CoilGeometry[] = [];
  let values: CoilValues[] = [];
  let wave: Wave | null = null;
  let interaction: Interaction = "resting";
  let pointer: number | null = null;
  let visible = true;
  let awake = false;
  let running = false;
  let stirring = false;
  let angle = rotation.get();
  const rings: Ring[] = [];
  // Degrees per second. Springing the speed rather than the angle lets a pause, a resume or a
  // new rotationSpeed keep the current angle and ease the rate of turn.
  const spin = follower(0);

  const setInteraction = (value: Interaction) => {
    interaction = value;
    root.dataset.interaction = value;
  };
  const heldScale = () => 1 - (settings?.tightenStrength ?? 0) * 0.4;
  const swellOf = (index: number) => (wave ? wave.height / Math.max(40, geometry[index].radius) : 0);
  const releaseTime = (index: number, duration: number) =>
    (Math.max(0, geometry[index].progress - RIPPLE_WIDTH) / RIPPLE_TRAVEL) * duration;

  function show(index: number) {
    const ring = rings[index];
    const crest = wave ? crestAt(geometry[index].progress, wave.elapsed / wave.duration) : 0;
    // Every glyph in a ring shares a radius, so scaling the ring keeps the swell circular.
    values[index].scale.set(ring.scale.value + crest * swellOf(index));
    values[index].opacity.set(clamp(ring.opacity.value * (1 - crest * RIPPLE_DIM)));
  }

  // Runs in Motion's update step, so the values it sets are rendered in the same frame.
  function tick({ delta }: FrameData) {
    advance(spin, delta);
    if (spin.value !== 0) {
      angle = (angle + (spin.value * delta) / 1000) % 360;
      rotation.set(angle);
    }
    if (stirring) {
      // Motion clamps long gaps between frames, so a stalled tab cannot skip the wave ahead.
      if (wave) wave.elapsed = Math.min(wave.duration, wave.elapsed + delta);
      let moving = false;
      for (let index = 0; index < rings.length; index += 1) {
        const ring = rings[index];
        if (wave && wave.elapsed >= ring.releaseAt) {
          ring.releaseAt = Infinity;
          springTo(ring.scale, 1, wave.frequency);
        }
        advance(ring.scale, delta);
        advance(ring.opacity, delta);
        moving ||= Boolean(ring.scale.generator || ring.opacity.generator);
        show(index);
      }
      if (wave && wave.elapsed >= wave.duration) wave = null;
      if (!wave && !moving) {
        stirring = false;
        if (interaction === "releasing") setInteraction("resting");
      }
    }
    if (!stirring && !spin.generator && spin.value === 0) stop();
  }

  function start() {
    if (!awake || running) return;
    frame.update(tick, true);
    running = true;
  }
  function stop() {
    if (running) cancelFrame(tick);
    running = false;
  }

  function turn() {
    const target =
      settings?.rotating && interaction !== "tightening" && interaction !== "pressed-reduced"
        ? settings.degreesPerSecond
        : 0;
    if (target !== spin.target) springTo(spin, target, SPIN_FREQUENCY);
  }

  // Ends any gesture and puts every ring at rest in one step, for when nothing may move.
  function settle() {
    wave = null;
    stirring = false;
    if (pointer !== null && root.hasPointerCapture?.(pointer)) root.releasePointerCapture(pointer);
    pointer = null;
    rings.forEach((ring, index) => {
      jump(ring.scale, 1);
      jump(ring.opacity, 1);
      ring.releaseAt = Infinity;
      show(index);
    });
    dim.jump(1);
    setInteraction("resting");
  }

  function sync() {
    if (!settings) return;
    const wasAwake = awake;
    awake = visible && !document.hidden && !settings.reducedMotion;
    // Prepare visible, interactive rings before a press rather than promoting them on demand.
    const prepare = awake && !root.closest("[inert]");
    for (const layer of root.querySelectorAll<HTMLElement>("[data-spiral-rotation], [data-spiral-coil]")) {
      layer.style.willChange = prepare ? "transform, opacity" : "auto";
    }
    if (awake) {
      turn();
      start();
      return;
    }
    stop();
    if (wasAwake) settle();
    // Offscreen or in a hidden tab the spin keeps its speed for when it is seen again.
    // Reduced motion stops it at the angle it had reached.
    if (settings.reducedMotion) jump(spin, 0);
  }

  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          sync();
        });
  observer?.observe(root);
  document.addEventListener("visibilitychange", sync);

  return {
    update(nextGeometry: CoilGeometry[], nextValues: CoilValues[], nextSettings: Settings) {
      const retighten =
        interaction === "tightening" && settings?.tightenStrength !== nextSettings.tightenStrength;
      geometry = nextGeometry;
      values = nextValues;
      settings = nextSettings;
      // New text keeps every ring where it is. A ring added by a higher density joins at the
      // pose its neighbours are heading for.
      const last = rings.at(-1);
      rings.length = Math.min(rings.length, geometry.length);
      while (rings.length < geometry.length) {
        rings.push({
          scale: follower(last?.scale.target ?? 1),
          opacity: follower(1),
          releaseAt: last?.releaseAt ?? Infinity,
        });
      }
      rings.forEach((ring, index) => {
        if (wave && ring.releaseAt !== Infinity) ring.releaseAt = releaseTime(index, wave.duration);
        if (retighten) springTo(ring.scale, heldScale(), GRIP_FREQUENCY);
        show(index);
      });
      stirring ||= retighten;
      sync();
    },

    press(pointerId: number) {
      if (!settings || pointer !== null) return;
      if (!awake && !settings.reducedMotion) return;
      pointer = pointerId;
      root.setPointerCapture?.(pointerId);
      if (settings.reducedMotion) {
        // Reduced motion answers a press with a short fade instead of moving the rings.
        setInteraction("pressed-reduced");
        animate(dim, PRESSED_OPACITY, FADE);
        return;
      }
      // Catch each ring where it is. A ripple in flight is folded into the ring's own spring,
      // position and velocity both, so the grab neither snaps the ring nor stops it dead.
      rings.forEach((ring, index) => {
        let crest = 0;
        let crestVelocity = 0;
        if (wave) {
          const progress = geometry[index].progress;
          crest = crestAt(progress, wave.elapsed / wave.duration);
          crestVelocity = (crest - crestAt(progress, (wave.elapsed - 1) / wave.duration)) * 1000;
        }
        const scaleVelocity = velocityOf(ring.scale) + crestVelocity * swellOf(index);
        const opacityVelocity =
          velocityOf(ring.opacity) * (1 - crest * RIPPLE_DIM) -
          ring.opacity.value * crestVelocity * RIPPLE_DIM;
        ring.scale.value += crest * swellOf(index);
        ring.opacity.value = clamp(ring.opacity.value * (1 - crest * RIPPLE_DIM));
        ring.releaseAt = Infinity;
        springTo(ring.scale, heldScale(), GRIP_FREQUENCY, scaleVelocity);
        springTo(ring.opacity, 1, GRIP_FREQUENCY, opacityVelocity);
      });
      wave = null;
      stirring = true;
      setInteraction("tightening");
      turn();
      start();
    },

    release(pointerId: number) {
      if (!settings || pointer !== pointerId) return;
      pointer = null;
      if (root.hasPointerCapture?.(pointerId)) root.releasePointerCapture(pointerId);
      if (interaction === "pressed-reduced") {
        setInteraction("resting");
        animate(dim, 1, FADE);
        turn();
        start();
        return;
      }
      if (interaction !== "tightening") return;
      const duration = settings.rippleDuration;
      const tightest = Math.min(...rings.map((ring) => ring.scale.value));
      const tension = clamp((1 - tightest) / (settings.tightenStrength * 0.4));
      wave = {
        elapsed: 0,
        duration,
        height: RIPPLE_HEIGHT * (0.35 + tension * 0.65),
        // A released ring is back at rest as the crest reaches it, whatever the wave's speed.
        frequency: 6000 / ((RIPPLE_WIDTH / RIPPLE_TRAVEL) * duration),
      };
      rings.forEach((ring, index) => {
        ring.releaseAt = releaseTime(index, duration);
        // Until the wave arrives a ring stays where it was let go, spending the inward pull
        // it still carries instead of stopping dead.
        springTo(ring.scale, ring.scale.value, GRIP_FREQUENCY);
      });
      stirring = true;
      setInteraction("releasing");
      turn();
      start();
    },

    destroy() {
      stop();
      dim.stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    },
  };
}

// Motion's useReducedMotion reads the setting once, when the component mounts. Listening for
// the change as well lets a spiral that is already turning stop without a reload.
function useLiveReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(useReducedMotion() ?? false);
  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!preference) return;
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return reducedMotion;
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
  const coilRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const motionRef = useRef<ReturnType<typeof createSpiralMotion> | null>(null);
  const reducedMotion = useLiveReducedMotion();
  const rotation = useMotionValue(0);
  const dim = useMotionValue(1);

  const safeTightenStrength = Math.min(0.7, Math.max(0.08, tightenStrength));
  const safeRotationSpeed = Number.isFinite(rotationSpeed) && rotationSpeed > 0 ? rotationSpeed : 1;
  const safeRippleDuration = Number.isFinite(rippleDuration) ? Math.max(300, rippleDuration) : 1800;
  const coils = useMemo(() => createGlyphLayout(text, density), [density, text]);
  const coilCount = coils.length;
  const coilValues = useMemo<CoilValues[]>(
    () => Array.from({ length: coilCount }, () => ({ scale: motionValue(1), opacity: motionValue(1) })),
    [coilCount],
  );

  // Layout effects, so a change made mid-gesture reaches the rings before the next frame.
  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const spiral = createSpiralMotion(rootRef.current, rotation, dim);
    motionRef.current = spiral;
    return () => {
      spiral.destroy();
      motionRef.current = null;
    };
  }, [rotation, dim]);

  useLayoutEffect(() => {
    motionRef.current?.update(coils, coilValues, {
      tightenStrength: safeTightenStrength,
      rippleDuration: safeRippleDuration,
      degreesPerSecond: safeRotationSpeed * 6,
      rotating,
      reducedMotion,
    });
  }, [
    coils,
    coilValues,
    safeTightenStrength,
    safeRippleDuration,
    safeRotationSpeed,
    rotating,
    reducedMotion,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || root.closest("[inert]") || !document.fonts) return;
    const canvases = canvasRefs.current.slice(0, coils.length);
    const masks = canvases.map(() => document.createElement("canvas"));
    const layers = coilRefs.current.slice(0, coils.length);
    let disposed = false;
    let fontsReady = false;
    let cacheKey = "";
    let cachedFill = "";
    const paint = () => {
      if (disposed || !fontsReady) return;
      const width = root.clientWidth;
      if (!width) return;
      const text = root.querySelector("text");
      if (!text) return;
      const style = getComputedStyle(text);
      const font = `${style.fontStyle} ${style.fontWeight} ${FONT_SIZE}px ${style.fontFamily}`;
      const fill = style.fill;
      const pixelRatio = window.devicePixelRatio || 1;
      const key = `${width}|${pixelRatio}|${font}`;
      const geometryChanged = key !== cacheKey;
      if (!geometryChanged && fill === cachedFill) return;
      cacheKey = key;
      cachedFill = fill;
      coils.forEach((coil, index) => {
        const canvas = canvases[index];
        const context = canvas?.getContext("2d");
        const mask = masks[index];
        const glyphs = mask.getContext("2d");
        if (!canvas || !context || !glyphs) return;
        // Cache glyphs once at display resolution with some headroom for the swell.
        // Transforming these bitmaps avoids re-rasterizing SVG text on every re-grab.
        if (geometryChanged) {
          const maxScale = 1 + RIPPLE_HEIGHT / Math.max(40, coil.radius);
          const size = Math.ceil((coil.diameter / VIEWBOX_SIZE) * width * pixelRatio * maxScale);
          canvas.width = canvas.height = mask.width = mask.height = size;
          glyphs.font = font;
          const scale = size / coil.diameter;
          const origin = CENTER - coil.diameter / 2;
          const x = coil.x.split(" ").map(Number);
          const y = coil.y.split(" ").map(Number);
          const angles = coil.rotations.split(" ").map(Number);
          Array.from(coil.characters).forEach((character, glyph) => {
            const angle = (angles[glyph] * Math.PI) / 180;
            const cos = Math.cos(angle) * scale;
            const sin = Math.sin(angle) * scale;
            glyphs.setTransform(
              cos,
              sin,
              -sin,
              cos,
              (x[glyph] - origin) * scale,
              (y[glyph] - origin) * scale,
            );
            glyphs.fillText(character, 0, 0);
          });
        }
        // Recolor the cached glyph mask in two draws instead of rasterizing every letter.
        // Start from the mask so translucent colors do not lose opacity on repeated changes.
        context.globalCompositeOperation = "copy";
        context.drawImage(mask, 0, 0);
        context.globalCompositeOperation = "source-in";
        context.fillStyle = fill;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = "source-over";
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
      for (const mask of masks) mask.width = mask.height = 0;
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

  const release = (event: ReactPointerEvent<HTMLDivElement>) => motionRef.current?.release(event.pointerId);

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={text.trim()}
      data-interaction="resting"
      className={[
        "bg-background text-foreground relative isolate aspect-square w-full touch-none overflow-hidden select-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        motionRef.current?.press(event.pointerId);
      }}
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
      <motion.div
        data-spiral-rotation=""
        className="relative size-full"
        style={{ rotate: rotation, opacity: dim }}
      >
        {coils.map((coil, index) => (
          <motion.div
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
              scale: coilValues[index].scale,
              opacity: coilValues[index].opacity,
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
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
