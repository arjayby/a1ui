"use client";

import { useEffect, useRef, useState } from "react";

/** The narrowest layout a framed demo renders at on a desktop screen: just past Tailwind's `sm`. */
const DESKTOP_WIDTH = 672;

/**
 * A demo in a frame of its own, for components that open over the page. Inside the
 * frame a dialog's scrim, a sheet's edge, scroll locking and focus all stop at the card.
 *
 * On a desktop screen the frame is laid out at a desktop width and scaled down to fit,
 * so the card shows the layout the docs page shows, not the phone one.
 */
export function CatalogFrame({ src }: { src: string }) {
  const slot = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number; scale: number } | null>(null);

  useEffect(() => {
    const element = slot.current;
    if (!element) return;
    const desktop = window.matchMedia("(min-width: 40rem)");
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width === 0) return;
      const layoutWidth = desktop.matches ? Math.max(width, DESKTOP_WIDTH) : width;
      const scale = width / layoutWidth;
      setBox({ width: layoutWidth, height: height / scale, scale });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    desktop.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", measure);
    };
  }, []);

  return (
    <div ref={slot} className="catalog-frame">
      {box ? (
        <iframe
          src={src}
          title=""
          loading="lazy"
          tabIndex={-1}
          inert
          // `zoom`, not a transform: a scaled frame smears anything with a backdrop blur.
          style={{ width: box.width, height: box.height, zoom: box.scale }}
        />
      ) : null}
    </div>
  );
}
