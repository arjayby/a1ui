import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SpiralText } from "./spiral-text";

function mockMotionPreference(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: reduced,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

function coordinates(text: Element | null, attribute: "x" | "y") {
  return text?.getAttribute(attribute)?.split(" ").map(Number);
}

function glyphRadius(text: Element | null, index: number) {
  const x = coordinates(text, "x")?.[index];
  const y = coordinates(text, "y")?.[index];
  if (x === undefined || y === undefined) throw new Error("Spiral text has no glyph at this index");

  return Math.hypot(x - 320, y - 320);
}

function glyphAngle(text: Element | null, index: number) {
  const x = coordinates(text, "x")?.[index];
  const y = coordinates(text, "y")?.[index];
  if (x === undefined || y === undefined) throw new Error("Spiral text has no glyph at this index");

  return Math.atan2(y - 320, x - 320);
}

describe("SpiralText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMotionPreference(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reduces coil spacing without rotating, then overshoots and returns to rest", () => {
    render(<SpiralText text="MAKE SMALL THINGS WELL · " rippleDuration={1100} />);

    const graphic = screen.getByRole("img", { name: "MAKE SMALL THINGS WELL ·" });
    const text = graphic.querySelector("text");
    const restingX = text?.getAttribute("x");
    const restingY = text?.getAttribute("y");
    const restingRotation = text?.getAttribute("rotate");
    const glyphIndex = 400;
    const outerGlyphIndex = (coordinates(text, "x")?.length ?? 1) - 1;
    const restingRadius = glyphRadius(text, glyphIndex);
    const restingOuterRadius = glyphRadius(text, outerGlyphIndex);
    const restingAngle = glyphAngle(text, glyphIndex);

    fireEvent.pointerDown(graphic, { pointerId: 1, pointerType: "mouse" });
    expect(graphic).toHaveAttribute("data-interaction", "tightening");

    act(() => vi.advanceTimersByTime(640));
    expect(glyphRadius(text, glyphIndex)).toBeLessThan(restingRadius);
    expect(glyphAngle(text, glyphIndex)).toBeCloseTo(restingAngle, 3);
    expect(text).toHaveAttribute("rotate", restingRotation);

    fireEvent.pointerUp(graphic, { pointerId: 1, pointerType: "mouse" });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");

    act(() => vi.advanceTimersByTime(550));
    expect(glyphRadius(text, outerGlyphIndex)).toBeGreaterThan(restingOuterRadius);

    act(() => vi.advanceTimersByTime(1200));
    expect(graphic).toHaveAttribute("data-interaction", "resting");
    expect(text).toHaveAttribute("x", restingX);
    expect(text).toHaveAttribute("y", restingY);
  });

  it("keeps the geometry still when reduced motion is enabled", () => {
    mockMotionPreference(true);
    render(<SpiralText text="QUIET TYPE · " />);

    const graphic = screen.getByRole("img", { name: "QUIET TYPE ·" });
    const text = graphic.querySelector("text");
    const restingX = text?.getAttribute("x");
    const restingY = text?.getAttribute("y");

    fireEvent.pointerDown(graphic, { pointerId: 2, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "pressed-reduced");
    act(() => vi.advanceTimersByTime(1300));
    expect(text).toHaveAttribute("x", restingX);
    expect(text).toHaveAttribute("y", restingY);

    fireEvent.pointerUp(graphic, { pointerId: 2, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "resting");
  });
});
