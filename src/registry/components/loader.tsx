"use client";

import { motion, useReducedMotion, type Easing, type Transition } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";

// Motion's useReducedMotion reads the media query on the first client render, which the server
// cannot know. Applying it only after hydration keeps the client's first render identical to the
// server HTML; React re-renders with the real preference right after hydrating.
const subscribeNever = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

export const loaderVariants = [
  "ring",
  "dots",
  "bars",
  "grid",
  "swap",
  "ripple",
  "tiles",
  "infinity",
  "morph",
  "stack",
  "tumble",
  "line",
] as const;
export type LoaderVariant = (typeof loaderVariants)[number];

export interface LoaderProps {
  /** Which animation to show. */
  variant?: LoaderVariant;
  /** Height of the animation in pixels. Every part scales from it. */
  size?: number;
  /** Seconds per loop, between 0.4 and 2.5. Zero holds a still frame. */
  cycle?: number;
  /** Visible text beside the animation. It replaces the hidden `aria-label` text. */
  label?: ReactNode;
  /** Visually hidden text announced when there is no visible label. */
  "aria-label"?: string;
  className?: string;
}

// Loops never run slower than 2.5 seconds, which keeps them clear of the 0.2 Hz sway that is most
// likely to cause motion discomfort, or faster than 0.4 seconds, where small shapes start to flash.
const MIN_CYCLE = 0.4;
const MAX_CYCLE = 2.5;
const SWING = [0.65, 0, 0.35, 1] as const;

const round = (value: number) => Math.round(value * 100) / 100;

function loop(duration: number, options: Transition = {}): Transition {
  return { duration, ease: "linear", repeat: Infinity, ...options };
}

// Given one easing for a list of keyframes, the browser eases the whole list as a single move.
// Every step gets its own copy here so that each one settles before the next begins.
function each<Ease extends Easing>(ease: Ease, steps: number): Ease[] {
  return Array.from({ length: steps }, () => ease);
}

// A negative delay starts a loop partway through, so staggered parts are already out of step on
// the first frame instead of starting together and drifting apart.
const stagger = (cycle: number, offset: number) => -cycle * (1 - offset);

interface GlyphProps {
  size: number;
  /** Seconds per loop. Zero leaves every part in its resting pose. */
  cycle: number;
}

// Each glyph animates only `transform` and `opacity` where it can, so the loop keeps running on
// the compositor while the main thread is busy with the work the loader stands in for.

function Ring({ size, cycle }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      initial={{ transform: "rotate(0deg)" }}
      // The arc never stops, but it leans into each turn instead of spinning at one speed.
      animate={cycle ? { transform: ["rotate(0deg)", "rotate(360deg)"] } : undefined}
      transition={loop(cycle, { ease: [0.45, 0.2, 0.55, 0.8] })}
    >
      <circle cx={12} cy={12} r={9.5} opacity={0.15} />
      <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" />
    </motion.svg>
  );
}

function Dots({ size, cycle }: GlyphProps) {
  const dot = round(size * 0.24);
  const lift = round(size * 0.2);
  return (
    <span className="flex items-center justify-between" style={{ width: size, height: size }}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="rounded-full bg-current"
          style={{ width: dot, height: dot }}
          initial={{ transform: "translateY(0px)", opacity: 1 }}
          animate={
            cycle
              ? {
                  transform: [
                    `translateY(${lift / 2}px)`,
                    `translateY(${-lift}px)`,
                    `translateY(${lift / 2}px)`,
                    `translateY(${lift / 2}px)`,
                  ],
                  opacity: [0.3, 1, 0.3, 0.3],
                }
              : undefined
          }
          transition={loop(cycle, {
            times: [0, 0.3, 0.6, 1],
            ease: each("easeInOut", 3),
            delay: stagger(cycle, index * 0.14),
          })}
        />
      ))}
    </span>
  );
}

const BAR_REST = [0.55, 1, 0.75, 0.4];

function Bars({ size, cycle }: GlyphProps) {
  const width = round(size * 0.16);
  return (
    <span className="flex items-center justify-between" style={{ width: size, height: size }}>
      {BAR_REST.map((rest, index) => (
        <motion.span
          key={index}
          className="h-full rounded-full bg-current"
          style={{ width }}
          initial={{ transform: `scaleY(${rest})` }}
          animate={cycle ? { transform: ["scaleY(0.3)", "scaleY(1)", "scaleY(0.3)"] } : undefined}
          transition={loop(cycle, { ease: each("easeInOut", 2), delay: stagger(cycle, index * 0.16) })}
        />
      ))}
    </span>
  );
}

