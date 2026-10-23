"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties } from "react";

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
    letter-spacing: -0.04em;
    line-height: 1;
    text-transform: uppercase;
  }
  [data-slot="text-banner"] .a1ui-text-banner-track {
    display: flex;
    width: max-content;
    animation: a1ui-text-banner-scroll var(--text-banner-duration, 20s) linear infinite;
    animation-direction: var(--text-banner-direction, normal);
    animation-play-state: var(--text-banner-play-state, paused);
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
  [data-slot="text-banner"][data-pause-on-hover="true"]:hover .a1ui-text-banner-track {
    animation-play-state: paused;
  }
  @keyframes a1ui-text-banner-scroll {
    from { transform: translateX(-50%); }
    to { transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-slot="text-banner"] .a1ui-text-banner-track {
      width: 100%;
      animation: none;
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
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 80;
  const visibleItems = items.filter((item) => item.trim().length > 0);
  const hasItems = visibleItems.length > 0;

  useEffect(() => {
    const root = rootRef.current;
    const unit = unitRef.current;
    if (!root || !unit) return;

    // The first unit includes its trailing gap. Observe it for text, font,
    // and size changes so both halves always cover the full container.
    const observer = new ResizeObserver(() => {
      const unitWidth = unit.getBoundingClientRect().width;
      if (unitWidth <= 0) return;
      const copies = Math.max(1, Math.ceil(root.clientWidth / unitWidth));
      setLayout((current) =>
        current.copies === copies && current.unitWidth === unitWidth ? current : { copies, unitWidth },
      );
    });
    observer.observe(root);
    observer.observe(unit);
    return () => observer.disconnect();
  }, [hasItems]);

  if (!hasItems) return null;

  return (
    <div
      {...props}
      ref={rootRef}
      data-slot="text-banner"
      data-pause-on-hover={pauseOnHover}
      className={clsx("isolate", className)}
      style={
        {
          "--text-banner-duration": `${(layout.unitWidth * layout.copies) / (safeSpeed || 80)}s`,
          "--text-banner-direction": direction === "right" ? "normal" : "reverse",
          "--text-banner-play-state": paused || safeSpeed === 0 || !layout.unitWidth ? "paused" : "running",
          ...style,
        } as CSSProperties
      }
    >
      <style>{styles}</style>
      <span className="sr-only">{visibleItems.join(" · ")}</span>
      <div className="a1ui-text-banner-track" aria-hidden="true" dir="ltr">
        {[0, 1].map((group) => (
          <div key={group} className="a1ui-text-banner-group">
            {Array.from({ length: layout.copies }, (_, copy) => (
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
      </div>
    </div>
  );
}
