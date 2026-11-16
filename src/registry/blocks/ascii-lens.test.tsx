import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsciiLens } from "./ascii-lens";

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
let samplers: HTMLImageElement[];
let denied = false;
let sampleDrawImage: ReturnType<typeof vi.fn>;
let setReduced: (value: boolean) => void;
let setVisible: (value: boolean) => void;
let main: {
  globalAlpha: number;
  fillText: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
};
// How opaque the photograph was each time it was drawn into the lens.
let reveals: number[];

function advance(milliseconds = 17) {
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

/** The centre and radius of the lens as last drawn. */
function lens() {
  const [x, y, radius] = main.arc.mock.calls.at(-1) as number[];
  return { x, y, radius };
}

function ready(props: Partial<Parameters<typeof AsciiLens>[0]> = {}) {
  const view = render(<AsciiLens src="/portrait.webp" alt="Studio portrait" {...props} />);
  act(() => fireEvent.load(samplers[0]));
  return { ...view, control: screen.getByRole("button", { name: /Explore Studio portrait/ }) };
}

beforeEach(() => {
  pending = new Map();
  now = 0;
  samplers = [];
  denied = false;
  reveals = [];
  sampleDrawImage = vi.fn();
  vi.stubGlobal("Image", function ImageMock() {
    const sampler = document.createElement("img");
    samplers.push(sampler);
    return sampler;
  });
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
      isPrimary = true;
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
      disconnect() {}
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
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(450);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 600,
    bottom: 450,
    width: 600,
    height: 450,
    toJSON() {},
  });
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(false);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(640);
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(480);
  main = Object.assign(
    {
      globalAlpha: 1,
      fillText: vi.fn(),
      arc: vi.fn(),
      drawImage: vi.fn(() => reveals.push(main.globalAlpha)),
    },
    { clearRect() {}, setTransform() {}, save() {}, restore() {}, beginPath() {}, clip() {} },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    if (this.parentElement) return main as unknown as CanvasRenderingContext2D;
    return {
      drawImage: sampleDrawImage,
      getImageData: () => {
        if (denied) throw new DOMException("Tainted", "SecurityError");
        return { data: new Uint8ClampedArray(this.width * this.height * 4).fill(100) };
      },
    } as unknown as CanvasRenderingContext2D;
  });
});