function Grid({ size, cycle }: GlyphProps) {
  return (
    <span className="grid grid-cols-3" style={{ width: size, height: size, gap: round(size * 0.14) }}>
      {Array.from({ length: 9 }, (_, index) => (
        <motion.span
          key={index}
          className="bg-current"
          style={{ borderRadius: round(size * 0.06) }}
          initial={{ transform: "scale(1)", opacity: 1 }}
          animate={
            cycle
              ? {
                  transform: ["scale(0.6)", "scale(1)", "scale(0.6)", "scale(0.6)"],
                  opacity: [0.2, 1, 0.2, 0.2],
                }
              : undefined
          }
          // The wave crosses the grid from its top-left corner to its bottom-right one.
          transition={loop(cycle, {
            times: [0, 0.3, 0.6, 1],
            ease: each("easeInOut", 3),
            delay: stagger(cycle, ((index % 3) + Math.floor(index / 3)) * 0.1),
          })}
        />
      ))}
    </span>
  );
}

function Swap({ size, cycle }: GlyphProps) {
  const dot = round(size * 0.36);
  return (
    <motion.span
      className="flex items-center justify-between"
      style={{ width: size, height: size }}
      initial={{ transform: "rotate(0deg)" }}
      // Two dots trade places on each half turn and settle before they go again.
      animate={cycle ? { transform: ["rotate(0deg)", "rotate(180deg)", "rotate(360deg)"] } : undefined}
      transition={loop(cycle, { ease: each(SWING, 2) })}
    >
      {[0, 1].map((index) => (
        <motion.span
          key={index}
          className="rounded-full bg-current"
          style={{ width: dot, height: dot }}
          initial={{ transform: "scale(1)" }}
          animate={
            cycle
              ? {
                  transform: index
                    ? ["scale(1)", "scale(1.2)", "scale(1)", "scale(0.55)", "scale(1)"]
                    : ["scale(1)", "scale(0.55)", "scale(1)", "scale(1.2)", "scale(1)"],
                }
              : undefined
          }
          transition={loop(cycle, { ease: each("easeInOut", 4) })}
        />
      ))}
    </motion.span>
  );
}

function Ripple({ size, cycle }: GlyphProps) {
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      {[0, 1].map((index) => (
        <motion.span
          key={index}
          className="absolute inset-0 rounded-full border-current"
          style={{ borderWidth: round(size * 0.1) }}
          initial={index ? { transform: "scale(0.45)", opacity: 1 } : { transform: "scale(1)", opacity: 0.3 }}
          animate={cycle ? { transform: ["scale(0.1)", "scale(1)"], opacity: [1, 0] } : undefined}
          transition={loop(cycle, { ease: "easeOut", delay: stagger(cycle, index * 0.5) })}
        />
      ))}
    </span>
  );
}

// Three tiles share a two-by-two board. The tile behind the gap slides into it, so the gap walks
// around the board once per cycle while each tile takes three cycles to come back to its corner.
function tileLoop(index: number, far: number) {
  const corners = [
    [0, 0],
    [far, 0],
    [far, far],
    [0, far],
  ];
  const at = (corner: number) => {
    const [x, y] = corners[corner % 4];
    return `translate(${x}px, ${y}px)`;
  };
  const start = 2 - index;
  const transform = [at(start)];
  const steps = [0];
  for (let move = 0; move < 4; move++) {
    const begins = index + move * 3;
    if (begins > 0) {
      transform.push(at(start + move));
      steps.push(begins);
    }
    transform.push(at(start + move + 1));
    steps.push(begins + 1);
  }
  if (steps[steps.length - 1] < 12) {
    transform.push(at(start));
    steps.push(12);
  }
  return { transform, times: steps.map((step) => step / 12) };
}

function Tiles({ size, cycle }: GlyphProps) {
  const tile = round(size * 0.44);
  const far = round(size - tile);
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      {[0, 1, 2].map((index) => {
        const { transform, times } = tileLoop(index, far);
        return (
          <motion.span
            key={index}
            className="absolute top-0 left-0 bg-current"
            style={{ width: tile, height: tile, borderRadius: round(size * 0.1) }}
            initial={{ transform: transform[0] }}
            animate={cycle ? { transform } : undefined}
            transition={loop(cycle * 3, { times, ease: each(SWING, times.length - 1) })}
          />
        );
      })}
    </span>
  );
}

// One continuous figure eight, so a dash can travel it without lifting.
const INFINITY_PATH =
  "M12 12c2-2.67 4-4 6-4a4 4 0 0 1 0 8c-2 0-4-1.33-6-4c-2-2.67-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.33 6-4Z";

