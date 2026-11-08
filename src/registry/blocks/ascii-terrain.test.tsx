import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsciiTerrain } from "./ascii-terrain";

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
let painted: [string, number, number][];
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
  painted = [];
  pending = new Map();
  let nextId = 0;
  disconnected = vi.fn();
  frames.request = (callback) => {
    pending.set(++nextId, callback);
    return nextId;
  };
  // Motion times frames with performance.now(), so keep it on the manual clock.
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      isPrimary = true;
      pointerType: string;
      constructor(type: string, init?: MouseEventInit & { pointerType?: string }) {
        super(type, init);
        this.pointerType = init?.pointerType ?? "mouse";
      }
    },
  );
  const events = new EventTarget();
  const motion = {
    matches: false,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  setReduced = (value) => {
    motion.matches = value;
    act(() => events.dispatchEvent(new Event("change")));
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
  // Record actual projected glyph positions. Browser tests cover the canvas pixels.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    clearRect() {
      painted = [];
    },
    fillText(glyph: string, x: number, y: number) {
      painted.push([glyph, x, y]);
    },
    setTransform() {},
  } as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  cleanup();
  // Let Motion's shared loop drain its last requested frame so the next test starts idle.
  for (let index = 0; index < 4 && pending.size; index++) advance(17);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AsciiTerrain", () => {
  it("does not drop an existing wave abruptly during repeated clicks", () => {
    const { rerender } = render(<AsciiTerrain speed={0} />);
    for (let index = 0; index < 6; index++) {
      fireEvent.click(screen.getByRole("button"));
      advance(68);
    }
    const before = [...painted];
    fireEvent.click(screen.getByRole("button"));
    // Pausing redraws at the same animation time, isolating the new click.
    rerender(<AsciiTerrain speed={0} paused />);
    expect(Math.max(...painted.map((point, index) => Math.abs(point[2] - before[index][2])))).toBeLessThan(
      0.1,
    );
  });

  it("keeps the same hover target when the pointer stays over a raised hill", () => {
    render(<AsciiTerrain speed={0} />);
    const control = screen.getByRole("button");
    fireEvent.pointerMove(control, { clientX: 400, clientY: 230 });
    advance(2000);
    const before = [...painted];
    fireEvent.pointerMove(control, { clientX: 400, clientY: 230 });
    advance(600);
    expect(Math.max(...painted.map((point, index) => Math.abs(point[2] - before[index][2])))).toBeLessThan(
      0.1,
    );
  });

  it("eases across the terrain when an existing hover hill changes position", () => {
    render(<AsciiTerrain speed={0} />);
    const control = screen.getByRole("button", { name: "Interact with terrain" });
    fireEvent.pointerMove(control, { clientX: 250, clientY: 220 });
    advance(1000);
    const before = [...painted];
    fireEvent.pointerMove(control, { clientX: 580, clientY: 170 });
    advance(34);
    const jump = Math.max(...painted.map((point, index) => Math.abs(point[2] - before[index][2])));
    // A hill that teleported would move glyphs by its full height, about 62px here.
    expect(jump).toBeLessThan(20);
    advance(500);
    expect(painted).not.toEqual(before);
  });

  it("introduces a click ripple without an immediate height jump", () => {
    render(<AsciiTerrain speed={0} />);
    advance(100);
    const before = [...painted];
    fireEvent.click(screen.getByRole("button"));
    advance(34);
    const jump = Math.max(...painted.map((point, index) => Math.abs(point[2] - before[index][2])));
    expect(jump).toBeLessThan(4);
    advance(300);
    expect(painted).not.toEqual(before);
  });

  it("ripples on mouse press but waits for a tap on touch", () => {
    render(<AsciiTerrain speed={0} />);
    const control = screen.getByRole("button");
    advance(100);
    const flat = [...painted];
    // Starting to scroll on touch must not disturb the terrain.
    fireEvent.pointerDown(control, { pointerType: "touch", button: 0, clientX: 400, clientY: 230 });
    advance(200);
    expect(painted).toEqual(flat);
    fireEvent.click(control, { detail: 1, clientX: 400, clientY: 230 });
    advance(200);
    expect(painted).not.toEqual(flat);
    advance(5000);
    const settled = [...painted];
    fireEvent.pointerDown(control, { pointerType: "mouse", button: 0, clientX: 300, clientY: 200 });
    advance(200);
    expect(painted).not.toEqual(settled);
  });

  it("highlights in place under reduced motion without scheduling frames", () => {
    render(<AsciiTerrain speed={0} />);
    const control = screen.getByRole("button");
    advance(100);
    setReduced(true);
    const still = [...painted];
    fireEvent.pointerMove(control, { clientX: 400, clientY: 230 });
    expect(painted.map(([, x, y]) => [x, y])).toEqual(still.map(([, x, y]) => [x, y]));
    expect(painted.map(([glyph]) => glyph)).not.toEqual(still.map(([glyph]) => glyph));
    fireEvent.keyDown(control, { key: "Escape" });
    expect(painted).toEqual(still);
    expect(pending.size).toBeLessThanOrEqual(1);
    advance(17);
    expect(pending.size).toBe(0);
  });

  it("updates interaction motion on every display frame", () => {
    render(<AsciiTerrain speed={0} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowRight" });
    advance(100);
    let updates = 0;
    for (let index = 0; index < 10; index++) {
      const before = painted;
      advance(17);
      if (painted !== before) updates++;
    }
    expect(updates).toBe(10);
  });

  it("sculpts with the keyboard and sends a ripple while drift is stopped", () => {
    render(<AsciiTerrain speed={0} />);
    advance(100);
    const original = [...painted];
    const control = screen.getByRole("button", { name: "Interact with terrain" });
    fireEvent.keyDown(control, { key: "ArrowRight" });
    advance(300);
    expect(painted).not.toEqual(original);
    fireEvent.keyDown(control, { key: "Escape" });
    advance(2500);
    const settled = [...painted];
    fireEvent.click(control);
    advance(200);
    expect(painted).not.toEqual(settled);
    expect(control).toHaveAccessibleDescription(/Arrow|arrow/);
  });

  it("freezes in place, ignores input while paused, and resumes", () => {
    const { rerender } = render(<AsciiTerrain />);
    advance(250);
    rerender(<AsciiTerrain paused />);
    const stopped = [...painted];
    fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowLeft" });
    fireEvent.click(screen.getByRole("button"));
    advance(500);
    expect(painted).toEqual(stopped);
    expect(pending.size).toBe(0);
    rerender(<AsciiTerrain />);
    expect(painted).toEqual(stopped);
    advance(200);
    expect(painted).not.toEqual(stopped);
  });

  it("stops scheduling offscreen, on reduced motion, and after unmount", () => {
    const { unmount } = render(<AsciiTerrain />);
    advance(100);
    setVisible(false);
    const stopped = [...painted];
    advance(500);
    expect(pending.size).toBe(0);
    expect(painted).toEqual(stopped);
    setVisible(true);
    advance(100);
    expect(painted).not.toEqual(stopped);
    setReduced(true);
    const reduced = [...painted];
    fireEvent.click(screen.getByRole("button"));
    advance(300);
    expect(painted).toEqual(reduced);
    expect(pending.size).toBe(0);
    setReduced(false);
    expect(pending.size).toBe(1);
    unmount();
    advance(17);
    expect(pending.size).toBe(0);
    expect(disconnected).toHaveBeenCalledTimes(2);
  });

  it("keeps inert previews static and bounds invalid configuration", () => {
    render(
      <div inert>
        <AsciiTerrain
          cellSize={-100}
          amplitude={NaN}
          speed={Infinity}
          seed={NaN}
          characters={"\n\t"}
          interactive={false}
        />
      </div>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.length).toBeLessThanOrEqual(120 * 64);
    expect(
      painted.every(
        ([glyph, x, y]) => ".:-=+*#%@".includes(glyph) && Number.isFinite(x) && Number.isFinite(y),
      ),
    ).toBe(true);
    expect(pending.size).toBe(0);
  });
});
