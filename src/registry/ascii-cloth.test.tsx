import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsciiCloth } from "./ascii-cloth";

type Drawn = { glyph: string; x: number; y: number };

let pending: Map<number, FrameRequestCallback>;
let now: number;
let drawn: Drawn[];
let setReduced: (value: boolean) => void;
let setVisible: (value: boolean) => void;
let disconnected: ReturnType<typeof vi.fn>;

function advance(milliseconds: number) {
  act(() => {
    const until = now + milliseconds;
    while (now < until) {
      now += 17;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(now));
    }
  });
}

beforeEach(() => {
  now = 0;
  drawn = [];
  pending = new Map();
  let nextId = 0;
  disconnected = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      isPrimary = true;
      pointerId = 1;
    },
  );
  const motionEvents = new EventTarget();
  const motion = {
    matches: false,
    addEventListener: motionEvents.addEventListener.bind(motionEvents),
    removeEventListener: motionEvents.removeEventListener.bind(motionEvents),
  };
  setReduced = (value) => {
    motion.matches = value;
    act(() => motionEvents.dispatchEvent(new Event("change")));
  };
  vi.stubGlobal("matchMedia", () => motion);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: () => void) {}
      observe() {
        this.callback();
      }
      disconnect = disconnected;
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        setVisible = (value) => act(() => callback([{ isIntersecting: value }]));
      }
      observe() {
        setVisible(true);
      }
      disconnect = disconnected;
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(384);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 384,
    width: 800,
    height: 384,
    toJSON() {},
  });
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect() {
      drawn = [];
    },
    fillText(glyph: string, x: number, y: number) {
      drawn.push({ glyph, x, y });
    },
    setTransform() {},
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture;
  delete (HTMLElement.prototype as Partial<HTMLElement>).hasPointerCapture;
  delete (HTMLElement.prototype as Partial<HTMLElement>).releasePointerCapture;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AsciiCloth", () => {
  it("keeps both corners fixed while the woven word stretches and settles", () => {
    render(<AsciiCloth word="A1" />);
    advance(100);
    const initial = [...drawn];
    const letter = initial.find((point) => point.glyph === "A")!;
    const control = screen.getByRole("button", { name: "Drag ASCII cloth" });
    fireEvent.pointerDown(control, { clientX: letter.x, clientY: letter.y });
    fireEvent.pointerMove(control, { clientX: letter.x + 90, clientY: letter.y - 45 });
    advance(300);
    const stretched = [...drawn];
    const movedLetter = stretched.find((point) => point.glyph === "A")!;
    expect(movedLetter.x).toBeGreaterThan(letter.x + 80);
    expect(movedLetter.y).toBeLessThan(letter.y - 35);
    expect(stretched[0]).toEqual(initial[0]);
    const rightCorner = initial.findIndex(
      (point, index) => index > 0 && Math.abs(point.y - initial[0].y) < 0.001,
    );
    expect(rightCorner).toBeGreaterThan(0);
    expect(stretched[rightCorner]).toEqual(initial[rightCorner]);
    fireEvent.pointerUp(control);
    advance(600);
    const settledLetter = drawn.find((point) => point.glyph === "A")!;
    expect(settledLetter.x).toBeLessThan(movedLetter.x - 10);
    expect(control).toHaveAccessibleDescription(/arrow keys/i);
  });

  it("offers keyboard dragging and stops work for reduced motion and hidden views", () => {
    const { unmount } = render(<AsciiCloth word="HI" />);
    const control = screen.getByRole("button");
    advance(100);
    fireEvent.keyDown(control, { key: "Enter" });
    fireEvent.keyDown(control, { key: "ArrowRight" });
    advance(80);
    expect(pending.size).toBe(1);
    fireEvent.keyDown(control, { key: "Escape" });
    setVisible(false);
    expect(pending.size).toBe(0);
    setVisible(true);
    setReduced(true);
    const reduced = [...drawn];
    fireEvent.keyDown(control, { key: "Enter" });
    advance(300);
    expect(drawn).toEqual(reduced);
    expect(pending.size).toBe(0);
    unmount();
    expect(disconnected).toHaveBeenCalledTimes(2);
  });
});