function InfinityLoop({ size, cycle }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <path d={INFINITY_PATH} opacity={0.15} />
      <motion.path
        d={INFINITY_PATH}
        initial={{ pathLength: 0.3, pathSpacing: 0.7, pathOffset: 0.1 }}
        animate={cycle ? { pathOffset: [0, 1] } : undefined}
        transition={loop(cycle)}
      />
    </svg>
  );
}

// Every outline is sampled at the same 60 angles, so one shape can be interpolated into the next
// point by point. Corners fall on a sample because 3, 4, and 10 all divide 60.
const MORPH_POINTS = 60;

/**
 * A closed path around the center of a 24 by 24 box. `corners` at `radius` make a regular polygon,
 * `inner` below 1 pulls a second ring of corners in to make a star, and zero corners is a circle.
 * `turn` rotates the outline, in degrees. `drop` moves it along its own downward direction, for a
 * shape like the triangle that otherwise looks too high.
 */
function outline(corners: number, radius: number, turn: number, inner = 1, drop = 0) {
  const count = inner < 1 ? corners * 2 : corners;
  const step = (Math.PI * 2) / (count || 1);
  const turned = (turn * Math.PI) / 180;
  const x = 12 - drop * Math.sin(turned);
  const y = 12 + drop * Math.cos(turned);
  let d = "";
  for (let index = 0; index < MORPH_POINTS; index++) {
    const angle = (index / MORPH_POINTS) * Math.PI * 2;
    let reach = radius;
    if (count) {
      // Where the ray at this angle crosses the edge between the two corners on either side.
      const edge = Math.floor(angle / step + 1e-9);
      const from = edge % 2 && inner < 1 ? radius * inner : radius;
      const to = edge % 2 || inner === 1 ? radius : radius * inner;
      const along = angle - edge * step;
      reach = (from * to * Math.sin(step)) / (from * Math.sin(along) + to * Math.sin(step - along));
    }
    // The first corner points up.
    const facing = angle + turned - Math.PI / 2;
    d += `${index ? "L" : "M"}${round(x + reach * Math.cos(facing))} ${round(y + reach * Math.sin(facing))}`;
  }
  return `${d}Z`;
}

// The glyph turns a quarter with each change of shape, so each outline is drawn turned back far
// enough to land upright. The square and the star look the same after a part turn, which lets
// every change twist its points by a similar, small angle: the shape draws in a little as it
// morphs instead of collapsing. Both circles look alike, so the loop closes without a seam.
const MORPH_SHAPES = [
  outline(0, 8.4, -15),
  outline(3, 10.4, -90, 1, 1.3),
  outline(4, 10, -135),
  outline(5, 10.6, -198, 0.5),
  outline(0, 8.4, -273),
];
const MORPH_TURNS = [0, 90, 180, 270, 360].map((degrees) => `rotate(${degrees}deg)`);

function Morph({ size, cycle }: GlyphProps) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinejoin="round"
      initial={{ transform: MORPH_TURNS[0] }}
      animate={cycle ? { transform: MORPH_TURNS } : undefined}
      transition={loop(cycle * 2, { ease: each(SWING, 4) })}
    >
      {/* The outline is redrawn on the main thread; the turn itself stays on the compositor. */}
      <motion.path
        initial={{ d: outline(4, 10, 45) }}
        animate={cycle ? { d: MORPH_SHAPES } : undefined}
        transition={loop(cycle * 2, { ease: each(SWING, 4) })}
      />
    </motion.svg>
  );
}

const STACK_WIDTHS = ["100%", "60%", "80%"];
// The share of each cycle the lines spend moving; they rest for the remainder.
const STACK_MOVE = 0.55 / 3;

// Three lines of a list climb one row per cycle. The top line leaves upward as it fades and comes
// back in from below, so each line takes three cycles to return to the row it started on.
function Stack({ size, cycle }: GlyphProps) {
  const pitch = round(size * 0.3);
  const rows = [round(size * 0.1), round(size * 0.4), round(size * 0.7)];
  const at = (y: number) => `translateY(${round(y)}px)`;
  const transform = [
    at(rows[2]),
    at(rows[1]),
    at(rows[1]),
    at(rows[0]),
    at(rows[0]),
    at(rows[0] - pitch * 0.6),
    at(rows[2] + pitch * 0.6),
    at(rows[2]),
    at(rows[2]),
  ];
  const opacity = [1, 1, 1, 1, 1, 0, 0, 1, 1];
  const third = 1 / 3;
  const times = [
    0,
    STACK_MOVE,
    third,
    third + STACK_MOVE,
    third * 2,
    third * 2 + STACK_MOVE * 0.45,
    third * 2 + STACK_MOVE * 0.55,
    third * 2 + STACK_MOVE,
    1,
  ];
  const ease = [SWING, "linear", SWING, "linear", "easeIn", "linear", "easeOut", "linear"] as const;

  return (
    <span className="relative block" style={{ width: size, height: size }}>
      {STACK_WIDTHS.map((width, index) => (
        <motion.span
          key={index}
          className="absolute top-0 left-0 rounded-full bg-current"
          style={{ width, height: round(size * 0.2) }}
          initial={{ transform: at(rows[2 - index]), opacity: 1 }}
          animate={cycle ? { transform, opacity } : undefined}
          transition={loop(cycle * 3, { times, ease: [...ease], delay: -cycle * index })}
        />
      ))}
    </span>
  );
}

