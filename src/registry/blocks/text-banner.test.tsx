import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TextBanner } from "./text-banner";

// Motion's frame loop captures requestAnimationFrame when it loads, so route it through a
// stand-in installed before imports that each test points at its own manual queue.
const frames = vi.hoisted(() => {
  const target = {
    request: (callback: FrameRequestCallback) => setTimeout(callback, 16) as unknown as number,
  };
  globalThis.requestAnimationFrame = (callback) => target.request(callback);
  return target;
});

const UNIT = 200;
const FRAME = 17;
const items = ["a1ui", "Components"];

let pending: Map<number, FrameRequestCallback>;
let now: number;
let containerWidth: number;
let setReduced: (value: boolean) => void;
let setVisible: (value: boolean) => void;
let resize: () => void;

// Motion caches its clock and queues element writes until the microtask after each frame. Real
// frames are separate tasks, so the stand-in yields after every frame to keep that order.
async function advance(milliseconds: number) {
  await act(async () => {
    const until = now + milliseconds;
    while (now < until) {
      now += FRAME;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(now));
      await Promise.resolve();
    }
  });
}

const root = () => document.querySelector<HTMLElement>('[data-slot="text-banner"]')!;
const track = () => root().querySelector<HTMLElement>(".a1ui-text-banner-track")!;
const copies = () => track().firstElementChild!.childElementCount;

/** How far the loop is through one unit, in pixels. */
function offset() {
  const percent = track().style.transform.match(/translateX\((-?[\d.e-]+)%\)/);
  if (!percent) throw new Error(`Track has no offset: "${track().style.transform}"`);
  return ((Number(percent[1]) * copies()) / 50 + 1) * UNIT;
}

/** Signed distance from `from` to the current offset, taking the short way round the loop. */
function travelled(from: number) {
  const distance = offset() - from;
  return distance - Math.round(distance / UNIT) * UNIT;
}

/** Advances one frame at a time and returns how far the text moved in each. */
async function steps(count: number) {
  const moved: number[] = [];
  for (let index = 0; index < count; index++) {
    const from = offset();
    await advance(FRAME);
    moved.push(travelled(from));
  }
  return moved;
}

beforeEach(() => {
  now = 0;
  pending = new Map();
  containerWidth = 500;
  let nextId = 0;
  frames.request = (callback) => {
    pending.set(++nextId, callback);
    return nextId;
  };
  // Motion times frames with performance.now(), so keep it on the manual clock.
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerType: string;
      constructor(type: string, init?: MouseEventInit & { pointerType?: string }) {
        super(type, init);
        this.pointerType = init?.pointerType ?? "mouse";
      }
    },
  );

  const events = new EventTarget();
  const preference = {
    matches: false,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  setReduced = (value) => {
    preference.matches = value;
    act(() => events.dispatchEvent(new Event("change")));
  };
  vi.stubGlobal("matchMedia", () => preference);

  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: () => void) {
        resize = () => act(() => callback());
      }
      // Observers report once on observe. Rendering is already inside act there.
      observe() {
        this.callback();
      }
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      private targets: Element[] = [];
      constructor(private callback: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
        setVisible = (value) => act(() => this.report(value));
      }
      report(value: boolean) {
        this.callback(this.targets.map((target) => ({ target, isIntersecting: value })));
      }
      observe(target: Element) {
        this.targets.push(target);
        this.report(true);
      }
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => containerWidth);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: UNIT,
    bottom: 40,
    width: UNIT,
    height: 40,
    toJSON() {},
  });
});

