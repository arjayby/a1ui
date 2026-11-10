"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

// Critically damped (about a 0.35s response): pages, pans and spring-backs settle without wobble.
// Written as stiffness and damping because Motion drops `velocity` on duration-based springs,
// and every release hands its spring the pointer's velocity.
const SETTLE = { type: "spring", stiffness: 320, damping: 36 } as const;
// Slightly under-damped (ratio about 0.8), used only when a flick throws the page.
const FLICK = { type: "spring", stiffness: 320, damping: 29 } as const;
// The thumbnail-to-screen travel, a 0 to 1 value, so it needs finer rest thresholds than pixels.
const TRAVEL = { type: "spring", stiffness: 250, damping: 32, restDelta: 0.001, restSpeed: 0.001 } as const;
// Reduced motion swaps every spring for this short fade.
const FADE = { duration: 0.15, ease: "linear" } as const;

/** Space between neighbouring images while paging. */
const GAP = 24;
/** Pointer travel before a drag commits to paging or dismissing. */
const SLOP = 8;
/** Two taps this close in time and space make a double tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE = 30;
/** Room kept clear around the fitted image for the close button, arrows and caption. */
const EDGE = 64;
const RADIUS = 4;

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type Box = Point & Size;
type Origin = Box & { radius: number };
type Sample = Point & { t: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const between = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Apple's rubber band: the further past the edge, the less the content follows. */
function rubberBand(overshoot: number, dimension: number) {
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
}

/** Follows 1:1 inside the range and resists progressively outside it. */
function band(value: number, min: number, max: number, dimension: number, elastic: boolean) {
  if (!elastic) return clamp(value, min, max);
  if (value < min) return min + rubberBand(value - min, dimension);
  if (value > max) return max + rubberBand(value - max, dimension);
  return value;
}

/** Where a release at this velocity (px/s) would coast to, the way scrolling decelerates. */
function project(velocity: number, deceleration = 0.998) {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

/** Pointer velocity in px/s over the last 100ms. A pointer that paused before lifting has none. */
function releaseVelocity(samples: Sample[], now: number): Point {
  const last = samples[samples.length - 1];
  if (!last || now - last.t > 80) return { x: 0, y: 0 };
  const first = samples.find((sample) => last.t - sample.t <= 100) ?? last;
  const seconds = (last.t - first.t) / 1000;
  if (seconds <= 0) return { x: 0, y: 0 };
  return { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds };
}

function viewport(): Size {
  return typeof window === "undefined"
    ? { width: 1024, height: 768 }
    : { width: window.innerWidth, height: window.innerHeight };
}

/** The largest box of this aspect ratio that fits the stage, never larger than the declared size. */
function fitBox(stage: Size, aspect: number, declared?: Size): Box {
  const side = stage.width >= 640 ? EDGE : 0;
  const availableWidth = Math.max(1, stage.width - side * 2);
  const availableHeight = Math.max(1, stage.height - EDGE * 2);
  let width = availableWidth;
  let height = width / aspect;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * aspect;
  }
  if (declared && width > declared.width) ({ width, height } = declared);
  return { x: (stage.width - width) / 2, y: (stage.height - height) / 2, width, height };
}

export interface LightboxImage {
  src: string;
  /** Describes the image for assistive technology. */
  alt: string;
  /** Shown under the image while it is open. */
  caption?: ReactNode;
  /** Intrinsic size in pixels. Sets the aspect ratio before the image loads and caps the fitted size. */
  width?: number;
  height?: number;
  /** A smaller source for the thumbnail. It also stands in while the full image loads. */
  thumbnail?: string;
}

type LightboxContextValue = {
  images: readonly LightboxImage[];
  openAt: (index: number) => void;
  register: (index: number, node: HTMLElement | null) => void;
  /** The thumbnail the open image stands in for, hidden so only one copy is on screen. */
  covered: number | null;
};

const LightboxContext = createContext<LightboxContextValue | null>(null);

export interface LightboxProps {
  images: readonly LightboxImage[];
  /** Whether the viewer is open when controlled by the caller. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The image shown when controlled by the caller. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Show previous and next buttons when there is more than one image. */
  showArrows?: boolean;
  /** Largest zoom factor. 1 turns zooming off. */
  maxZoom?: number;
  /** Accessible name of the viewer. */
  label?: string;
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  /** Classes for the default thumbnail grid, used when no children are given. */
  className?: string;
  /** Your own layout of LightboxThumbnail elements. Defaults to a grid of every image. */
  children?: ReactNode;
}

export function Lightbox({
  images,
  open,
  defaultOpen = false,
  onOpenChange,
  index,
  defaultIndex = 0,
  onIndexChange,
  showArrows = true,
  maxZoom = 4,
  label = "Image viewer",
  closeLabel = "Close",
  previousLabel = "Previous image",
  nextLabel = "Next image",
  className,
  children,
}: LightboxProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const count = images.length;
  const current = (open ?? internalOpen) && count > 0;
  const requested = index ?? internalIndex;
  const active = clamp(Number.isFinite(requested) ? Math.trunc(requested) : 0, 0, Math.max(0, count - 1));
  const thumbnails = useRef(new Map<number, HTMLElement>());

  // Keep the viewer rendered after closing until the image has travelled back to its thumbnail.
  const [present, setPresent] = useState(current);
  if (current && !present) setPresent(true);
  // The thumbnail hides only once the viewer's copy of the image is on screen.
  const [staged, setStaged] = useState(false);

  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const setIndex = (next: number) => {
    if (next === active) return;
    if (index === undefined) setInternalIndex(next);
    onIndexChange?.(next);
  };

  const register = useCallback((slot: number, node: HTMLElement | null) => {
    if (node) thumbnails.current.set(slot, node);
    else thumbnails.current.delete(slot);
  }, []);
  const getThumbnail = useCallback((slot: number) => {
    const node = thumbnails.current.get(slot);
    return node?.isConnected ? node : null;
  }, []);

  return (
    <LightboxContext.Provider
      value={{
        images,
        register,
        covered: present && staged && !reducedMotion ? active : null,
        openAt: (next) => {
          if (index === undefined) setInternalIndex(next);
          if (next !== active) onIndexChange?.(next);
          setOpen(true);
        },
      }}
    >
      {children ?? (
        <div data-slot="lightbox-grid" className={`grid grid-cols-3 gap-2 ${className ?? ""}`}>
          {images.map((image, slot) => (
            <LightboxThumbnail key={`${slot}-${image.src}`} index={slot} />
          ))}
        </div>
      )}
      <DialogPrimitive.Root
        open={current}
        // Taps on the scrim are part of the viewer's own gesture handling.
        disablePointerDismissal
        onOpenChange={(next) => {
          if (next !== current) setOpen(next);
        }}
      >
        {(present || current) && (
          <LightboxViewer
            images={images}
            index={active}
            open={current}
            reducedMotion={reducedMotion}
            showArrows={showArrows}
            maxZoom={Number.isFinite(maxZoom) ? Math.max(1, maxZoom) : 4}
            label={label}
            closeLabel={closeLabel}
            previousLabel={previousLabel}
            nextLabel={nextLabel}
            getThumbnail={getThumbnail}
            onIndexRequest={setIndex}
            onCloseRequest={() => setOpen(false)}
            onStaged={setStaged}
            onExited={() => {
              setPresent(false);
              setStaged(false);
            }}
          />
        )}
      </DialogPrimitive.Root>
    </LightboxContext.Provider>
  );
}

export type LightboxThumbnailProps = Omit<ComponentProps<"button">, "type"> & {
  /** Position of this thumbnail's image in `images`. */
  index: number;
};

export function LightboxThumbnail({
  index,
  className,
  style,
  children,
  onClick,
  ...props
}: LightboxThumbnailProps) {
  const context = useContext(LightboxContext);
  if (!context) throw new Error("LightboxThumbnail must be used within Lightbox.");
  const { register, openAt, covered } = context;
  const image = context.images[index];
  if (!image) return null;
  return (
    <button
      aria-haspopup="dialog"
      {...props}
      type="button"
      ref={(node) => {
        register(index, node);
        return () => register(index, null);
      }}
      data-slot="lightbox-thumbnail"
      data-covered={covered === index || undefined}
      // Hidden with opacity so it keeps its place, its focus, and can be clicked to reopen mid-close.
      style={covered === index ? { ...style, opacity: 0 } : style}
      className={`bg-muted focus-visible:ring-ring/50 relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg transition-transform duration-100 outline-none select-none focus-visible:ring-3 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:opacity-80 ${className ?? ""}`}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) openAt(index);
      }}
    >
      {children ?? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.thumbnail ?? image.src}
          alt={image.alt}
          draggable={false}
          className="size-full object-cover"
        />
      )}
    </button>
  );
}

