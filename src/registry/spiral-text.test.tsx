import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SpiralText } from "./spiral-text";

function mockMotionPreference(reduced: boolean) {
  const events = new EventTarget();
  const preference = {
    matches: reduced,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(preference));
  return (value: boolean) => {
    preference.matches = value;
    events.dispatchEvent(new Event("change"));
  };
}

function coils(graphic: HTMLElement) {
  return Array.from(graphic.querySelectorAll<HTMLDivElement>("[data-spiral-coil]"));
}

function scale(coil: HTMLDivElement) {
  return Number(coil.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? 1);
}

function expectResting(graphic: HTMLElement) {
  expect(graphic).toHaveAttribute("data-interaction", "resting");
  for (const coil of coils(graphic)) {
    expect(scale(coil)).toBe(1);
    expect(Number(coil.style.opacity || 1)).toBe(1);
  }
}

describe("SpiralText", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMotionPreference(false);
    vi.stubGlobal(
      "PointerEvent",
      class extends MouseEvent {
        pointerId: number;
        pointerType: string;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 1;
          this.pointerType = init.pointerType ?? "mouse";
        }
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([0.65, 1, 1.6])("keeps each wave layer circular at density %s", (density) => {
    render(<SpiralText text="CIRCULAR WAVE · " density={density} rotating={false} />);
    for (const coil of coils(screen.getByRole("img"))) {
      const text = coil.querySelector("text")!;
      const x = text.getAttribute("x")!.split(" ").map(Number);
      const y = text.getAttribute("y")!.split(" ").map(Number);
      const radii = x.map((value, index) => Math.hypot(value - 320, y[index] - 320));
      expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.02);
    }
  });

  it("gathers the coils, then releases them with an outward swell without laying out text again", () => {
    render(<SpiralText text="MAKE SMALL THINGS WELL · " rotating={false} />);
    const graphic = screen.getByRole("img");
    const [inner, outer] = [coils(graphic)[2], coils(graphic)[11]];
    const glyphsBefore = Array.from(graphic.querySelectorAll("text"), (text) => text.outerHTML);

    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(1300));
    expect(scale(inner)).toBeLessThan(1);
    const gatheredOuterScale = scale(outer);
    expect(gatheredOuterScale).toBeLessThan(1);

    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(500));
    expect(scale(inner)).toBeGreaterThan(1);
    expect(scale(outer)).toBe(gatheredOuterScale);

    act(() => vi.advanceTimersByTime(500));
    expect(scale(outer)).toBeGreaterThan(1);
    expect(scale(inner)).toBeCloseTo(1);
    act(() => vi.advanceTimersByTime(900));
    expectResting(graphic);
    expect(Array.from(graphic.querySelectorAll("text"), (text) => text.outerHTML)).toEqual(glyphsBefore);
  });

  it("returns to rest when a pointer interaction is cancelled", () => {
    render(<SpiralText text="CANCEL ME · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(640));
    expect(scale(coils(graphic)[3])).toBeLessThan(1);
    fireEvent.pointerCancel(graphic, { pointerId: 1, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    act(() => vi.advanceTimersByTime(1900));
    expectResting(graphic);
  });

  it("can be pressed during release without the previous animation resetting it", () => {
    render(<SpiralText text="TRY AGAIN · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(640));
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(300));
    const beforeRepress = coils(graphic).map(scale);
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    act(() => vi.advanceTimersByTime(16));
    coils(graphic).forEach((coil, index) => {
      expect(Math.abs(scale(coil) - beforeRepress[index])).toBeLessThan(0.002);
    });
    act(() => vi.advanceTimersByTime(1900));
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    expect(scale(coils(graphic)[3])).toBeLessThan(1);
    fireEvent.pointerUp(graphic, { pointerId: 2 });
    act(() => vi.advanceTimersByTime(1900));
    expectResting(graphic);
  });

  it("ignores unrelated pointers and repeated pointer-up events", () => {
    render(<SpiralText text="ONE AT A TIME · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(640));
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    fireEvent.pointerUp(graphic, { pointerId: 2 });
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(900));
    expectResting(graphic);
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
    expect(coils(graphics[0]).map((coil) => [scale(coil), coil.querySelector("text")?.outerHTML])).toEqual(
      coils(graphics[1]).map((coil) => [scale(coil), coil.querySelector("text")?.outerHTML]),
    );
  });

  it("honors custom durations with a 300ms minimum", () => {
    render(<SpiralText text="QUICK RELEASE · " rippleDuration={0} />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(640));
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(200));
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    act(() => vi.advanceTimersByTime(150));
    expectResting(graphic);
  });

  it("keeps still when reduced motion is enabled", () => {
    mockMotionPreference(true);
    render(<SpiralText text="QUIET TYPE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    expect(graphic).toHaveAttribute("data-interaction", "pressed-reduced");
    act(() => vi.advanceTimersByTime(1300));
    expect(coils(graphic).every((coil) => scale(coil) === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    expectResting(graphic);
  });

  it("cancels a running ripple when reduced motion is enabled", () => {
    const setReducedMotion = mockMotionPreference(false);
    render(<SpiralText text="QUIET NOW · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(640));
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(300));
    act(() => setReducedMotion(true));
    expectResting(graphic);
    expect(vi.getTimerCount()).toBe(0);
    expect(graphic.querySelector("[data-spiral-rotation]")).toHaveStyle({ animationPlayState: "paused" });
  });

  it("resets an active gesture when the layout changes", () => {
    const { rerender } = render(<SpiralText text="ORIGINAL · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(600));
    rerender(<SpiralText text="UPDATED · " density={1.4} />);
    expectResting(graphic);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("can pause rotation during a ripple without cancelling the wave", () => {
    const { rerender } = render(<SpiralText text="PAUSE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(300));
    rerender(<SpiralText text="PAUSE · " rotating={false} />);
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    expect(graphic.querySelector("[data-spiral-rotation]")).toHaveStyle({ animationPlayState: "paused" });
    act(() => vi.advanceTimersByTime(1600));
    expectResting(graphic);
  });
});
