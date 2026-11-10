"use client";

import { useEffect, useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

export interface CondensingHeaderProps extends Omit<
  ComponentPropsWithoutRef<"header">,
  "title" | "children"
> {
  /** Rendered once as a real heading. The copies used for the effect are hidden from assistive tech. */
  title: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** A line under the large title. Collapses away as the header condenses. */
  subtitle?: ReactNode;
  /** A row under the large title, such as search or filters. Collapses away as the header condenses. */
  accessory?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Where the compact title rests in the bar. */
  titleAlign?: "center" | "start";
  onCondensedChange?: (condensed: boolean) => void;
}

// The material fades in over the last pixels before anything reaches the bar, and the edge over the
// first pixels after it, so neither can show while nothing is underneath.
const MATERIAL_LEAD = 16;
const EDGE_LEAD = 12;
// The share of the title's travel after which the header counts as condensed. Under reduced motion
// this is where the titles swap: early enough that the large one fades before it reaches the bar's actions.
const CONDENSED_AT = 1 / 3;

const styles = `
  [data-slot="condensing-header"] {
    --ch-bar: var(--condensing-header-bar-height, 2.75rem);
    --ch-safe-top: var(--condensing-header-safe-top, env(safe-area-inset-top, 0px));
    --ch-left: max(var(--condensing-header-padding, 1rem), env(safe-area-inset-left, 0px));
    --ch-right: max(var(--condensing-header-padding, 1rem), env(safe-area-inset-right, 0px));
    --ch-surface: var(--condensing-header-background, var(--background, Canvas));
    position: sticky;
    top: 0;
  }
  :where([data-slot="condensing-header"]) {
    z-index: 10;
  }
  /* Once measured, the header scrolls away with the content until only the bar is left. */
  [data-slot="condensing-header"][data-ready] {
    top: calc(-1 * var(--ch-collapse, 0px));
  }

  [data-slot="condensing-header-bar"] {
    position: sticky;
    top: 0;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    box-sizing: border-box;
    height: calc(var(--ch-bar) + var(--ch-safe-top));
    padding: var(--ch-safe-top) var(--ch-right) 0 var(--ch-left);
  }
  [data-title-align="start"] > [data-slot="condensing-header-bar"] {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  [data-slot="condensing-header-leading"],
  [data-slot="condensing-header-trailing"] {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  [data-slot="condensing-header-leading"] {
    grid-column: 1;
    justify-self: start;
    margin-inline-end: 0.5rem;
  }
  [data-slot="condensing-header-trailing"] {
    grid-column: 3;
    justify-self: end;
    margin-inline-start: 0.5rem;
  }
  [data-slot="condensing-header-slot"] {
    grid-column: 2;
    min-width: 0;
    overflow: hidden;
  }

  /* The compact type: smaller, so slightly lighter and less tightly tracked than the large title. */
  [data-slot="condensing-header-compact"],
  [data-slot="condensing-header-twin"] {
    overflow: hidden;
    /* Themes often give headings their own family; the copies have to match the real heading. */
    font-family: var(--ch-font, inherit);
    font-size: var(--condensing-header-compact-size, 1.0625rem);
    font-weight: var(--condensing-header-compact-weight, 600);
    letter-spacing: var(--condensing-header-compact-tracking, -0.01em);
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Holds the compact title's place in the bar. Only shown under reduced motion. */
  [data-slot="condensing-header-compact"] {
    display: block;
    visibility: hidden;
  }

  [data-slot="condensing-header-material"] {
    position: absolute;
    inset: 0;
    z-index: -1;
    background: color-mix(in oklab, var(--ch-surface) 72%, transparent);
    opacity: 0;
    pointer-events: none;
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    backdrop-filter: blur(20px) saturate(180%);
  }
  [data-slot="condensing-header-edge"] {
    position: absolute;
    inset: auto 0 0;
    height: 1px;
    background: var(--border, color-mix(in oklab, currentColor 15%, transparent));
    opacity: 0;
    pointer-events: none;
  }

  /* Sticky, so the browser carries the title into the bar 1:1 with the scroll. */
  [data-slot="condensing-header-title"] {
    position: sticky;
    top: var(--ch-dock-top, 0px);
    z-index: 2;
    width: fit-content;
    max-width: calc(100% - var(--ch-left) - var(--ch-right));
    margin: 0 var(--ch-right) 0 var(--ch-left);
    scale: var(--ch-stretch, 1);
    transform-origin: left bottom;
  }
  [data-slot="condensing-header"]:dir(rtl) [data-slot="condensing-header-title"] {
    transform-origin: right bottom;
  }
  [data-slot="condensing-header-heading"] {
    max-width: 100%;
    margin: 0;
    overflow: hidden;
    font-size: var(--condensing-header-title-size, 2.125rem);
    font-optical-sizing: auto;
    font-weight: var(--condensing-header-title-weight, 700);
    letter-spacing: var(--condensing-header-title-tracking, -0.022em);
    line-height: 1.18;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  [data-slot="condensing-header-twin"] {
    position: absolute;
    top: 50%;
    left: 50%;
    max-width: var(--ch-slot-width, none);
    opacity: 0;
    pointer-events: none;
    translate: -50% -50%;
    user-select: none;
  }

  [data-slot="condensing-header-extras"] {
    display: grid;
    gap: 0.5rem;
    padding: 0 var(--ch-right) var(--condensing-header-gap, 0.5rem) var(--ch-left);
  }
  [data-slot="condensing-header-subtitle"] {
    color: var(--muted-foreground, color-mix(in oklab, currentColor 62%, transparent));
    font-size: 0.9375rem;
    line-height: 1.35;
  }

  @keyframes a1ui-condensing-header-shift {
    to { translate: var(--ch-dx, 0px) 0; }
  }
  /* The two titles share a centre and a size the whole way, so the blend reads as one title. */
  @keyframes a1ui-condensing-header-large {
    0% { scale: 1; opacity: 1; }
    45% { opacity: 1; }
    85% { opacity: 0; }
    100% { scale: var(--ch-scale, 0.5); opacity: 0; }
  }
  @keyframes a1ui-condensing-header-compact {
    0% { scale: var(--ch-inverse, 2); opacity: 0; }
    15% { opacity: 0; }
    55% { opacity: 1; }
    100% { scale: 1; opacity: 1; }
  }
  @keyframes a1ui-condensing-header-out {
    to { opacity: 0; }
  }
  @keyframes a1ui-condensing-header-in {
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: no-preference) {
    [data-ready] > [data-slot="condensing-header-title"] {
      animation: a1ui-condensing-header-shift linear both;
    }
    [data-ready] [data-slot="condensing-header-heading"] {
      animation: a1ui-condensing-header-large linear both;
    }
    [data-ready] [data-slot="condensing-header-twin"] {
      animation: a1ui-condensing-header-compact linear both;
    }
    [data-ready] > [data-slot="condensing-header-extras"] {
      animation: a1ui-condensing-header-out linear both;
    }
    [data-ready] [data-slot="condensing-header-material"],
    [data-ready] [data-slot="condensing-header-edge"] {
      animation: a1ui-condensing-header-in linear both;
    }

    /* Scroll-driven: the compositor links every frame to the scroll position. */
    [data-driver="timeline"] > [data-slot="condensing-header-title"],
    [data-driver="timeline"] [data-slot="condensing-header-heading"],
    [data-driver="timeline"] [data-slot="condensing-header-twin"] {
      animation-duration: auto;
      animation-timeline: scroll(nearest block);
      animation-range: 0px var(--ch-travel, 1px);
    }
    [data-driver="timeline"] [data-slot="condensing-header-material"] {
      animation-duration: auto;
      animation-timeline: scroll(nearest block);
      animation-range: calc(var(--ch-under, 0px) - ${MATERIAL_LEAD}px) var(--ch-under, 0px);
    }
    [data-driver="timeline"] [data-slot="condensing-header-edge"] {
      animation-duration: auto;
      animation-timeline: scroll(nearest block);
      animation-range: var(--ch-under, 0px) calc(var(--ch-under, 0px) + ${EDGE_LEAD}px);
    }
    /* The subtitle and accessory fade while they slide under the bar, and are gone once it sticks. */
    [data-driver="timeline"] > [data-slot="condensing-header-extras"] {
      animation-duration: auto;
      animation-timeline: scroll(nearest block);
      animation-range: var(--ch-under, 0px) var(--ch-collapse, 1px);
    }

    /* Fallback: the same keyframes, paused and scrubbed by a progress value set each frame. */
    [data-driver="frame"] > [data-slot="condensing-header-title"],
    [data-driver="frame"] [data-slot="condensing-header-heading"],
    [data-driver="frame"] [data-slot="condensing-header-twin"] {
      animation-duration: 1s;
      animation-delay: calc(var(--ch-progress, 0) * -1s);
      animation-play-state: paused;
    }
    [data-driver="frame"] > [data-slot="condensing-header-extras"] {
      animation-duration: 1s;
      animation-delay: calc(var(--ch-extras, 0) * -1s);
      animation-play-state: paused;
    }
    [data-driver="frame"] [data-slot="condensing-header-material"] {
      animation-duration: 1s;
      animation-delay: calc(var(--ch-material, 0) * -1s);
      animation-play-state: paused;
    }
    [data-driver="frame"] [data-slot="condensing-header-edge"] {
      animation-duration: 1s;
      animation-delay: calc(var(--ch-edge, 0) * -1s);
      animation-play-state: paused;
    }
  }

  /* Reduced motion: the large title scrolls away with the content and the two states cross-fade. */
  @media (prefers-reduced-motion: reduce) {
    [data-slot="condensing-header-title"] {
      position: static;
      scale: none;
    }
    [data-slot="condensing-header-twin"] {
      display: none;
    }
    [data-slot="condensing-header-compact"] {
      visibility: visible;
      opacity: 0;
    }
    [data-slot="condensing-header-heading"],
    [data-slot="condensing-header-compact"],
    [data-slot="condensing-header-extras"],
    [data-slot="condensing-header-material"],
    [data-slot="condensing-header-edge"] {
      transition: opacity 180ms ease;
    }
    [data-condensed] [data-slot="condensing-header-heading"],
    [data-collapsed] > [data-slot="condensing-header-extras"] {
      opacity: 0;
    }
    [data-condensed] [data-slot="condensing-header-compact"],
    [data-condensed] [data-slot="condensing-header-material"],
    [data-covered] [data-slot="condensing-header-edge"] {
      opacity: 1;
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    [data-slot="condensing-header-material"] {
      background: var(--ch-surface);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }
  @media (prefers-contrast: more) {
    [data-slot="condensing-header-material"] {
      background: var(--ch-surface);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
    [data-slot="condensing-header-edge"] {
      background: var(--foreground, CanvasText);
    }
  }
  @media (forced-colors: active) {
    [data-slot="condensing-header-material"] {
      background: Canvas;
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
    [data-slot="condensing-header-edge"] {
      background: CanvasText;
    }
  }
`;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Sticky positioning and `scroll(nearest)` both resolve against this element; `null` is the window. */
function getScroller(element: HTMLElement) {
  const { body, documentElement } = element.ownerDocument;
  let parent = element.parentElement;

  while (parent && parent !== body && parent !== documentElement) {
    if (/auto|scroll|hidden|overlay/.test(window.getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }

  return null;
}

function supportsScrollTimeline() {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("animation-timeline: scroll()") &&
    CSS.supports("animation-range: 0px 1px")
  );
}

export function CondensingHeader({
  title,
  headingLevel = 1,
  subtitle,
  accessory,
  leading,
  trailing,
  titleAlign = "center",
  onCondensedChange,
  ...props
}: CondensingHeaderProps) {
  const rootRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const extrasRef = useRef<HTMLDivElement>(null);
  const onCondensedChangeRef = useRef(onCondensedChange);
  const Heading = `h${headingLevel}` as "h1";

  useEffect(() => {
    onCondensedChangeRef.current = onCondensedChange;
  }, [onCondensedChange]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const bar = barRef.current;
    const compact = compactRef.current;
    const titleBox = titleRef.current;
    const heading = headingRef.current;
    const extras = extrasRef.current;
    if (!root || !bar || !compact || !titleBox || !heading || !extras) return;

    const scroller = getScroller(root);
    const target = scroller ?? window;
    const driver = supportsScrollTimeline() ? "timeline" : "frame";
    // Scroll offsets. travel: where the title docks. under: where the first thing below the title
    // reaches the bar. collapse: where only the bar is left.
    let travel = 1;
    let under = 0;
    let collapse = 0;
    let condensed = false;
    let stretched = false;
    let frame = 0;

    const set = (name: string, value: string) => {
      if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    };

    // Offsets ignore transforms, and none of the ones read here move when an element sticks.
    const measure = () => {
      const barHeight = bar.offsetHeight;
      const dockTop = compact.offsetTop + compact.offsetHeight / 2 - titleBox.offsetHeight / 2;
      const headingStyle = window.getComputedStyle(heading);
      // Set first: the family changes the width of the compact title measured below.
      if (headingStyle.fontFamily) set("--ch-font", headingStyle.fontFamily);
      const compactSize = Number.parseFloat(window.getComputedStyle(compact).fontSize);
      const largeSize = Number.parseFloat(headingStyle.fontSize);
      const scale = compactSize > 0 && largeSize > 0 ? compactSize / largeSize : 0.5;

      travel = Math.max(1, barHeight - dockTop);
      collapse = Math.max(0, root.offsetHeight - barHeight);
      under = extras.childElementCount ? Math.min(collapse, titleBox.offsetHeight) : collapse;
      set("--ch-dock-top", `${dockTop}px`);
      set("--ch-travel", `${travel}px`);
      set("--ch-under", `${under}px`);
      set("--ch-collapse", `${collapse}px`);
      set(
        "--ch-dx",
        `${compact.offsetLeft + compact.offsetWidth / 2 - (titleBox.offsetLeft + titleBox.offsetWidth / 2)}px`,
      );
      set("--ch-scale", scale.toFixed(4));
      set("--ch-inverse", (1 / scale).toFixed(4));
      // One spare pixel, so rounding never truncates a title that fits.
      set("--ch-slot-width", `${compact.offsetWidth + 1}px`);
    };

    const update = () => {
      const offset = scroller ? scroller.scrollTop : window.scrollY;
      const progress = clamp(offset / travel);

      if (driver === "frame") {
        set("--ch-progress", progress.toFixed(4));
        set("--ch-material", clamp((offset - under + MATERIAL_LEAD) / MATERIAL_LEAD).toFixed(4));
        set("--ch-edge", clamp((offset - under) / EDGE_LEAD).toFixed(4));
        set("--ch-extras", clamp((offset - under) / Math.max(1, collapse - under)).toFixed(4));
      }

      // Where the browser reports rubber-banding as a negative offset, the content has already moved
      // with the finger; the title also grows, with resistance, so it does not ride along rigidly.
      if (offset < 0) {
        stretched = true;
        set("--ch-stretch", (1 + (0.15 * -offset) / (300 - offset)).toFixed(4));
      } else if (stretched) {
        stretched = false;
        root.style.removeProperty("--ch-stretch");
      }

      const collapsed = offset >= collapse && collapse > 0;
      root.toggleAttribute("data-covered", offset > under);
      root.toggleAttribute("data-collapsed", collapsed);
      extras.toggleAttribute("inert", collapsed);

      const next = progress >= CONDENSED_AT;
      if (next !== condensed) {
        condensed = next;
        root.toggleAttribute("data-condensed", next);
        onCondensedChangeRef.current?.(next);
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    const refresh = () => {
      measure();
      update();
    };

    refresh();
    root.setAttribute("data-driver", driver);
    root.setAttribute("data-ready", "");

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refresh);
    for (const element of [root, bar, compact, titleBox, heading]) observer?.observe(element);
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", refresh);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  return (
    <header {...props} ref={rootRef} data-slot="condensing-header" data-title-align={titleAlign}>
      <style>{styles}</style>
      <div ref={barRef} data-slot="condensing-header-bar">
        <div aria-hidden="true" data-slot="condensing-header-material" />
        <div aria-hidden="true" data-slot="condensing-header-edge" />
        {leading ? <div data-slot="condensing-header-leading">{leading}</div> : null}
        <div data-slot="condensing-header-slot">
          <span ref={compactRef} aria-hidden="true" data-slot="condensing-header-compact">
            {title}
          </span>
        </div>
        {trailing ? <div data-slot="condensing-header-trailing">{trailing}</div> : null}
      </div>
      <div ref={titleRef} data-slot="condensing-header-title">
        <Heading ref={headingRef} data-slot="condensing-header-heading">
          {title}
        </Heading>
        <span aria-hidden="true" data-slot="condensing-header-twin">
          {title}
        </span>
      </div>
      <div ref={extrasRef} data-slot="condensing-header-extras">
        {subtitle ? <div data-slot="condensing-header-subtitle">{subtitle}</div> : null}
        {accessory ? <div data-slot="condensing-header-accessory">{accessory}</div> : null}
      </div>
    </header>
  );
}