type Mode = "rest" | "pending" | "page" | "dismiss" | "pan" | "pinch";

type Gesture = {
  pointers: Map<number, Point>;
  mode: Mode;
  /** Where the pointer was when the current mode took hold. */
  start: Point;
  /** The value that sat under the pointer at that moment: track offset, drag offset or pan. */
  base: Point;
  moved: boolean;
  onImage: boolean;
  samples: Sample[];
  pinch: { distance: number; zoom: number; middle: Point; pan: Point; last: Point };
  lastTap: Sample | null;
};

interface LightboxViewerProps {
  images: readonly LightboxImage[];
  index: number;
  open: boolean;
  reducedMotion: boolean;
  showArrows: boolean;
  maxZoom: number;
  label: string;
  closeLabel: string;
  previousLabel: string;
  nextLabel: string;
  getThumbnail: (index: number) => HTMLElement | null;
  onIndexRequest: (index: number) => void;
  onCloseRequest: () => void;
  onStaged: (staged: boolean) => void;
  onExited: () => void;
}

const chromeButton =
  "border-border bg-background/70 text-foreground hover:bg-background focus-visible:ring-ring/50 pointer-events-auto absolute inline-flex size-11 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur-xl backdrop-saturate-150 outline-none transition-transform duration-100 focus-visible:ring-3 active:scale-90 aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 contrast-more:border-foreground contrast-more:bg-background [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";
