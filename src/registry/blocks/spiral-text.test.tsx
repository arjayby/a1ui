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

function expectResting(graphic: HTMLElement) {
  expect(graphic).toHaveAttribute("data-interaction", "resting");
  for (const coil of coils(graphic)) {
    expect(Number(coil.style.transform.match(/scale\(([^)]+)\)/)?.[1])).toBe(1);
    expect(coil).toHaveStyle({ opacity: "1" });
  }
}

type MockAnimation = {
  onfinish: (() => void) | null;
  cancel: ReturnType<typeof vi.fn>;
  options: KeyframeAnimationOptions;
};
let animations: MockAnimation[];

// jsdom has no animation engine. Only mock its lifecycle here; real interpolation,
// responsiveness, and interruption continuity are checked in the browser suite.
function finishCurrentAnimation() {
  act(() => animations.at(-1)?.onfinish?.());
}

describe("SpiralText", () => {
  beforeEach(() => {
    animations = [];
    mockMotionPreference(false);
    vi.stubGlobal(
      "DOMMatrixReadOnly",
      class {
        a: number;
        b = 0;
        constructor(transform?: string) {
          this.a = Number(transform?.match(/scale\(([^)]+)\)/)?.[1] ?? 1);
        }
      },
    );
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
    Object.defineProperty(document, "timeline", { configurable: true, value: { currentTime: 0 } });
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn((_frames: Keyframe[], options: KeyframeAnimationOptions) => {
        const animation: MockAnimation = { onfinish: null, cancel: vi.fn(), options };
        animations.push(animation);
        return animation;
      }),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "animate");
    Reflect.deleteProperty(document, "timeline");
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

  it("keeps a completed hold gathered until release, then cleans up the animations", () => {
    render(<SpiralText text="HOLD · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    finishCurrentAnimation();
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    expect(coils(graphic)[0]).toHaveStyle({ transform: "scale(0.86000)" });
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    finishCurrentAnimation();
    expectResting(graphic);
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
  });

  it.each(["pointerCancel", "lostPointerCapture"] as const)("finishes a gesture after %s", (event) => {
    render(<SpiralText text="CANCEL ME · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1, pointerType: "touch" });
    fireEvent[event](graphic, { pointerId: 1, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    finishCurrentAnimation();
    expectResting(graphic);
  });

  it("ignores completion from an interrupted ripple", () => {
    render(<SpiralText text="TRY AGAIN · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    const oldAnimations = [...animations];
    const staleFinish = animations.at(-1)!.onfinish!;
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    expect(oldAnimations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    act(staleFinish);
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    finishCurrentAnimation();
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    fireEvent.pointerUp(graphic, { pointerId: 2 });
    finishCurrentAnimation();
    expectResting(graphic);
  });

  it("ignores secondary buttons, unrelated pointers, and repeated release events", () => {
    render(<SpiralText text="ONE AT A TIME · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1, button: 2 });
    expect(animations).toHaveLength(0);
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    const count = animations.length;
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    fireEvent.pointerUp(graphic, { pointerId: 2 });
    expect(animations).toHaveLength(count);
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    expect(animations).toHaveLength(count * 2);
    finishCurrentAnimation();
    expectResting(graphic);
  });

  it.each(["tightening", "releasing"])("cancels animations when unmounted during %s", (phase) => {
    const { unmount } = render(<SpiralText text="GOODBYE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    if (phase === "releasing") fireEvent.pointerUp(graphic, { pointerId: 1 });
    unmount();
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    expect(animations.every((animation) => animation.onfinish === null)).toBe(true);
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
    expect(
      coils(graphics[0]).map((coil) => [coil.style.transform, coil.querySelector("text")?.outerHTML]),
    ).toEqual(
      coils(graphics[1]).map((coil) => [coil.style.transform, coil.querySelector("text")?.outerHTML]),
    );
  });

  it.each([
    [0, 300],
    [900, 900],
    [Infinity, 1800],
  ])("uses rippleDuration=%s as %sms", (input, expected) => {
    render(<SpiralText text="QUICK RELEASE · " rippleDuration={input} />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    expect(animations.at(-1)?.options.duration).toBe(expected);
  });

  it("keeps still when reduced motion is enabled", () => {
    mockMotionPreference(true);
    render(<SpiralText text="QUIET TYPE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    expect(graphic).toHaveAttribute("data-interaction", "pressed-reduced");
    expect(animations).toHaveLength(0);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    expectResting(graphic);
  });

  it("cancels a running ripple when reduced motion is enabled", () => {
    const setReducedMotion = mockMotionPreference(false);
    render(<SpiralText text="QUIET NOW · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    act(() => setReducedMotion(true));
    expectResting(graphic);
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    expect(graphic.querySelector("[data-spiral-rotation]")).toHaveStyle({ animationPlayState: "paused" });
    expect(coils(graphic)[0]).toHaveStyle({ willChange: "auto" });
  });

  it("resets an active gesture when the layout changes", () => {
    const { rerender } = render(<SpiralText text="ORIGINAL · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    rerender(<SpiralText text="UPDATED · " density={1.4} />);
    expectResting(graphic);
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
  });

  it("can pause rotation during a ripple without cancelling the wave", () => {
    const { rerender } = render(<SpiralText text="PAUSE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    rerender(<SpiralText text="PAUSE · " rotating={false} />);
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    expect(graphic.querySelector("[data-spiral-rotation]")).toHaveStyle({ animationPlayState: "paused" });
    finishCurrentAnimation();
    expectResting(graphic);
  });
});
