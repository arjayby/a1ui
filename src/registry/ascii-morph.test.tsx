import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsciiMorph } from "./ascii-morph";

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
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => pending.delete(key));
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

  it("switches instantly under reduced motion, including a live preference change", () => {
    render(<AsciiMorph />);
    fireEvent.click(screen.getByRole("button"));
    advance(100);
    setReduced(true);
    const flower = positions();
    expect(pending.size).toBe(0);
    fireEvent.click(screen.getByRole("button"));
    const monogram = positions();
    expect(monogram).not.toEqual(flower);
    advance(200);
    expect(positions()).toEqual(monogram);
    expect(pending.size).toBe(0);
    setReduced(false);
    expect(pending.size).toBe(0);
    fireEvent.click(screen.getByRole("button"));
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