const chromeLabel =
  "border-border bg-background/70 text-foreground rounded-full border backdrop-blur-xl backdrop-saturate-150 contrast-more:border-foreground contrast-more:bg-background [@media(prefers-reduced-transparency:reduce)]:bg-background [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none";

// Mounted fresh for every opening, so its motion values always start at the thumbnail.
function LightboxViewer({
  images,
  index,
  open,
  reducedMotion,
  showArrows,
  maxZoom,
  label,
  closeLabel,
  previousLabel,
  nextLabel,
  getThumbnail,
  onIndexRequest,
  onCloseRequest,
  onStaged,
  onExited,
}: LightboxViewerProps) {
  const count = images.length;
  const [stage, setStage] = useState(viewport);
  const [stageNode, setStageNode] = useState<HTMLDivElement | null>(null);
  // Aspect ratios learned from the thumbnails and from each image as it loads.
  const [aspects, setAspects] = useState<Record<number, number>>(() => {
    const known: Record<number, number> = {};
    images.forEach((_, slot) => {
      const picture = getThumbnail(slot)?.querySelector("img");
      if (picture?.naturalWidth && picture.naturalHeight)
        known[slot] = picture.naturalWidth / picture.naturalHeight;
    });
    return known;
  });
  const [zoomed, setZoomed] = useState(false);
  // Bumped on every release so the settling effects run even when open and index did not change,
  // which is also how a controlled parent that ignores a request gets its image sprung back.
  const [releases, settleAgain] = useReducer((n: number) => n + 1, 0);

  const page = stage.width + GAP;
  const fitOf = (slot: number) => {
    const image = images[slot];
    const declared = image?.width && image.height ? { width: image.width, height: image.height } : undefined;
    return fitBox(stage, declared ? declared.width / declared.height : (aspects[slot] ?? 1.5), declared);
  };
  const fit = fitOf(index);

  /** 0 at the thumbnail, 1 fitted to the screen. */
  const progress = useMotionValue(0);
  /** The thumbnail's live rectangle, or null when there is none to travel to. */
  const origin = useMotionValue<Origin | null>(null);
  const trackX = useMotionValue(-index * page);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  /** Where the image was grabbed, from its centre, so it shrinks around the pointer. */
  const grabX = useMotionValue(0);
  const grabY = useMotionValue(0);
  const zoom = useMotionValue(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  /** Horizontal drag distance under reduced motion, where the images do not slide. */
  const swipe = useMotionValue(0);

  /**
   * How far the dismiss drag has faded the scrim, 0 to 1. Kept apart from the drag offset: when a
   * drag commits to closing, the offset unwinds but the scrim must keep fading, not brighten again.
   */
  const fade = useMotionValue(0);

  // 0 at rest, 1 once the image has been dragged most of the way off.
  const away = useTransform(() => Math.min(1, Math.hypot(dragX.get(), dragY.get()) / (stage.height * 0.6)));
  // The scrim and the controls fade with the open travel and with the dismiss drag.
  const veil = useTransform(() => clamp(progress.get(), 0, 1) * (1 - fade.get()));

  const pose = useTransform(() => {
    const rest = `inset(0px round ${RADIUS}px)`;
    if (reducedMotion) {
      // Nothing travels: the viewer cross-fades in place, and only zoom and pan move the image.
      const dim = 1 - Math.min(0.5, Math.abs(swipe.get()) / stage.width);
      return { x: panX.get(), y: panY.get(), scale: zoom.get(), clip: rest, opacity: veil.get() * dim };
    }
    const travel = progress.get();
    const eased = clamp(travel, 0, 1);
    const from = origin.get();
    // The image shrinks a little as it is dragged away, around the point where it was grabbed.
    const shrink = 1 - away.get() * 0.3;
    const held = {
      x: dragX.get() + grabX.get() * (1 - shrink) + panX.get(),
      y: dragY.get() + grabY.get() * (1 - shrink) + panY.get(),
    };
    if (!from) {
      // No thumbnail to return to: fade and settle from slightly smaller instead.
      return {
        x: held.x,
        y: held.y,
        scale: mix(0.94, 1, travel) * shrink * zoom.get(),
        clip: rest,
        opacity: eased,
      };
    }
    // At the thumbnail the image covers it like `object-fit: cover`, and the clip crops the overflow.
    const cover = Math.max(from.width / fit.width, from.height / fit.height);
    const slideLeft = trackX.get() + index * page;
    const startX = from.x + from.width / 2 - (slideLeft + fit.x + fit.width / 2);
    const startY = from.y + from.height / 2 - (fit.y + fit.height / 2);
    const insetX = mix(Math.max(0, (fit.width - from.width / cover) / 2), 0, eased);
    const insetY = mix(Math.max(0, (fit.height - from.height / cover) / 2), 0, eased);
    const radius = mix(from.radius / cover, RADIUS, eased);
    return {
      x: mix(startX, 0, travel) + held.x,
      y: mix(startY, 0, travel) + held.y,
      scale: mix(cover, 1, travel) * shrink * zoom.get(),
      clip: `inset(${insetY}px ${insetX}px round ${radius}px)`,
      opacity: 1,
    };
  });
  const imageX = useTransform(() => pose.get().x);
  const imageY = useTransform(() => pose.get().y);
  const imageScale = useTransform(() => pose.get().scale);
  const imageClip = useTransform(() => pose.get().clip);
  const imageOpacity = useTransform(() => pose.get().opacity);

  // What the event handlers need from the latest render.
  const latest = useRef({ index, count, open, page, stage, fit, maxZoom, reducedMotion, onExited });
  useLayoutEffect(() => {
    latest.current = { index, count, open, page, stage, fit, maxZoom, reducedMotion, onExited };
  });
  const gestureRef = useRef<Gesture | null>(null);
  const gesture = () =>
    (gestureRef.current ??= {
      pointers: new Map(),
      mode: "rest",
      start: { x: 0, y: 0 },
      base: { x: 0, y: 0 },
      moved: false,
      onImage: false,
      samples: [],
      pinch: { distance: 1, zoom: 1, middle: { x: 0, y: 0 }, pan: { x: 0, y: 0 }, last: { x: 0, y: 0 } },
      lastTap: null,
    });
  // Release velocity, handed to whichever spring takes over from the finger.
  const dragToss = useRef<Point>({ x: 0, y: 0 });
  const trackToss = useRef({ velocity: 0, flick: false });

  const measure = useCallback(() => {
    const node = getThumbnail(latest.current.index);
    const box = node?.getBoundingClientRect();
    if (!node || !box || box.width <= 0 || box.height <= 0) {
      if (origin.get()) origin.set(null);
      return;
    }
    const radius = Number.parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
    const known = origin.get();
    if (
      known &&
      known.x === box.left &&
      known.y === box.top &&
      known.width === box.width &&
      known.height === box.height &&
      known.radius === radius
    )
      return;
    origin.set({ x: box.left, y: box.top, width: box.width, height: box.height, radius });
  }, [getThumbnail, origin]);

  // Follow the thumbnail for as long as the image is travelling: the page may scroll or reflow
  // underneath, and the image has to land on where the thumbnail is now.
  useEffect(() => progress.on("change", measure), [progress, measure]);

  useEffect(() => {
    const resize = () => setStage(viewport());
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => zoom.on("change", (value) => setZoomed(value > 1.01)), [zoom]);

  useLayoutEffect(() => {
    if (!stageNode) return;
    onStaged(true);
  }, [stageNode, onStaged]);

  // Open, close, and every release of a dismiss drag. Each animation starts from the value on
  // screen, so reversing mid-flight turns around from where the image is.
  useLayoutEffect(() => {
    measure();
    const toss = dragToss.current;
    dragToss.current = { x: 0, y: 0 };
    const travel = reducedMotion ? FADE : TRAVEL;
    const home = (value: typeof dragX, velocity: number) => {
      if (reducedMotion) value.jump(0);
      else animate(value, 0, { ...SETTLE, velocity });
    };
    if (open) {
      animate(progress, 1, travel);
      animate(fade, 0, reducedMotion ? FADE : SETTLE);
      home(dragX, toss.x);
      home(dragY, toss.y);
      return;
    }
    // With a thumbnail to land on, the drag offset unwinds while the image flies home, carrying
    // the release velocity. Without one the image fades where it was let go.
    if (origin.get() || reducedMotion) {
      home(dragX, toss.x);
      home(dragY, toss.y);
    }
    for (const [value, rest] of [
      [zoom, 1],
      [panX, 0],
      [panY, 0],
    ] as const) {
      if (reducedMotion) value.jump(rest);
      else animate(value, rest, SETTLE);
    }
    animate(progress, 0, {
      ...travel,
      onComplete: () => {
        if (!latest.current.open) latest.current.onExited();
      },
    });
    // Motion values are stable; `releases` re-runs this after each gesture.
  }, [open, releases, reducedMotion, measure, progress, origin, fade, dragX, dragY, zoom, panX, panY]);

  // Bring the track to the current image: after a swipe, a key press, a button or a new `index`.
  const settled = useRef({ index, page });
  useLayoutEffect(() => {
    const target = -index * page;
    const was = settled.current;
    settled.current = { index, page };
    const toss = trackToss.current;
    trackToss.current = { velocity: 0, flick: false };
    if (was.index !== index) {
      zoom.jump(1);
      panX.jump(0);
      panY.jump(0);
    }
    if (reducedMotion || was.page !== page) {
      trackX.jump(target);
      return;
    }
    // A jump across several images slides in from the neighbouring slot instead of the far end.
    const distance = trackX.get() - target;
    if (Math.abs(distance) > page * 1.5) trackX.jump(target + Math.sign(distance) * page);
    animate(trackX, target, { ...(toss.flick ? FLICK : SETTLE), velocity: toss.velocity });
  }, [index, page, releases, reducedMotion, trackX, zoom, panX, panY]);

  const centre = () => ({ x: latest.current.stage.width / 2, y: latest.current.stage.height / 2 });

  /** How far the image can pan at this zoom before an edge would come into view. */
  const panLimit = (scale: number) => {
    const now = latest.current;
    return {
      x: Math.max(0, (now.fit.width * scale - now.stage.width) / 2),
      y: Math.max(0, (now.fit.height * scale - now.stage.height) / 2),
    };
  };

  /** Zooms while keeping the image point under `anchor` where it is. */
  const zoomTo = (target: number, anchor: Point, immediate = false) => {
    const from = zoom.get();
    const middle = centre();
    const limit = panLimit(target);
    const keep = 1 - target / from;
    const x =
      target <= 1 ? 0 : clamp(panX.get() + (anchor.x - middle.x - panX.get()) * keep, -limit.x, limit.x);
    const y =
      target <= 1 ? 0 : clamp(panY.get() + (anchor.y - middle.y - panY.get()) * keep, -limit.y, limit.y);
    for (const [value, to] of [
      [zoom, target],
      [panX, x],
      [panY, y],
    ] as const) {
      if (immediate || latest.current.reducedMotion) value.jump(to);
      else animate(value, to, SETTLE);
    }
  };

  /** Lets a pan coast to where its momentum points, or springs it back inside the image bounds. */
  const settlePan = (velocity: Point) => {
    const limit = panLimit(zoom.get());
    if (latest.current.reducedMotion) {
      panX.jump(clamp(panX.get(), -limit.x, limit.x));
      panY.jump(clamp(panY.get(), -limit.y, limit.y));
      return;
    }
    animate(panX, clamp(panX.get() + project(velocity.x, 0.99), -limit.x, limit.x), {
      ...SETTLE,
      velocity: velocity.x,
    });
    animate(panY, clamp(panY.get() + project(velocity.y, 0.99), -limit.y, limit.y), {
      ...SETTLE,
      velocity: velocity.y,
    });
  };

  const step = (delta: number) => {
    const now = latest.current;
    const target = now.index + delta;
    if (target >= 0 && target < now.count) {
      onIndexRequest(target);
      return;
    }
    // Nothing further that way: nudge the image against the end and let it settle back.
    if (!now.reducedMotion) animate(trackX, -now.index * now.page, { ...SETTLE, velocity: -delta * 900 });
  };

  const pinchPoints = (state: Gesture) => {
    const [first, second] = [...state.pointers.values()];
    return { first, second, middle: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 } };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const now = latest.current;
    if (!now.open || (event.pointerType === "mouse" && event.button !== 0)) return;
    const state = gesture();
    try {
      // Keeps the drag tracking when the pointer leaves the window.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone, or the environment has no pointer capture.
    }
    const point = { x: event.clientX, y: event.clientY };
    state.pointers.set(event.pointerId, point);
    if (state.pointers.size > 2) return;
    if (state.pointers.size === 2) {
      // A second finger turns whatever was happening into a pinch; the springs take the rest home.
      if (state.mode === "page" || state.mode === "dismiss") settleAgain();
      swipe.set(0);
      zoom.stop();
      panX.stop();
      panY.stop();
      const { first, second, middle } = pinchPoints(state);
      state.mode = "pinch";
      state.moved = true;
      state.pinch = {
        distance: Math.max(1, between(first, second)),
        zoom: zoom.get(),
        middle,
        pan: { x: panX.get(), y: panY.get() },
        last: middle,
      };
      return;
    }
    // First finger down: catch whatever is moving and carry on from where it is.
    for (const value of [trackX, dragX, dragY, fade, zoom, panX, panY]) value.stop();
    state.start = point;
    state.moved = false;
    state.samples = [{ t: event.timeStamp, ...point }];
    state.onImage =
      event.target instanceof Element && event.target.closest('[data-slot="lightbox-image"]') !== null;
    if (zoom.get() > 1.01) {
      state.mode = "pan";
      state.base = { x: panX.get(), y: panY.get() };
      return;
    }
    zoom.jump(1);
    panX.jump(0);
    panY.jump(0);
    if (!now.reducedMotion && Math.abs(trackX.get() + now.index * now.page) > 1) {
      state.mode = "page";
      state.moved = true;
      state.base = { x: trackX.get(), y: 0 };
    } else if (Math.abs(dragX.get()) + Math.abs(dragY.get()) > 1) {
      state.mode = "dismiss";
      state.moved = true;
      state.base = { x: dragX.get(), y: dragY.get() };
    } else {
      state.mode = "pending";
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const now = latest.current;
    const state = gesture();
    if (!state.pointers.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    state.pointers.set(event.pointerId, point);
    if (state.mode === "pinch") {
      if (state.pointers.size < 2) return;
      const { first, second, middle } = pinchPoints(state);
      const raw = (state.pinch.zoom * between(first, second)) / state.pinch.distance;
      // Past either limit the zoom keeps following the fingers, with resistance.
      const scale =
        raw < 1
          ? 1 - rubberBand(1 - raw, 1)
          : raw > now.maxZoom
            ? now.maxZoom + rubberBand(raw - now.maxZoom, now.maxZoom)
            : raw;
      const mid = centre();
      const ratio = scale / state.pinch.zoom;
      zoom.set(scale);
      panX.set(middle.x - mid.x - (state.pinch.middle.x - mid.x - state.pinch.pan.x) * ratio);
      panY.set(middle.y - mid.y - (state.pinch.middle.y - mid.y - state.pinch.pan.y) * ratio);
      state.pinch.last = middle;
      return;
    }
    if (state.mode === "rest" || state.pointers.size !== 1) return;
    state.samples.push({ t: event.timeStamp, ...point });
    if (state.samples.length > 12) state.samples.shift();
    let dx = point.x - state.start.x;
    let dy = point.y - state.start.y;
    if (!state.moved && Math.hypot(dx, dy) < SLOP) return;
    state.moved = true;
    if (state.mode === "pending") {
      // Lock to one axis so paging and dismissing never fight, then track from this point so the
      // image does not jump by the distance it took to decide.
      state.mode = Math.abs(dx) > Math.abs(dy) ? "page" : "dismiss";
      state.start = point;
      dx = 0;
      dy = 0;
      if (state.mode === "page") {
        state.base = { x: trackX.get(), y: 0 };
      } else {
        state.base = { x: 0, y: 0 };
        const mid = centre();
        grabX.set(point.x - mid.x);
        grabY.set(point.y - mid.y);
      }
    }
    if (state.mode === "page") {
      if (now.reducedMotion) swipe.set(dx);
      else trackX.set(band(state.base.x + dx, -(now.count - 1) * now.page, 0, now.stage.width, true));
    } else if (state.mode === "dismiss") {
      dragX.set(state.base.x + dx);
      dragY.set(state.base.y + dy);
      fade.set(Math.min(1, Math.hypot(dragX.get(), dragY.get()) / (now.stage.height * 0.6)));
    } else if (state.mode === "pan") {
      const limit = panLimit(zoom.get());
      const elastic = !now.reducedMotion;
      panX.set(band(state.base.x + dx, -limit.x, limit.x, now.stage.width, elastic));
      panY.set(band(state.base.y + dy, -limit.y, limit.y, now.stage.height, elastic));
    }
  };

  const release = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const now = latest.current;
    const state = gesture();
    if (!state.pointers.delete(event.pointerId)) return;
    if (state.mode === "pinch") {
      if (state.pointers.size >= 2) return;
      // The remaining finger waits for a fresh touch rather than turning into a surprise drag.
      state.mode = "rest";
      const scale = zoom.get();
      const target = clamp(scale, 1, now.maxZoom);
      if (target !== scale || target <= 1.01) zoomTo(target <= 1.01 ? 1 : target, state.pinch.last);
      else settlePan({ x: 0, y: 0 });
      return;
    }
    if (state.pointers.size > 0) return;
    const mode = state.mode;
    state.mode = "rest";
    const point = { x: event.clientX, y: event.clientY };
    const velocity = cancelled ? { x: 0, y: 0 } : releaseVelocity(state.samples, event.timeStamp);

    if (!state.moved) {
      if (mode === "pan") settlePan({ x: 0, y: 0 });
      if (cancelled) return;
      const last = state.lastTap;
      if (last && event.timeStamp - last.t < DOUBLE_TAP_MS && between(last, point) < DOUBLE_TAP_DISTANCE) {
        state.lastTap = null;
        zoomTo(zoom.get() > 1.05 ? 1 : Math.min(now.maxZoom, 2.5), point);
        return;
      }
      state.lastTap = { t: event.timeStamp, ...point };
      // A tap beside the image closes. On the image it waits to see if a second tap follows.
      if (!state.onImage && zoom.get() <= 1.01) onCloseRequest();
      return;
    }

    if (mode === "page") {
      if (now.reducedMotion) {
        const travel = swipe.get() + project(velocity.x);
        swipe.set(0);
        const target = clamp(now.index - Math.sign(travel), 0, now.count - 1);
        if (Math.abs(travel) > now.stage.width * 0.3 && target !== now.index) onIndexRequest(target);
        return;
      }
      // Page to wherever the swipe's momentum would carry it, one image at most.
      const landing = Math.round(-(trackX.get() + project(velocity.x)) / now.page);
      const target = clamp(clamp(landing, now.index - 1, now.index + 1), 0, now.count - 1);
      const resting = Math.abs(trackX.get() + target * now.page) < 1;
      trackToss.current = { velocity: velocity.x, flick: !resting && Math.abs(velocity.x) > 500 };
      if (target !== now.index) onIndexRequest(target);
      settleAgain();
    } else if (mode === "dismiss") {
      // Dismiss when the momentum carries the image far enough, and never against a reversal.
      const travel = dragY.get() + project(velocity.y);
      const committed =
        Math.abs(travel) > now.stage.height * 0.25 &&
        (dragY.get() === 0 || Math.sign(travel) === Math.sign(dragY.get()));
      dragToss.current = velocity;
      if (committed) onCloseRequest();
      settleAgain();
    } else if (mode === "pan") {
      settlePan(velocity);
    }
  };

  // Ctrl or Cmd with the wheel zooms on the pointer (a trackpad pinch arrives the same way).
  // While zoomed, the plain wheel pans. Registered natively because it must cancel the page zoom.
  const handleWheel = useEffectEvent((event: WheelEvent) => {
    event.preventDefault();
    const now = latest.current;
    if (!now.open) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? now.stage.height : 1;
    if (event.ctrlKey || event.metaKey) {
      const delta = clamp(event.deltaY * unit, -30, 30);
      const target = clamp(zoom.get() * Math.exp(-delta * 0.01), 1, now.maxZoom);
      zoomTo(target, { x: event.clientX, y: event.clientY }, true);
    } else if (zoom.get() > 1.01) {
      const limit = panLimit(zoom.get());
      panX.jump(clamp(panX.get() - event.deltaX * unit, -limit.x, limit.x));
      panY.jump(clamp(panY.get() - event.deltaY * unit, -limit.y, limit.y));
    }
  });
  useEffect(() => {
    if (!stageNode) return;
    const wheel = (event: WheelEvent) => handleWheel(event);
    stageNode.addEventListener("wheel", wheel, { passive: false });
    return () => stageNode.removeEventListener("wheel", wheel);
  }, [stageNode]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const scale = zoom.get();
    if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
    else if (event.key === "Home") onIndexRequest(0);
    else if (event.key === "End") onIndexRequest(count - 1);
    else if (event.key === "+" || event.key === "=") zoomTo(Math.min(maxZoom, scale * 1.5), centre());
    else if (event.key === "-" || event.key === "_") zoomTo(Math.max(1, scale / 1.5), centre());
    else if (event.key === "0") zoomTo(1, centre());
    else return;
    event.preventDefault();
  };

  const image = images[index];
  const paged = count > 1;
  const slots = [index - 1, index, index + 1].filter((slot) => slot >= 0 && slot < count);

  return (
    <DialogPrimitive.Portal keepMounted>
      <DialogPrimitive.Backdrop
        data-slot="lightbox-scrim"
        hidden={false}
        style={{ pointerEvents: "none" }}
        className="bg-background/90 contrast-more:bg-background [@media(prefers-reduced-transparency:reduce)]:bg-background fixed inset-0 z-50 backdrop-blur-xl [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
        render={<motion.div style={{ opacity: veil }} />}
      />
      <DialogPrimitive.Popup
        data-slot="lightbox"
        data-state={open ? "open" : "closed"}
        aria-label={label}
        hidden={false}
        // While closing, the viewer only plays its exit: clicks fall through to the page, so the
        // thumbnail can reopen it mid-flight.
        inert={!open}
        style={{ pointerEvents: open ? undefined : "none" }}
        finalFocus={() => getThumbnail(latest.current.index) ?? true}
        onKeyDown={handleKeyDown}
        className="text-foreground fixed inset-0 z-50 overflow-hidden overscroll-contain outline-none"
      >
        <div
          ref={setStageNode}
          data-slot="lightbox-stage"
          data-zoomed={zoomed || undefined}
          className={`absolute inset-0 touch-none select-none ${zoomed ? "cursor-grab active:cursor-grabbing" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => release(event, false)}
          onPointerCancel={(event) => release(event, true)}
        >
          <motion.div
            data-slot="lightbox-track"
            className="absolute inset-0"
            style={{ x: reducedMotion ? 0 : trackX }}
          >
            {slots.map((slot) => {
              const current = slot === index;
              const box = current ? fit : fitOf(slot);
              const picture = images[slot];
              return (
                <div
                  key={slot}
                  data-slot="lightbox-slide"
                  aria-hidden={current ? undefined : true}
                  className={`absolute inset-y-0 w-full ${reducedMotion ? "transition-opacity duration-200 ease-linear" : ""}`}
                  style={{
                    left: reducedMotion ? 0 : slot * page,
                    opacity: reducedMotion && !current ? 0 : 1,
                  }}
                >
                  <motion.div
                    data-slot="lightbox-image"
                    data-current={current || undefined}
                    className="bg-muted absolute bg-cover bg-center will-change-transform"
                    style={{
                      left: box.x,
                      top: box.y,
                      width: box.width,
                      height: box.height,
                      backgroundImage: picture.thumbnail ? `url("${picture.thumbnail}")` : undefined,
                      x: current ? imageX : 0,
                      y: current ? imageY : 0,
                      scale: current ? imageScale : 1,
                      clipPath: current ? imageClip : `inset(0px round ${RADIUS}px)`,
                      opacity: current ? imageOpacity : 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={picture.src}
                      alt={current ? picture.alt : ""}
                      draggable={false}
                      className="pointer-events-none size-full object-cover"
                      onLoad={(event) => {
                        const { naturalWidth, naturalHeight } = event.currentTarget;
                        if (!naturalWidth || !naturalHeight) return;
                        const aspect = naturalWidth / naturalHeight;
                        setAspects((known) =>
                          known[slot] === aspect ? known : { ...known, [slot]: aspect },
                        );
                      }}
                    />
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </div>
        <motion.div
          data-slot="lightbox-controls"
          className="pointer-events-none absolute inset-0"
          style={{ opacity: veil }}
        >
          <DialogPrimitive.Close
            aria-label={closeLabel}
            data-slot="lightbox-close"
            className={`${chromeButton} top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))]`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="size-4"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </DialogPrimitive.Close>
          {paged && showArrows && (
            <>
              <button
                type="button"
                aria-label={previousLabel}
                aria-disabled={index === 0 || undefined}
                data-slot="lightbox-previous"
                className={`${chromeButton} top-1/2 left-[max(0.75rem,env(safe-area-inset-left))] -mt-5.5`}
                onClick={() => step(-1)}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M10 3L5 8l5 5" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={nextLabel}
                aria-disabled={index === count - 1 || undefined}
                data-slot="lightbox-next"
                className={`${chromeButton} top-1/2 right-[max(0.75rem,env(safe-area-inset-right))] -mt-5.5`}
                onClick={() => step(1)}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            </>
          )}
          {paged && (
            <p
              data-slot="lightbox-counter"
              aria-hidden="true"
              className={`${chromeLabel} absolute top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] flex h-11 items-center px-4 font-mono text-xs tabular-nums`}
            >
              {index + 1} / {count}
            </p>
          )}
          {image?.caption != null && (
            <div className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center px-4">
              <p
                data-slot="lightbox-caption"
                className={`${chromeLabel} pointer-events-auto max-w-prose px-4 py-2 text-center text-sm leading-snug text-balance`}
              >
                {image.caption}
              </p>
            </div>
          )}
          <p data-slot="lightbox-status" aria-live="polite" className="sr-only">
            {paged ? `Image ${index + 1} of ${count}: ${image?.alt ?? ""}` : (image?.alt ?? "")}
          </p>
        </motion.div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}
