import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SpiralText } from "./spiral-text";

// Motion's frame loop captures requestAnimationFrame when it loads, so route it through a
// stand-in installed before imports that each test points at its own manual queue.
const frames = vi.hoisted(() => {
  const target = {
    request: (callback: FrameRequestCallback) => setTimeout(callback, 16) as unknown as number,
  };
  globalThis.requestAnimationFrame = (callback) => target.request(callback);
  return target;
});

// Motion reads the setting once per page, so each test supplies the value its hook returns.
const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => motionPreference.reduced,
}));

let pending: Map<number, FrameRequestCallback>;
let now: number;
let setReducedMotion: (value: boolean) => void;

// Steps Motion's frame loop on a manual clock. Motion itself drives the springs, so these
// tests see the real values; the browser suite covers rendering and input timing.
async function advance(milliseconds: number, step = 17) {
  await act(async () => {
    const until = now + milliseconds;
    while (now < until) {
      now += step;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(now));
      // Motion holds one timestamp until the next microtask, as a browser frame would.
      await Promise.resolve();
    }
  });
}

function coils(graphic: HTMLElement) {
  return Array.from(graphic.querySelectorAll<HTMLDivElement>("[data-spiral-coil]"));
}

function scaleOf(coil: HTMLElement) {
  return Number(coil.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? 1);
}

function angleOf(graphic: HTMLElement) {
  const rotation = graphic.querySelector<HTMLElement>("[data-spiral-rotation]")!;
  return Number(rotation.style.transform.match(/rotate\(([^)]+)deg\)/)?.[1] ?? 0);
}

function dimOf(graphic: HTMLElement) {
  return Number(graphic.querySelector<HTMLElement>("[data-spiral-rotation]")!.style.opacity || 1);
}

function expectResting(graphic: HTMLElement) {
  expect(graphic).toHaveAttribute("data-interaction", "resting");
  for (const coil of coils(graphic)) {
    expect(scaleOf(coil)).toBe(1);
    expect(Number(coil.style.opacity || 1)).toBe(1);
  }
}

// Scale change per second over one small step of the clock.
async function velocityOf(coil: HTMLElement, step = 2) {
  const before = scaleOf(coil);
  await advance(step, step);
  return ((scaleOf(coil) - before) / step) * 1000;
}