function Tumble({ size, cycle }: GlyphProps) {
  const side = round(size * 0.6);
  // A square turning on its center needs this much lift to keep its corner on the ground; a
  // little more makes the quarter turn read as a hop.
  const hop = round(size * 0.2);
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <motion.span
        className="absolute bottom-0 bg-current"
        style={{ width: side, height: side, left: round((size - side) / 2), borderRadius: round(size * 0.1) }}
        initial={{ transform: "translateY(0px) rotate(0deg)" }}
        animate={
          cycle
            ? {
                transform: [
                  "translateY(0px) rotate(0deg)",
                  `translateY(${-hop}px) rotate(45deg)`,
                  "translateY(0px) rotate(90deg)",
                  "translateY(0px) rotate(90deg)",
                ],
              }
            : undefined
        }
        transition={loop(cycle, { times: [0, 0.3, 0.6, 1], ease: ["easeOut", "easeIn", "linear"] })}
      />
    </span>
  );
}

function Line({ size, cycle }: GlyphProps) {
  return (
    <span
      className="relative block min-w-12 overflow-hidden rounded-full"
      style={{ height: Math.max(2, Math.round(size / 6)) }}
    >
      <span className="absolute inset-0 bg-current opacity-15" />
      <motion.span
        className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-current"
        initial={{ transform: "translateX(75%) scaleX(1)" }}
        // The pill stretches as it picks up speed and gathers itself again before it leaves.
        animate={
          cycle
            ? {
                transform: [
                  "translateX(-100%) scaleX(0.6)",
                  "translateX(75%) scaleX(1.5)",
                  "translateX(250%) scaleX(0.6)",
                ],
              }
            : undefined
        }
        transition={loop(cycle, { ease: ["easeIn", "easeOut"] })}
      />
    </span>
  );
}

const glyphs: Record<LoaderVariant, (props: GlyphProps) => ReactNode> = {
  ring: Ring,
  dots: Dots,
  bars: Bars,
  grid: Grid,
  swap: Swap,
  ripple: Ripple,
  tiles: Tiles,
  infinity: InfinityLoop,
  morph: Morph,
  stack: Stack,
  tumble: Tumble,
  line: Line,
};

export function Loader({
  variant = "ring",
  size = 24,
  cycle = 1.2,
  label,
  "aria-label": ariaLabel = "Loading",
  className,
}: LoaderProps) {
  const hydrated = useHydrated();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = hydrated && prefersReducedMotion === true;
  const pixels = Number.isFinite(size) && size > 0 ? size : 24;
  const seconds = !Number.isFinite(cycle)
    ? 1.2
    : cycle <= 0
      ? 0
      : Math.min(Math.max(cycle, MIN_CYCLE), MAX_CYCLE);
  // Reduced motion keeps the shape still and breathes its opacity instead, so the loader still
  // reads as working without anything travelling across the screen.
  const motionMode = seconds === 0 ? "none" : reducedMotion ? "reduced" : "full";
  const Glyph = glyphs[variant] ?? Ring;
  const line = variant === "line";

  return (
    <span
      role="status"
      data-slot="loader"
      data-variant={variant}
      data-motion={motionMode}
      className={`${line ? "flex flex-col gap-2" : "inline-flex items-center gap-2"} ${className ?? ""}`}
    >
      <motion.span
        // A new key restarts every part together when the loop it runs on changes.
        key={`${variant}-${motionMode}-${seconds}-${pixels}`}
        aria-hidden="true"
        data-slot="loader-glyph"
        className={line ? "order-last block" : "inline-flex shrink-0"}
        animate={motionMode === "reduced" ? { opacity: [1, 0.4, 1] } : undefined}
        transition={loop(Math.min(Math.max(seconds * 1.5, 1.2), MAX_CYCLE), { ease: each("easeInOut", 2) })}
      >
        <Glyph size={pixels} cycle={motionMode === "full" ? seconds : 0} />
      </motion.span>
      {label ? (
        <span data-slot="loader-label" className="text-sm leading-none font-medium">
          {label}
        </span>
      ) : (
        <span className="sr-only">{ariaLabel}</span>
      )}
    </span>
  );
}