afterEach(async () => {
  cleanup();
  // Let Motion's shared loop drain its last requested frame so the next test starts idle.
  for (let index = 0; index < 4 && pending.size; index++) await advance(FRAME);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TextBanner", () => {
  it("renders nothing without a phrase to show", () => {
    const { container } = render(<TextBanner items={["", "  "]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reads the phrases once and hides the repeated copies", async () => {
    render(<TextBanner items={items} />);
    expect(root().querySelector(".sr-only")).toHaveTextContent("a1ui · Components");
    expect(track()).toHaveAttribute("aria-hidden", "true");
    // A 500px container needs three 200px units in each half of the loop.
    expect(copies()).toBe(3);
  });

  it("travels at the given speed in the given direction", async () => {
    const { rerender } = render(<TextBanner items={items} speed={80} />);
    await advance(2000);
    expect(root()).toHaveAttribute("data-motion", "running");
    let from = offset();
    await advance(30 * FRAME);
    expect(travelled(from)).toBeCloseTo((80 * 30 * FRAME) / 1000, 1);

    rerender(<TextBanner items={items} speed={40} direction="left" />);
    await advance(2000);
    from = offset();
    await advance(30 * FRAME);
    expect(travelled(from)).toBeCloseTo((-40 * 30 * FRAME) / 1000, 1);
  });

  it("starts from rest instead of jumping to full speed", async () => {
    render(<TextBanner items={items} speed={80} />);
    const fullStep = (80 * FRAME) / 1000;
    const moved = await steps(40);
    expect(moved[1]).toBeGreaterThan(0);
    expect(moved[1]).toBeLessThan(fullStep / 2);
    expect(moved.at(-1)).toBeCloseTo(fullStep, 1);
  });

  it("coasts to a stop when paused, holds its place, and stops asking for frames", async () => {
    const { rerender } = render(<TextBanner items={items} speed={80} />);
    await advance(2000);
    const fullStep = (80 * FRAME) / 1000;

    rerender(<TextBanner items={items} speed={80} paused />);
    expect(root()).toHaveAttribute("data-motion", "paused");
    const slowing = await steps(4);
    // Still moving the same way, and never faster than it was.
    for (const step of slowing) {
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(fullStep + 0.001);
    }
    expect(slowing[3]).toBeLessThan(slowing[0]);

    await advance(2000);
    const rest = offset();
    await advance(1000);
    expect(offset()).toBe(rest);
    expect(pending.size).toBe(0);

    // Resuming continues from where the text stopped.
    rerender(<TextBanner items={items} speed={80} />);
    await advance(FRAME * 2);
    expect(Math.abs(travelled(rest))).toBeLessThan(fullStep);
    await advance(2000);
    expect(travelled(rest)).not.toBe(0);
  });

  it("reverses from the position on screen by slowing through a stop", async () => {
    const { rerender } = render(<TextBanner items={items} speed={80} />);
    await advance(2000);
    const fullStep = (80 * FRAME) / 1000;

    rerender(<TextBanner items={items} speed={80} direction="left" />);
    const moved = await steps(90);
    // The first frames keep going right: the old velocity is blended out, not cut.
    expect(moved[0]).toBeGreaterThan(fullStep / 2);
    // No frame moves further than a full-speed frame, so the text never jumps.
    expect(Math.max(...moved.map(Math.abs))).toBeLessThanOrEqual(fullStep + 0.001);
    // Speed changes gradually from one frame to the next.
    const changes = moved.slice(1).map((step, index) => Math.abs(step - moved[index]));
    expect(Math.max(...changes)).toBeLessThan(fullStep / 4);
    expect(moved.at(-1)).toBeCloseTo(-fullStep, 1);
  });

  it("treats a speed of zero as paused and falls back to the default for a bad value", async () => {
    const { rerender } = render(<TextBanner items={items} speed={0} />);
    await advance(1000);
    expect(root()).toHaveAttribute("data-motion", "paused");
    expect(offset()).toBe(0);

    rerender(<TextBanner items={items} speed={Number.NaN} />);
    await advance(2000);
    const from = offset();
    await advance(30 * FRAME);
    expect(travelled(from)).toBeCloseTo((80 * 30 * FRAME) / 1000, 1);
  });

  it("pauses under a mouse pointer but not after a touch", async () => {
    render(<TextBanner items={items} pauseOnHover />);
    await advance(2000);

    fireEvent.pointerEnter(root(), { pointerType: "touch" });
    expect(root()).toHaveAttribute("data-motion", "running");

    fireEvent.pointerEnter(root(), { pointerType: "mouse" });
    expect(root()).toHaveAttribute("data-motion", "paused");
    await advance(2000);
    const rest = offset();
    await advance(500);
    expect(offset()).toBe(rest);

    fireEvent.pointerLeave(root(), { pointerType: "mouse" });
    expect(root()).toHaveAttribute("data-motion", "running");
    await advance(2000);
    expect(travelled(rest)).not.toBe(0);
  });

  it("ignores the pointer unless pauseOnHover is set", () => {
    render(<TextBanner items={items} />);
    fireEvent.pointerEnter(root(), { pointerType: "mouse" });
    expect(root()).toHaveAttribute("data-motion", "running");
  });

  it("stays still under reduced motion and restarts when the setting is turned off", async () => {
    render(<TextBanner items={items} />);
    await advance(2000);

    setReduced(true);
    expect(root()).toHaveAttribute("data-motion", "reduced");
    const rest = offset();
    await advance(1000);
    expect(offset()).toBe(rest);
    expect(pending.size).toBe(0);

    setReduced(false);
    expect(root()).toHaveAttribute("data-motion", "running");
    await advance(2000);
    expect(travelled(rest)).not.toBe(0);
  });

  it("freezes while off screen", async () => {
    render(<TextBanner items={items} />);
    await advance(2000);

    setVisible(false);
    await advance(FRAME * 2);
    const rest = offset();
    await advance(1000);
    expect(offset()).toBe(rest);
    expect(pending.size).toBe(0);

    setVisible(true);
    await advance(500);
    expect(travelled(rest)).toBeGreaterThan(0);
  });

  it("keeps the text in place when the container needs a different number of copies", async () => {
    render(<TextBanner items={items} paused />);
    await advance(100);
    expect(copies()).toBe(3);
    const rest = offset();

    containerWidth = 1100;
    resize();
    await advance(FRAME * 2);
    expect(copies()).toBe(6);
    expect(offset()).toBeCloseTo(rest, 6);
  });
});
