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

  it("returns to its original geometry when a pointer interaction is cancelled", () => {
    render(<SpiralText text="CANCEL ME · " />);
    const graphic = screen.getByRole("img");
    const text = graphic.querySelector("text");
    const restingX = text?.getAttribute("x");
    const restingY = text?.getAttribute("y");

    fireEvent.pointerDown(graphic, { pointerId: 1, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(640));
    expect(text?.getAttribute("x")).not.toBe(restingX);
    fireEvent.pointerCancel(graphic, { pointerId: 1, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");

    act(() => vi.advanceTimersByTime(1200));
    expect(graphic).toHaveAttribute("data-interaction", "resting");
    expect(text).toHaveAttribute("x", restingX);
    expect(text).toHaveAttribute("y", restingY);
  });

  it("can be pressed again during release without an old animation resetting it", () => {
    render(<SpiralText text="TRY AGAIN · " />);
    const graphic = screen.getByRole("img");
    const text = graphic.querySelector("text");
    const restingX = text?.getAttribute("x");
    const restingY = text?.getAttribute("y");

    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(640));
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    act(() => vi.advanceTimersByTime(1300));
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    expect(text?.getAttribute("x")).not.toBe(restingX);

    fireEvent.pointerUp(graphic, { pointerId: 2 });
    act(() => vi.advanceTimersByTime(1200));
    expect(graphic).toHaveAttribute("data-interaction", "resting");
    expect(text).toHaveAttribute("x", restingX);
    expect(text).toHaveAttribute("y", restingY);
  });

  it.each(["tightening", "releasing"])("stops drawing when unmounted during %s", (phase) => {
    const { unmount } = render(<SpiralText text="GOODBYE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(320));
    if (phase === "releasing") fireEvent.pointerUp(graphic, { pointerId: 1 });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { prop: "density", input: -1, bound: 0.65 },
    { prop: "density", input: 3, bound: 1.6 },
    { prop: "tightenStrength", input: -1, bound: 0.08 },
    { prop: "tightenStrength", input: 3, bound: 0.7 },
  ])("clamps $prop=$input to $bound", ({ prop, input, bound }) => {
    render(
      <>
        <SpiralText text="BOUNDS · " {...{ [prop]: input }} />
        <SpiralText text="BOUNDS · " {...{ [prop]: bound }} />
      </>,
    );
    const graphics = screen.getAllByRole("img");
    graphics.forEach((graphic) => fireEvent.pointerDown(graphic, { pointerId: 1 }));
    act(() => vi.advanceTimersByTime(1300));
    const texts = graphics.map((graphic) => graphic.querySelector("text"));
    expect(texts[0]).toHaveAttribute("x", texts[1]?.getAttribute("x"));
    expect(texts[0]).toHaveAttribute("y", texts[1]?.getAttribute("y"));
  });

  it("uses a minimum release duration for very short rippleDuration values", () => {
    render(<SpiralText text="QUICK RELEASE · " rippleDuration={0} />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(640));
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(200));
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    act(() => vi.advanceTimersByTime(150));
    expect(graphic).toHaveAttribute("data-interaction", "resting");
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
