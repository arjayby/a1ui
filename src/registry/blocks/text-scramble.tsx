"use client";

import { animate, useReducedMotion } from "motion/react";
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

// Reduced motion swaps the text at once and fades it in, in place of the scramble.
const fade = { duration: 0.2, ease: "linear" } as const;

const isSpace = (character: string) => /\s/u.test(character);

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
  // The noise on screen, by character index, and how long it has been showing. Both outlive a
  // single run, so a new `text` in the middle of a scramble carries on from what is on screen.
  const noiseRef = useRef<(string | undefined)[]>([]);
  const sinceShuffleRef = useRef(0);
  const fadeRef = useRef<ReturnType<typeof animate> | null>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    const visual = visualRef.current;
    if (!root || !visual) return;

    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 800;
    const safeInterval = Number.isFinite(interval) ? Math.max(16, interval) : 40;

    const write = (value: string) => {
      visual.textContent = value;
      displayedRef.current = value;
    };

    const finish = () => {
      write(text);
      noiseRef.current = [];
      sinceShuffleRef.current = 0;
      root.dataset.state = "idle";
    };

    const unchanged = displayedRef.current === text;
    const instant = disabled || safeDuration === 0;
    const target = splitCharacters(text);
    const pool = splitCharacters(characters).filter((character) => !isSpace(character));
    const positions = target.flatMap((character, index) => (isSpace(character) ? [] : [index]));

    if (instant) fadeRef.current?.complete();

    if (unchanged || instant || pool.length === 0 || positions.length === 0) {
      finish();
      return;
    }

    if (reducedMotion) {
      finish();
      // A fade already under way carries the new text. Restarting it would blink.
      if (!fadeRef.current) {
        const controls = animate(visual, { opacity: [0, 1] }, fade);
        fadeRef.current = controls;
        controls.finished.then(() => {
          if (fadeRef.current === controls) fadeRef.current = null;
        });
      }
      return;
    }

    const pick = () => pool[Math.floor(Math.random() * pool.length)];

    // Start from what is showing: characters still scrambling keep their glyph until the next
    // shuffle, and only the ones that had resolved, or are new, turn into fresh noise.
    const carried = noiseRef.current;
    const noise: (string | undefined)[] = [];
    for (const position of positions) noise[position] = carried[position] ?? pick();
    noiseRef.current = noise;

    let revealed = 0;
    const paint = (shuffle: boolean) => {
      const output = [...target];
      for (let order = revealed; order < positions.length; order += 1) {
        const position = positions[order];
        if (shuffle) noise[position] = pick();
        output[position] = noise[position]!;
      }
      write(output.join(""));
    };

    root.dataset.state = "scrambling";
    paint(false);

    let active = true;
    let elapsed = 0;
    // The reveal is a clock, not a movement: nothing travels or carries momentum, so it runs on a
    // linear timeline rather than a spring.
    const controls = animate(0, 1, {
      duration: safeDuration / 1000,
      ease: "linear",
      onUpdate: (progress) => {
        if (!active) return;

        const now = progress * safeDuration;
        sinceShuffleRef.current += now - elapsed;
        elapsed = now;
        const shuffle = sinceShuffleRef.current >= safeInterval;
        if (shuffle) sinceShuffleRef.current = 0;

        // Hold briefly, then resolve the entire phrase from left to right.
        const before = revealed;
        while (revealed < positions.length && progress >= 0.25 + (0.75 * (revealed + 1)) / positions.length) {
          noise[positions[revealed]] = undefined;
          revealed += 1;
        }

        if (shuffle || revealed !== before) paint(shuffle);
      },
      onComplete: () => {
        if (active) finish();
      },
    });

    return () => {
      // Motion samples the value once more as it stops; that frame must not reach the page.
      active = false;
      controls.stop();
    };
  }, [text, duration, interval, characters, disabled, reducedMotion]);

  // Finishing, rather than stopping, leaves the text fully opaque if it is shown again.
  useLayoutEffect(() => () => fadeRef.current?.complete(), []);

  return (
    <span {...props} ref={rootRef} className={className} data-slot="text-scramble" data-state="idle">
      <span className="sr-only">{text}</span>
      <span ref={visualRef} aria-hidden="true" className="whitespace-pre-wrap">
        {text}
      </span>
    </span>
  );
}
