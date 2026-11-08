import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsciiMorph } from "./ascii-morph";

// Motion's frame loop captures requestAnimationFrame when it loads, so route it through a
// stand-in installed before imports that each test points at its own manual queue.
const frames = vi.hoisted(() => {
  const target = {
    request: (callback: FrameRequestCallback) => setTimeout(callback, 16) as unknown as number,
  };
  globalThis.requestAnimationFrame = (callback) => target.request(callback);
  return target;
});

let pending: Map<number, FrameRequestCallback>;
let now: number;
let setReduced: (value: boolean) => void;
let setVisible: (value: boolean) => void;
let disconnect: ReturnType<typeof vi.fn>;
let motionEvents: EventTarget;
let removeMotionListener: ReturnType<typeof vi.fn>;

function frame(milliseconds = 17) {
  act(() => {
    now += milliseconds;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(now));
  });
}

function advance(milliseconds: number) {
  for (let i = 0; i < milliseconds; i += 17) frame();
}

function positions() {
  return [...document.querySelectorAll("svg text")].map((element) => [
    Number(element.getAttribute("x")),
    Number(element.getAttribute("y")),
  ]);
}

beforeEach(() => {
  pending = new Map();
  now = 0;
  let id = 0;
  disconnect = vi.fn();
  frames.request = (callback) => {
    pending.set(++id, callback);
    return id;
  };
  // Motion times frames with performance.now(), so keep it on the manual clock.
  vi.spyOn(performance, "now").mockImplementation(() => now);
  motionEvents = new EventTarget();
  removeMotionListener = vi.fn(motionEvents.removeEventListener.bind(motionEvents));
  const motion = {
    matches: false,
    addEventListener: motionEvents.addEventListener.bind(motionEvents),
    removeEventListener: removeMotionListener,
  };
  setReduced = (value) => {
    motion.matches = value;
    act(() => motionEvents.dispatchEvent(new Event("change")));
  };
  vi.stubGlobal("matchMedia", () => motion);
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        setVisible = (value) => act(() => callback([{ isIntersecting: value }]));
      }
      observe() {}
      disconnect = disconnect;
    },
  );
});

