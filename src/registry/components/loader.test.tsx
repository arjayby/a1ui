import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Loader, loaderVariants } from "./loader";

const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

describe("Loader", () => {
  afterEach(() => {
    cleanup();
    motionPreference.reduced = false;
  });

  it("announces a hidden Loading status and hides the animation from assistive technology", () => {
    render(<Loader />);
    const loader = screen.getByRole("status");
    expect(loader).toHaveTextContent("Loading");
    expect(loader).toHaveAttribute("data-variant", "ring");
    expect(loader).toHaveAttribute("data-motion", "full");
    expect(loader.querySelector(".sr-only")).toHaveTextContent("Loading");
    expect(loader.querySelector('[data-slot="loader-glyph"]')).toHaveAttribute("aria-hidden", "true");
    expect(loader.querySelector('[data-slot="loader-label"]')).toBeNull();
  });

  it("shows a visible label in place of the hidden text", () => {
    render(<Loader label="Saving changes" aria-label="Ignored" />);
    const loader = screen.getByRole("status");
    expect(loader).toHaveTextContent(/^Saving changes$/);
    expect(loader.querySelector('[data-slot="loader-label"]')).toHaveTextContent("Saving changes");
    expect(loader.querySelector(".sr-only")).toBeNull();
  });

  it("renders every variant at the requested size", () => {
    for (const variant of loaderVariants) {
      const { unmount } = render(<Loader variant={variant} size={40} aria-label={variant} />);
      const loader = screen.getByRole("status");
      expect(loader).toHaveAttribute("data-variant", variant);
      const shape = loader.querySelector('[data-slot="loader-glyph"]')!.firstElementChild as HTMLElement;
      if (shape.tagName === "svg") expect(shape).toHaveAttribute("height", "40");
      // The line is a track that fills its container, a sixth of the size tall.
      else if (variant === "line") expect(shape.style.height).toBe("7px");
      else expect(shape.style.height).toBe("40px");
      unmount();
    }
  });

  it("moves three tiles around a two-by-two board, one corner at a time", () => {
    render(<Loader variant="tiles" size={100} cycle={0} />);
    const tiles = [
      ...screen.getByRole("status").querySelectorAll<HTMLElement>('[data-slot="loader-glyph"] > span > span'),
    ];
    expect(tiles).toHaveLength(3);
    expect(tiles.map((tile) => tile.style.transform)).toEqual([
      "translate(56px, 56px)",
      "translate(56px, 0px)",
      "translate(0px, 0px)",
    ]);
    expect(tiles[0].style.width).toBe("44px");
  });

  it("holds a still frame when the cycle is zero and falls back on bad numbers", () => {
    const { rerender } = render(<Loader cycle={0} />);
    const loader = screen.getByRole("status");
    expect(loader).toHaveAttribute("data-motion", "none");
    rerender(<Loader cycle={Number.NaN} size={-4} />);
    expect(loader).toHaveAttribute("data-motion", "full");
    expect(loader.querySelector("svg")).toHaveAttribute("width", "24");
  });

  it("breathes instead of moving under reduced motion", () => {
    motionPreference.reduced = true;
    render(<Loader variant="dots" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-motion", "reduced");
  });
});