afterEach(() => {
  cleanup();
  // Let Motion's shared loop drain its last requested frame so the next test starts idle.
  for (let index = 0; index < 4 && pending.size; index++) advance();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AsciiLens", () => {
  it("samples the image, reveals the source under pointer and keyboard control, and cleans up", () => {
    const { container, unmount } = render(<AsciiLens src="/portrait.webp" alt="Studio portrait" />);
    const root = container.querySelector('[data-slot="ascii-lens"]')!;
    expect(root).toHaveAttribute("data-state", "image");
    expect(samplers[0].crossOrigin).toBe("anonymous");
    expect(samplers[0].src).toContain("/portrait.webp");
    act(() => fireEvent.load(samplers[0]));
    expect(root).toHaveAttribute("data-state", "ready");
    expect(sampleDrawImage).toHaveBeenCalledWith(
      samplers[0],
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    );
    expect(main.fillText).toHaveBeenCalled();
    // A still lens asks for no frames.
    expect(pending.size).toBe(0);
    const control = screen.getByRole("button", { name: /Explore Studio portrait/ });
    fireEvent.pointerMove(control, { clientX: 240, clientY: 170 });
    advance(1000);
    expect(main.arc).toHaveBeenCalled();
    expect(main.drawImage).toHaveBeenCalled();
    expect(main.drawImage.mock.calls[0][0]).toBe(samplers[0]);
    const previousArcs = main.arc.mock.calls.length;
    fireEvent.keyDown(control, { key: "ArrowRight" });
    advance();
    expect(main.arc.mock.calls.length).toBeGreaterThan(previousArcs);
    fireEvent.keyDown(control, { key: "Escape" });
    advance(1000);
    expect(pending.size).toBe(0);
    unmount();
    expect(pending.size).toBe(0);
  });

  it("opens under the pointer on a spring, tracks it 1:1, and stops the loop at rest", () => {
    const { control } = ready();
    fireEvent.pointerMove(control, { clientX: 240, clientY: 170 });
    advance();
    // The first frame is already under the pointer and already opening.
    expect(lens()).toMatchObject({ x: 240, y: 170 });
    expect(lens().radius).toBeGreaterThan(0);
    expect(lens().radius).toBeLessThan(92);
    const radii = [lens().radius];
    while (pending.size) {
      advance();
      radii.push(lens().radius);
    }
    // Critically damped: the radius only grows, and lands exactly on the full size.
    expect(radii.every((radius, index) => index === 0 || radius >= radii[index - 1])).toBe(true);
    expect(radii.at(-1)).toBe(92);
    expect(now).toBeLessThan(800);

    // An open lens moves with the pointer in a single frame, then goes quiet again.
    const drawn = main.arc.mock.calls.length;
    fireEvent.pointerMove(control, { clientX: 300, clientY: 200 });
    advance();
    expect(lens()).toEqual({ x: 300, y: 200, radius: 92 });
    expect(main.arc.mock.calls.length).toBe(drawn + 1);
    expect(pending.size).toBe(0);
  });

  it("retargets keyboard steps mid-flight from the drawn position, keeping velocity", () => {
    const { control } = ready();
    fireEvent.keyDown(control, { key: "Home" });
    advance(1000);
    expect(lens()).toEqual({ x: 300, y: 225, radius: 92 });
    fireEvent.keyDown(control, { key: "ArrowRight" });
    advance(85);
    const before = lens().x;
    expect(before).toBeGreaterThan(300);
    expect(before).toBeLessThan(330);
    // Reversing does not restart from the old target or stop dead: the lens coasts on, then turns.
    fireEvent.keyDown(control, { key: "ArrowLeft" });
    fireEvent.keyDown(control, { key: "ArrowDown" });
    advance();
    expect(lens().x).toBeGreaterThan(before);
    expect(lens().x - before).toBeLessThan(4);
    expect(lens().y).toBeGreaterThan(225);
    advance(1000);
    expect(lens()).toEqual({ x: 300, y: 255, radius: 92 });
    expect(pending.size).toBe(0);
  });

  it("closes on a spring when the pointer leaves and glides to a pointer that returns mid-close", () => {
    const { control } = ready();
    fireEvent.pointerMove(control, { clientX: 100, clientY: 100 });
    advance(1000);
    fireEvent.pointerLeave(control);
    advance(51);
    const closing = lens().radius;
    expect(closing).toBeGreaterThan(0);
    expect(closing).toBeLessThan(92);
    // The pointer comes back somewhere else: the lens reopens from its current size and travels.
    fireEvent.pointerMove(control, { clientX: 400, clientY: 300 });
    advance();
    expect(lens().x).toBeGreaterThan(100);
    expect(lens().x).toBeLessThan(200);
    expect(Math.abs(lens().radius - closing)).toBeLessThan(12);
    // Further moves carry the lens while it is still catching up.
    fireEvent.pointerMove(control, { clientX: 420, clientY: 300 });
    advance();
    expect(lens().x).toBeLessThan(420);
    advance(1000);
    expect(lens()).toEqual({ x: 420, y: 300, radius: 92 });
    fireEvent.pointerLeave(control);
    advance(1000);
    expect(pending.size).toBe(0);
    // A closed lens draws no photograph.
    const drawn = main.arc.mock.calls.length;
    setVisible(true);
    expect(main.arc.mock.calls.length).toBe(drawn);
  });

  it("opens under a touch as soon as it lands", () => {
    const { control } = ready();
    fireEvent.pointerDown(control, { clientX: 120, clientY: 90 });
    advance();
    expect(lens()).toMatchObject({ x: 120, y: 90 });
    expect(lens().radius).toBeGreaterThan(0);
  });

  it("cross-fades the lens at full size under reduced motion instead of growing or gliding", () => {
    const { control } = ready();
    setReduced(true);
    fireEvent.pointerMove(control, { clientX: 240, clientY: 170 });
    advance();
    expect(lens()).toEqual({ x: 240, y: 170, radius: 92 });
    expect(reveals.at(-1)).toBeGreaterThan(0);
    expect(reveals.at(-1)).toBeLessThan(1);
    advance(1000);
    expect(reveals.at(-1)).toBe(1);
    expect(pending.size).toBe(0);
    // Keyboard steps land at once, with no travel in between.
    fireEvent.keyDown(control, { key: "ArrowRight" });
    advance();
    expect(lens()).toEqual({ x: 270, y: 170, radius: 92 });
    expect(pending.size).toBe(0);
    // Closing fades the photograph out in place.
    fireEvent.keyDown(control, { key: "Escape" });
    advance(51);
    expect(lens()).toEqual({ x: 270, y: 170, radius: 92 });
    expect(reveals.at(-1)).toBeLessThan(1);
    advance(1000);
    expect(pending.size).toBe(0);
  });

  it("lands a lens in flight when reduced motion turns on", () => {
    const { control } = ready();
    fireEvent.keyDown(control, { key: "Home" });
    fireEvent.keyDown(control, { key: "ArrowRight" });
    advance(34);
    expect(lens().radius).toBeLessThan(92);
    setReduced(true);
    expect(lens()).toEqual({ x: 330, y: 225, radius: 92 });
    expect(reveals.at(-1)).toBe(1);
    // The frame Motion had already requested passes without another draw, and nothing follows it.
    const drawn = main.arc.mock.calls.length;
    advance();
    expect(main.arc.mock.calls.length).toBe(drawn);
    expect(pending.size).toBe(0);
  });

  it("freezes offscreen and carries on from the same frame when it returns", () => {
    const { control } = ready();
    fireEvent.pointerMove(control, { clientX: 240, clientY: 170 });
    advance(51);
    const frozen = lens().radius;
    setVisible(false);
    advance(500);
    expect(pending.size).toBe(0);
    expect(lens().radius).toBe(frozen);
    setVisible(true);
    expect(lens().radius).toBe(frozen);
    advance();
    expect(lens().radius).toBeGreaterThan(frozen);
    advance(1000);
    expect(lens().radius).toBe(92);
  });

  it("shows the original when canvas pixel reads are blocked", () => {
    denied = true;
    const { container } = render(<AsciiLens src="https://example.com/image.webp" alt="Remote picture" />);
    act(() => fireEvent.load(samplers[0]));
    expect(container.querySelector('[data-slot="ascii-lens"]')).toHaveAttribute("data-state", "unsupported");
    expect(container.querySelector("img")).not.toHaveClass("opacity-0");
    expect(main.fillText).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the display image when its separate CORS request is denied", () => {
    const { container } = render(<AsciiLens src="https://example.com/image.webp" alt="Remote picture" />);
    const displayImage = container.querySelector("img")!;
    expect(displayImage.crossOrigin).toBeNull();
    expect(samplers[0].crossOrigin).toBe("anonymous");
    fireEvent.load(displayImage);
    fireEvent.error(samplers[0]);
    expect(container.querySelector('[data-slot="ascii-lens"]')).toHaveAttribute("data-state", "unsupported");
    expect(displayImage).not.toHaveClass("opacity-0");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reports failed loads and omits focusable controls in static mode", () => {
    const { container } = render(<AsciiLens src="/missing.webp" alt="Missing picture" interactive={false} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector('[data-slot="ascii-lens"]')).toHaveAttribute("data-state", "failed");
    expect(screen.getByText("Image unavailable")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