beforeEach(() => {
  now = 0;
  pending = new Map();
  let nextId = 0;
  frames.request = (callback) => {
    pending.set(++nextId, callback);
    return nextId;
  };
  // Motion times frames with performance.now(), so keep it on the manual clock.
  vi.spyOn(performance, "now").mockImplementation(() => now);
  motionPreference.reduced = false;
  const events = new EventTarget();
  const preference = {
    matches: false,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  setReducedMotion = (value) => {
    preference.matches = value;
    // The change arrives between frames, later than the last one.
    now += 1;
    act(() => events.dispatchEvent(new Event("change")));
  };
  vi.stubGlobal("matchMedia", () => preference);
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

afterEach(async () => {
  cleanup();
  // Let Motion's shared loop drain its last requested frame so the next test starts idle.
  for (let index = 0; index < 4 && pending.size; index++) await advance(17);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SpiralText", () => {
  it.each([0.65, 1, 1.6])("keeps each wave layer circular at density %s", async (density) => {
    render(<SpiralText text="CIRCULAR WAVE · " density={density} rotating={false} />);
    for (const coil of coils(screen.getByRole("img"))) {
      const text = coil.querySelector("text")!;
      const x = text.getAttribute("x")!.split(" ").map(Number);
      const y = text.getAttribute("y")!.split(" ").map(Number);
      const radii = x.map((value, index) => Math.hypot(value - 320, y[index] - 320));
      expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.02);
    }
  });

  it("keeps a completed hold gathered until release, then ripples back to rest", async () => {
    render(<SpiralText text="HOLD · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    await advance(100);
    // Feedback starts on the press itself, not after a delay.
    expect(scaleOf(coils(graphic)[5])).toBeLessThan(0.95);
    await advance(2000);
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    for (const coil of coils(graphic)) expect(scaleOf(coil)).toBeCloseTo(0.86, 4);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    await advance(1900);
    expectResting(graphic);
  });

  it("sends the wave outward from the center, swelling each ring past rest as it passes", async () => {
    render(<SpiralText text="OUTWARD · " rotating={false} />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(600);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(300);
    expect(scaleOf(coils(graphic)[2])).toBeGreaterThan(1);
    expect(Number(coils(graphic)[2].style.opacity)).toBeLessThan(0.9);
    // The outer rings stay gathered until the wave reaches them.
    expect(scaleOf(coils(graphic)[11])).toBeCloseTo(0.86, 3);
    await advance(800);
    expect(scaleOf(coils(graphic)[2])).toBeCloseTo(1, 2);
    expect(scaleOf(coils(graphic)[11])).toBeGreaterThan(1);
  });

  it.each(["pointerCancel", "lostPointerCapture"] as const)("finishes a gesture after %s", async (event) => {
    render(<SpiralText text="CANCEL ME · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1, pointerType: "touch" });
    await advance(200);
    fireEvent[event](graphic, { pointerId: 1, pointerType: "touch" });
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    await advance(1900);
    expectResting(graphic);
  });

  it("keeps a new hold when it interrupts a ripple", async () => {
    render(<SpiralText text="TRY AGAIN · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(500);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(300);
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    // The interrupted ripple would have ended by now. It must not end the hold with it.
    await advance(2500);
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    for (const coil of coils(graphic)) {
      expect(scaleOf(coil)).toBeCloseTo(0.86, 4);
      expect(Number(coil.style.opacity || 1)).toBeCloseTo(1, 4);
    }
    fireEvent.pointerUp(graphic, { pointerId: 2 });
    await advance(1900);
    expectResting(graphic);
  });

  it("catches a rippling ring at the position and velocity it has", async () => {
    render(<SpiralText text="CATCH · " rotating={false} />);
    const graphic = screen.getByRole("img");
    const ring = coils(graphic)[2];
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(500);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(238);
    const before = await velocityOf(ring);
    const atPress = scaleOf(ring);
    expect(atPress).toBeGreaterThan(1);
    expect(Math.abs(before)).toBeGreaterThan(0.1);
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    const after = await velocityOf(ring);
    expect(Math.abs(scaleOf(ring) - atPress)).toBeLessThan(0.005);
    expect(Math.abs(after - before)).toBeLessThan(0.35);
  });

  it("carries a short hold's inward motion into the release", async () => {
    render(<SpiralText text="MOMENTUM · " rotating={false} />);
    const graphic = screen.getByRole("img");
    const ring = coils(graphic)[11];
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(98, 2);
    const before = await velocityOf(ring);
    expect(before).toBeLessThan(-0.5);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    const after = await velocityOf(ring);
    expect(Math.abs(after - before)).toBeLessThan(0.35);
  });

  it("ignores secondary buttons, unrelated pointers, and repeated release events", async () => {
    render(<SpiralText text="ONE AT A TIME · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1, button: 2 });
    expect(graphic).toHaveAttribute("data-interaction", "resting");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(600);
    fireEvent.pointerDown(graphic, { pointerId: 2 });
    fireEvent.pointerUp(graphic, { pointerId: 2 });
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(900);
    const midRipple = coils(graphic).map(scaleOf);
    // A second release must not restart the ripple that is already running.
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    expect(coils(graphic).map(scaleOf)).toEqual(midRipple);
    await advance(1000);
    expectResting(graphic);
  });

  it.each(["tightening", "releasing"])("stops its frame loop when unmounted during %s", async (phase) => {
    const { unmount } = render(<SpiralText text="GOODBYE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    if (phase === "releasing") fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(100);
    expect(pending.size).toBeGreaterThan(0);
    unmount();
    await advance(100);
    expect(pending.size).toBe(0);
  });

  it.each([
    { prop: "density", input: -1, bound: 0.65 },
    { prop: "density", input: 3, bound: 1.6 },
    { prop: "tightenStrength", input: -1, bound: 0.08 },
    { prop: "tightenStrength", input: 3, bound: 0.7 },
  ])("clamps $prop=$input to $bound", async ({ prop, input, bound }) => {
    render(
      <>
        <SpiralText text="BOUNDS · " {...{ [prop]: input }} />
        <SpiralText text="BOUNDS · " {...{ [prop]: bound }} />
      </>,
    );
    const graphics = screen.getAllByRole("img");
    graphics.forEach((graphic) => fireEvent.pointerDown(graphic, { pointerId: 1 }));
    await advance(600);
    expect(scaleOf(coils(graphics[0])[0])).toBeLessThan(1);
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
  ])("uses rippleDuration=%s as %sms", async (input, expected) => {
    render(<SpiralText text="QUICK RELEASE · " rippleDuration={input} />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(400);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(expected - 60);
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    await advance(120);
    expectResting(graphic);
  });

  it("retargets a hold from where the rings are when tightenStrength changes", async () => {
    const { rerender } = render(<SpiralText text="TIGHTER · " tightenStrength={0.35} />);
    const graphic = screen.getByRole("img");
    const ring = coils(graphic)[5];
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(600);
    const held = scaleOf(ring);
    rerender(<SpiralText text="TIGHTER · " tightenStrength={0.7} />);
    expect(scaleOf(ring)).toBe(held);
    await advance(34);
    expect(scaleOf(ring)).toBeLessThan(held);
    expect(scaleOf(ring)).toBeGreaterThan(0.8);
    await advance(600);
    expect(scaleOf(ring)).toBeCloseTo(0.72, 4);
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
  });

  it("keeps a gesture going when the text or density changes", async () => {
    const { rerender } = render(<SpiralText text="ORIGINAL · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(100);
    const midHold = coils(graphic).map(scaleOf);
    rerender(<SpiralText text="UPDATED · " />);
    expect(graphic).toHaveAccessibleName("UPDATED ·");
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    expect(coils(graphic).map(scaleOf)).toEqual(midHold);
    await advance(600);
    const count = coils(graphic).length;
    rerender(<SpiralText text="UPDATED · " density={1.4} />);
    await advance(17);
    expect(coils(graphic).length).toBeGreaterThan(count);
    expect(graphic).toHaveAttribute("data-interaction", "tightening");
    for (const coil of coils(graphic)) expect(scaleOf(coil)).toBeCloseTo(0.86, 4);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(1900);
    expectResting(graphic);
  });

  it("turns at rotationSpeed rotations per minute", async () => {
    render(<SpiralText text="TURN · " rotationSpeed={2} />);
    const graphic = screen.getByRole("img");
    await advance(1000);
    const start = angleOf(graphic);
    await advance(1000);
    // Two rotations per minute is twelve degrees per second.
    expect(angleOf(graphic) - start).toBeCloseTo(12, 0);
  });

  it("eases the spin to a stop and back, keeping the angle it reached", async () => {
    const { rerender } = render(<SpiralText text="PAUSE · " rotationSpeed={10} />);
    const graphic = screen.getByRole("img");
    await advance(1000);
    const cruising = angleOf(graphic);
    await advance(17);
    const perFrame = angleOf(graphic) - cruising;
    expect(perFrame).toBeCloseTo(1.02, 1);

    rerender(<SpiralText text="PAUSE · " rotationSpeed={10} rotating={false} />);
    const atPause = angleOf(graphic);
    await advance(17);
    // The first frame after pausing still turns at nearly full speed: no hard stop, no jump.
    expect(angleOf(graphic) - atPause).toBeGreaterThan(perFrame * 0.8);
    expect(angleOf(graphic) - atPause).toBeLessThan(perFrame);
    await advance(1500);
    const stopped = angleOf(graphic);
    expect(stopped).toBeGreaterThan(atPause);
    await advance(500);
    expect(angleOf(graphic)).toBe(stopped);
    // Once stopped, the block asks Motion for no more frames.
    expect(pending.size).toBe(0);

    rerender(<SpiralText text="PAUSE · " rotationSpeed={10} rotating />);
    await advance(17);
    const resumed = angleOf(graphic) - stopped;
    expect(resumed).toBeGreaterThanOrEqual(0);
    expect(resumed).toBeLessThan(perFrame * 0.2);
    await advance(1500);
    const again = angleOf(graphic);
    await advance(17);
    expect(angleOf(graphic) - again).toBeCloseTo(perFrame, 1);
  });

  it("blends into a new rotationSpeed without resetting the angle", async () => {
    const { rerender } = render(<SpiralText text="FASTER · " rotationSpeed={5} />);
    const graphic = screen.getByRole("img");
    await advance(1000);
    const before = angleOf(graphic);
    rerender(<SpiralText text="FASTER · " rotationSpeed={10} />);
    expect(angleOf(graphic)).toBe(before);
    await advance(17);
    const first = angleOf(graphic) - before;
    expect(first).toBeGreaterThan(0.4);
    expect(first).toBeLessThan(0.7);
    await advance(1500);
    const cruising = angleOf(graphic);
    await advance(17);
    expect(angleOf(graphic) - cruising).toBeCloseTo(1.02, 1);
  });

  it("holds the spin while pressed and resumes it on release", async () => {
    render(<SpiralText text="GRAB · " rotationSpeed={10} />);
    const graphic = screen.getByRole("img");
    await advance(1000);
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(1500);
    const held = angleOf(graphic);
    await advance(200);
    expect(angleOf(graphic)).toBe(held);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(500);
    expect(angleOf(graphic)).toBeGreaterThan(held);
  });

  it("can pause rotation during a ripple without cancelling the wave", async () => {
    const { rerender } = render(<SpiralText text="PAUSE · " />);
    const graphic = screen.getByRole("img");
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(300);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(100);
    rerender(<SpiralText text="PAUSE · " rotating={false} />);
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    await advance(1400);
    const stopped = angleOf(graphic);
    expect(graphic).toHaveAttribute("data-interaction", "releasing");
    await advance(500);
    expect(angleOf(graphic)).toBe(stopped);
    expectResting(graphic);
  });

  it("answers a press with a fade instead of movement when reduced motion is enabled", async () => {
    motionPreference.reduced = true;
    render(<SpiralText text="QUIET TYPE · " />);
    const graphic = screen.getByRole("img");
    await advance(500);
    expect(angleOf(graphic)).toBe(0);
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    expect(graphic).toHaveAttribute("data-interaction", "pressed-reduced");
    await advance(34);
    // A short cross-fade, starting on the press: partway there after two frames.
    expect(dimOf(graphic)).toBeLessThan(1);
    expect(dimOf(graphic)).toBeGreaterThan(0.7);
    await advance(300);
    expect(dimOf(graphic)).toBeCloseTo(0.7, 5);
    for (const coil of coils(graphic)) expect(scaleOf(coil)).toBe(1);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(300);
    expect(dimOf(graphic)).toBe(1);
    expect(angleOf(graphic)).toBe(0);
    expectResting(graphic);
  });

  it("stops a running ripple and the spin when reduced motion is turned on", async () => {
    render(<SpiralText text="QUIET NOW · " rotationSpeed={10} />);
    const graphic = screen.getByRole("img");
    expect(coils(graphic)[0]).toHaveStyle({ willChange: "transform, opacity" });
    fireEvent.pointerDown(graphic, { pointerId: 1 });
    await advance(300);
    fireEvent.pointerUp(graphic, { pointerId: 1 });
    await advance(300);
    const angle = angleOf(graphic);
    expect(angle).toBeGreaterThan(0);
    setReducedMotion(true);
    await advance(17);
    expectResting(graphic);
    expect(coils(graphic)[0]).toHaveStyle({ willChange: "auto" });
    await advance(500);
    // The figure stays at the angle it had reached rather than snapping back to zero.
    expect(angleOf(graphic)).toBe(angle);
    expect(pending.size).toBe(0);

    setReducedMotion(false);
    await advance(500);
    expect(angleOf(graphic)).toBeGreaterThan(angle);
  });
});