afterEach(() => {
  cleanup();
  // Let Motion's shared loop drain its last requested frame so the next test starts idle.
  for (let i = 0; i < 4 && pending.size; i++) frame();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AsciiMorph", () => {
  it("preserves position, velocity, and glyph identity through repeated interruptions", () => {
    render(<AsciiMorph />);
    const control = screen.getByRole("button");
    const nodes = [...document.querySelectorAll("svg text")];
    const glyphs = nodes.map((node) => node.textContent);
    expect(pending.size).toBe(0);
    fireEvent.click(control);
    for (let click = 0; click < 8; click++) {
      advance(85);
      const previous = positions();
      frame(1);
      const before = positions();
      fireEvent.click(control);
      expect(positions()).toEqual(before);
      frame(1);
      const after = positions();
      // Compare the velocity on either side of the click, using 1ms samples.
      const change = Math.max(
        ...after.flatMap((point, i) =>
          point.map((value, axis) =>
            Math.abs(value - before[i][axis] - (before[i][axis] - previous[i][axis])),
          ),
        ),
      );
      expect(change).toBeLessThan(0.06);
      expect(pending.size).toBe(1);
    }
    expect([...document.querySelectorAll("svg text")]).toEqual(nodes);
    expect(nodes.map((node) => node.textContent)).toEqual(glyphs);
    advance(4000);
    expect(pending.size).toBe(0);
    expect(document.querySelector('[data-slot="ascii-morph"]')).toHaveAttribute("data-state", "idle");
  });

  it("keeps travelling through unrelated renders and duration changes", () => {
    const { rerender } = render(<AsciiMorph />);
    fireEvent.click(screen.getByRole("button"));
    advance(170);
    const before = positions();
    rerender(<AsciiMorph className="max-w-lg" duration={2200} />);
    expect(positions()).toEqual(before);
    frame();
    expect(positions()).not.toEqual(before);
    expect(pending.size).toBe(1);
  });

  it("cycles in both directions, announces the shape, and respects controlled input", () => {
    const onShapeChange = vi.fn();
    const { rerender } = render(<AsciiMorph shape="flower" onShapeChange={onShapeChange} />);
    const control = screen.getByRole("button", { name: "Change ASCII shape" });
    expect(control).toHaveAccessibleDescription(/Enter or Space.*Flower/);
    const original = positions();
    fireEvent.click(control);
    expect(onShapeChange).toHaveBeenLastCalledWith("a1");
    expect(screen.getByRole("status")).toHaveTextContent("Flower");
    expect(positions()).toEqual(original);
    expect(pending.size).toBe(0);
    rerender(<AsciiMorph shape="a1" onShapeChange={onShapeChange} />);
    expect(positions()).toEqual(original);
    advance(100);
    expect(positions()).not.toEqual(original);
    fireEvent.keyDown(control, { key: "ArrowLeft" });
    expect(onShapeChange).toHaveBeenLastCalledWith("flower");
  });

  it("cross-fades in place under reduced motion, including a live preference change", async () => {
    // Motion reports a finished fade through a promise, so let microtasks run between frames.
    async function play(milliseconds: number) {
      for (let i = 0; i < milliseconds; i += 17) {
        frame();
        await act(async () => {});
      }
    }
    render(<AsciiMorph />);
    const control = screen.getByRole("button");
    const art = document.querySelector<SVGGElement>("svg g")!;
    fireEvent.click(control);
    advance(100);
    const travelling = positions();
    setReduced(true);
    // The glyphs fade out where they are instead of jumping or travelling on.
    await play(51);
    expect(positions()).toEqual(travelling);
    expect(Number(art.style.opacity)).toBeGreaterThan(0);
    expect(Number(art.style.opacity)).toBeLessThan(1);
    await play(300);
    const flower = positions();
    expect(flower).not.toEqual(travelling);
    expect(art.style.opacity).toBe("1");
    expect(pending.size).toBe(0);

    // A new shape swaps in unseen at the fade's midpoint.
    fireEvent.click(control);
    expect(positions()).toEqual(flower);
    await play(51);
    expect(positions()).toEqual(flower);
    await play(300);
    const monogram = positions();
    expect(monogram).not.toEqual(flower);
    expect(art.style.opacity).toBe("1");
    await play(200);
    expect(positions()).toEqual(monogram);
    expect(pending.size).toBe(0);

    setReduced(false);
    expect(pending.size).toBe(0);
    fireEvent.click(control);
    expect(positions()).toEqual(monogram);
    advance(200);
    expect(positions()).not.toEqual(monogram);
  });

  it("suspends offscreen and in hidden tabs, then resumes without a time jump", () => {
    render(<AsciiMorph />);
    fireEvent.click(screen.getByRole("button"));
    advance(100);
    setVisible(false);
    const before = positions();
    advance(5000);
    expect(pending.size).toBe(0);
    expect(positions()).toEqual(before);
    setVisible(true);
    frame(5000);
    expect(positions()).toEqual(before);
    frame();
    expect(positions()).not.toEqual(before);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    const stopped = positions();
    frame();
    expect(positions()).toEqual(stopped);
    expect(pending.size).toBe(0);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    frame(5000);
    expect(positions()).toEqual(stopped);
  });

  it("cleans up frames and listeners under Strict Mode and unmount", () => {
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <StrictMode>
        <AsciiMorph />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole("button"));
    advance(100);
    expect(pending.size).toBe(1);
    unmount();
    frame();
    expect(pending.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(removeMotionListener).toHaveBeenCalledTimes(2);
    expect(removeDocumentListener.mock.calls.filter(([name]) => name === "visibilitychange")).toHaveLength(2);
    // A media event after unmount must not schedule work.
    setReduced(true);
    setReduced(false);
    expect(pending.size).toBe(0);
  });

  it("renders static previews and bounds non-finite duration", () => {
    const { rerender } = render(<AsciiMorph interactive={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img")).toHaveAccessibleName("ASCII Globe");
    const globe = positions();
    rerender(<AsciiMorph interactive={false} shape="flower" duration={NaN} />);
    expect(positions()).not.toEqual(globe);
    expect(pending.size).toBe(0);
    rerender(<AsciiMorph shape="a1" duration={Infinity} />);
    advance(4000);
    expect(pending.size).toBe(0);
    expect(positions().flat().every(Number.isFinite)).toBe(true);
  });
});
