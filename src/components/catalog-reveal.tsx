"use client";

import { useEffect } from "react";

import type { CatalogReveal as Reveal } from "@/components/catalog-demos";

/**
 * Makes the gesture that brings a demo's hidden content on screen: a click on its
 * trigger, a hover, or a right-click. The events are the ones a pointer would send,
 * so the component opens through its own code and shows its real open state.
 */
export function CatalogReveal({ target, gesture, everyMs }: Omit<Reveal, "place">) {
  useEffect(() => {
    let timer: number | undefined;

    // Inside a card the demo is a picture. A dialog that opens there must not pull the
    // keyboard focus out of the catalog and into its frame, so nothing in the frame takes focus.
    if (window.parent !== window) {
      HTMLElement.prototype.focus = () => {};
      SVGElement.prototype.focus = () => {};
    }

    const perform = () => {
      const element = document.querySelector<HTMLElement>(target);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const at = {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      const pointer = { ...at, pointerType: "mouse" };

      if (gesture === "click") {
        element.click();
      } else if (gesture === "hover") {
        element.dispatchEvent(new PointerEvent("pointerover", pointer));
        element.dispatchEvent(new PointerEvent("pointerenter", { ...pointer, bubbles: false }));
        element.dispatchEvent(new MouseEvent("mouseover", at));
        element.dispatchEvent(new MouseEvent("mouseenter", { ...at, bubbles: false }));
        element.dispatchEvent(new PointerEvent("pointermove", pointer));
        element.dispatchEvent(new MouseEvent("mousemove", at));
      } else {
        const secondary = { button: 2, buttons: 2 };
        element.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, ...secondary }));
        element.dispatchEvent(new MouseEvent("mousedown", { ...at, ...secondary }));
        element.dispatchEvent(new MouseEvent("contextmenu", { ...at, ...secondary }));
      }
      return true;
    };

    // The demo has to hydrate and lay out first, so keep trying until its trigger is there.
    const start = () => {
      if (!perform()) timer = window.setTimeout(start, 100);
      else if (everyMs) timer = window.setInterval(perform, everyMs);
    };
    timer = window.setTimeout(start, 300);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(timer);
    };
  }, [target, gesture, everyMs]);

  return null;
}
