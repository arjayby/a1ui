"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";

export interface TextScrambleProps extends Omit<
  ComponentPropsWithoutRef<"span">,
  "children" | "dangerouslySetInnerHTML"
> {
  text: string;
  duration?: number;
  interval?: number;
  characters?: string;
  disabled?: boolean;
}

const DEFAULT_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/";

function splitCharacters(text: string) {
  if (typeof Intl.Segmenter === "undefined") return Array.from(text);

  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return Array.from(segmenter.segment(text), ({ segment }) => segment);
}

export function TextScramble({
  text,
  duration = 800,
  interval = 40,
  characters = DEFAULT_CHARACTERS,
  disabled = false,
  className,
  ...props
}: TextScrambleProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const displayedRef = useRef(text);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const visual = visualRef.current;
    if (!root || !visual) return;

    let frame = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 800;
    const safeInterval = Number.isFinite(interval) ? Math.max(16, interval) : 40;

    const write = (value: string) => {
      visual.textContent = value;
      displayedRef.current = value;
    };

    const finish = () => {
      window.cancelAnimationFrame(frame);
      write(text);
      root.dataset.state = "idle";
    };

    const unchanged = displayedRef.current === text;
    const target = splitCharacters(text);
    const pool = splitCharacters(characters).filter((character) => !/\s/u.test(character));
    const positions = target.flatMap((character, index) => (!/\s/u.test(character) ? [index] : []));

    if (
      unchanged ||
      disabled ||
      motion.matches ||
      safeDuration === 0 ||
      pool.length === 0 ||
      positions.length === 0
    ) {
      finish();
      return;
    }

    const draw = (progress: number) => {
      const output = [...target];
      for (let order = 0; order < positions.length; order += 1) {
        // Hold briefly, then resolve the entire phrase from left to right.
        const resolvesAt = 0.25 + (0.75 * (order + 1)) / positions.length;
        if (progress < resolvesAt) {
          output[positions[order]] = pool[Math.floor(Math.random() * pool.length)];
        }
      }
      write(output.join(""));
    };

    const startedAt = performance.now();
    let lastDrawAt = startedAt;
    root.dataset.state = "scrambling";
    draw(0);

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      if (elapsed >= safeDuration) {
        finish();
        return;
      }

      if (now - lastDrawAt >= safeInterval) {
        draw(elapsed / safeDuration);
        lastDrawAt = now;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const handleMotionChange = () => {
      if (motion.matches) finish();
    };

    motion.addEventListener("change", handleMotionChange);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      motion.removeEventListener("change", handleMotionChange);
    };
  }, [text, duration, interval, characters, disabled]);

  return (
    <span {...props} ref={rootRef} className={className} data-slot="text-scramble" data-state="idle">
      <span className="sr-only">{text}</span>
      <span ref={visualRef} aria-hidden="true" className="whitespace-pre-wrap">
        {text}
      </span>
    </span>
  );
}
