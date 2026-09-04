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

describe("SpiralText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMotionPreference(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("tightens while pressed, ripples on release, and returns to rest", () => {
    render(<SpiralText text="MAKE SMALL THINGS WELL · " rippleDuration={1100} />);

    const graphic = screen.getByRole("img", { name: "MAKE SMALL THINGS WELL ·" });
    const path = graphic.querySelector("path");
    const restingPath = path?.getAttribute("d");

    fireEvent.pointerDown(graphic, { pointerId: 1, pointerType: "mouse" });
    expect(graphic).toHaveAttribute("data-interaction", "tightening");

    act(() => vi.advanceTimersByTime(640));
    expect(path?.getAttribute("d")).not.toBe(restingPath);

    fireEvent.pointerUp(graphic, { pointerId: 1, pointerType: "mouse" });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");

    act(() => vi.advanceTimersByTime(1200));
    expect(graphic).toHaveAttribute("data-interaction", "resting");
    expect(path?.getAttribute("d")).toBe(restingPath);
  });

  it("keeps the geometry still when reduced motion is enabled", () => {
    mockMotionPreference(true);
    render(<SpiralText text="QUIET TYPE · " />);

    const graphic = screen.getByRole("img", { name: "QUIET TYPE ·" });
    const path = graphic.querySelector("path");
    const restingPath = path?.getAttribute("d");

    fireEvent.pointerDown(graphic, { pointerId: 2, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "pressed-reduced");
    act(() => vi.advanceTimersByTime(1300));
    expect(path?.getAttribute("d")).toBe(restingPath);

    fireEvent.pointerUp(graphic, { pointerId: 2, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "resting");
  });
});
