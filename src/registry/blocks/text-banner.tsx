"use client";

import { clsx } from "clsx";
import {
  animate,
  cancelFrame,
  frame,
  hover,
  motion,
  useInView,
  useMotionValue,
  type FrameData,
} from "motion/react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
} from "react";

export interface TextBannerProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  items: readonly string[];
  speed?: number;
  direction?: "left" | "right";
  paused?: boolean;
  pauseOnHover?: boolean;
  separator?: string;
}

// Critically damped, so the banner eases to a new speed or a stop without overshooting. A spring
// starts from the velocity it already has: a change made mid-ease bends the motion instead of
// cutting it, and a reversal slows through a stop rather than hitting a wall.
const VELOCITY_SPRING = { type: "spring", visualDuration: 0.4, bounce: 0 } as const;

// Motion's useReducedMotion reads the setting once. The banner also has to stop and restart when
// the setting changes, so it subscribes to the query. The server snapshot is `false`, which keeps
// the first client render identical to the server HTML.
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeToReducedMotion(notify: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const assumeFullMotion = () => false;

/** Where the track sits for a phase between 0 and 1, as a percentage of its own width. */
const trackOffset = (phase: number, copies: number) => `${((phase - 1) * 50) / copies}%`;

const styles = `
  [data-slot="text-banner"] {
    position: relative;
    width: 100%;
    overflow: hidden;
    padding-block: 0.4em;
    border-block: 1px solid var(--border, currentColor);
    background: var(--text-banner-background, var(--muted, transparent));
    color: var(--text-banner-foreground, var(--foreground, currentColor));
    font-family: inherit;
    font-size: clamp(1.25rem, 3.5vw, 2.5rem);
    font-weight: 700;
    /* Display tracking: tight for large type, but capitals need more air than lowercase. */
    letter-spacing: -0.02em;
    line-height: 1;
    text-transform: uppercase;
  }
  [data-slot="text-banner"] .a1ui-text-banner-track {
    display: flex;
    width: max-content;
    /* Motion moves the track every frame, so it stays on its own layer. */
    will-change: transform;
  }
  [data-slot="text-banner"] .a1ui-text-banner-group,
  [data-slot="text-banner"] .a1ui-text-banner-unit,
  [data-slot="text-banner"] .a1ui-text-banner-item {
    display: flex;
    flex: none;
    align-items: center;
  }
  [data-slot="text-banner"] .a1ui-text-banner-item {
    gap: 0.45em;
    padding-inline-end: 0.45em;
    white-space: nowrap;
  }
  [data-slot="text-banner"] .a1ui-text-banner-separator {
    flex: none;
    font-weight: 400;
    opacity: 0.55;
  }
  [data-slot="text-banner"] .a1ui-text-banner-mark {
    width: 0.5em;
    height: 0.5em;
    flex: none;
  }
  /* Reduced motion lays the phrases out once, wrapped and centered. This is layout, so it is
     in place before hydration; the component stops the loop from the same media query. */
  @media (prefers-reduced-motion: reduce) {
    [data-slot="text-banner"] .a1ui-text-banner-track {
      width: 100%;
      transform: none !important;
      will-change: auto;
    }
    [data-slot="text-banner"] .a1ui-text-banner-group {
      width: 100%;
    }
    [data-slot="text-banner"] .a1ui-text-banner-group + .a1ui-text-banner-group,
    [data-slot="text-banner"] .a1ui-text-banner-unit + .a1ui-text-banner-unit {
      display: none;
    }
    [data-slot="text-banner"] .a1ui-text-banner-unit {
      width: 100%;
      flex-wrap: wrap;
      justify-content: center;
      row-gap: 0.3em;
    }
    [data-slot="text-banner"] .a1ui-text-banner-item {
      max-width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    [data-slot="text-banner"] .a1ui-text-banner-item > span:first-child {
      min-width: 0;
    }
  }
`;

export function TextBanner({
  items,
  speed = 80,
  direction = "right",
  paused = false,
  pauseOnHover = false,
  separator,
  className,
  style,
  ...props
}: TextBannerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ copies: 1, unitWidth: 0 });
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    assumeFullMotion,
  );
  const inView = useInView(rootRef);
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 80;
  const visibleItems = items.filter((item) => item.trim().length > 0);
  const hasItems = visibleItems.length > 0;
  const { copies, unitWidth } = layout;

  // The scroll position is one continuous value: how far the loop is through a single unit, from
  // 0 to 1. Every unit is identical, so wrapping it lands on the same picture. Velocity is in
  // pixels per second, positive to the right, and is the only thing the props ever change.
  const phase = useRef(0);
  const velocity = useMotionValue(0);
  const x = useMotionValue(trackOffset(0, 1));

  const held = paused || safeSpeed === 0 || (pauseOnHover && hovered);
  const state = reducedMotion ? "reduced" : held ? "paused" : "running";
  const targetVelocity = state === "running" ? (direction === "right" ? safeSpeed : -safeSpeed) : 0;

  useEffect(() => {
    const root = rootRef.current;
    const unit = unitRef.current;
    if (!root || !unit) return;

    // The first unit includes its trailing gap. Observe it for text, font,
    // and size changes so both halves always cover the full container.
    const observer = new ResizeObserver(() => {
      const width = unit.getBoundingClientRect().width;
      if (width <= 0) return;
      const count = Math.max(1, Math.ceil(root.clientWidth / width));
      setLayout((current) =>
        current.copies === count && current.unitWidth === width
          ? current
          : { copies: count, unitWidth: width },
      );
    });
    observer.observe(root);
    observer.observe(unit);
    return () => observer.disconnect();
  }, [hasItems]);

  // The offset is a share of the track's width, which changes with the number of copies. Restating
  // it in the same commit keeps the text where it was.
  useLayoutEffect(() => {
    x.set(trackOffset(phase.current, copies));
  }, [copies, x]);

  useEffect(() => {
    if (reducedMotion) {
      velocity.jump(0);
      return;
    }
    const controls = animate(velocity, targetVelocity, VELOCITY_SPRING);
    return () => controls.stop();
  }, [reducedMotion, targetVelocity, velocity]);

  useEffect(() => {
    // Off screen the loop is frozen outright and later picks up at full speed: nobody sees that cut.
    if (!inView || reducedMotion || unitWidth <= 0) return;
    let running = false;

    // Motion clamps long gaps between frames, so a stalled tab cannot fling the text forward.
    function tick({ delta }: FrameData) {
      const speed = velocity.get();
      if (speed === 0) {
        cancelFrame(tick);
        running = false;
        return;
      }
      const next = phase.current + (speed * delta) / 1000 / unitWidth;
      phase.current = next - Math.floor(next);
      x.set(trackOffset(phase.current, copies));
    }

    // The loop only runs while the banner is moving, and a change in velocity wakes it.
    function wake(speed: number) {
      if (running || speed === 0) return;
      running = true;
      frame.update(tick, true);
    }

    wake(velocity.get());
    const unsubscribe = velocity.on("change", wake);
    return () => {
      unsubscribe();
      cancelFrame(tick);
    };
  }, [copies, inView, reducedMotion, unitWidth, velocity, x]);

  useEffect(() => {
    const root = rootRef.current;
    if (!pauseOnHover || !root) return;
    // Motion's hover ignores the hover a touch leaves behind, which would hold the banner still.
    const stop = hover(root, () => {
      setHovered(true);
      return () => setHovered(false);
    });
    return () => {
      stop();
      setHovered(false);
    };
  }, [pauseOnHover, hasItems]);

  if (!hasItems) return null;

  return (
    <div
      {...props}
      ref={rootRef}
      data-slot="text-banner"
      data-motion={state}
      data-pause-on-hover={pauseOnHover}
      className={clsx("isolate", className)}
      style={style}
    >
      <style>{styles}</style>
      <span className="sr-only">{visibleItems.join(" · ")}</span>
      <motion.div className="a1ui-text-banner-track" aria-hidden="true" dir="ltr" style={{ x }}>
        {[0, 1].map((group) => (
          <div key={group} className="a1ui-text-banner-group">
            {Array.from({ length: copies }, (_, copy) => (
              <div
                key={copy}
                ref={group === 0 && copy === 0 ? unitRef : undefined}
                className="a1ui-text-banner-unit"
              >
                {visibleItems.map((item, index) => (
                  <div key={index} className="a1ui-text-banner-item">
                    <span dir="auto">{item}</span>
                    {separator === undefined ? (
                      <svg className="a1ui-text-banner-mark" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 0h6v6H6zM0 6h6v6H0zM12 6h6v6h-6zM6 12h6v6H6zM18 12h6v6h-6zM12 18h6v6h-6z" />
                      </svg>
                    ) : separator ? (
                      <span className="a1ui-text-banner-separator">{separator}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
