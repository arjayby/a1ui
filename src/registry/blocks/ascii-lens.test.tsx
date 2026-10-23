import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsciiLens } from "./ascii-lens";

let pending: Map<number, FrameRequestCallback>;
let samplers: HTMLImageElement[];
let denied = false;
let sampleDrawImage: ReturnType<typeof vi.fn>;
let main: {
  fillText: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
};

function advance() {
  act(() => {
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(performance.now()));
  });
}

beforeEach(() => {
  pending = new Map();
  samplers = [];
  denied = false;
  sampleDrawImage = vi.fn();
  vi.stubGlobal("Image", function ImageMock() {
    const sampler = document.createElement("img");
    samplers.push(sampler);
    return sampler;
  });
  let nextId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      isPrimary = true;
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
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
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe() {
        this.callback([{ isIntersecting: true }]);
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
  main = { fillText: vi.fn(), drawImage: vi.fn(), arc: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    if (this.parentElement) {
      return {
        ...main,
        clearRect() {},
        setTransform() {},
        save() {},
        restore() {},
        beginPath() {},
        clip() {},
      } as unknown as CanvasRenderingContext2D;
    }
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
    const control = screen.getByRole("button", { name: /Explore Studio portrait/ });
    fireEvent.pointerMove(control, { clientX: 240, clientY: 170 });
    for (let index = 0; index < 25; index++) advance();
    expect(main.arc).toHaveBeenCalled();
    expect(main.drawImage).toHaveBeenCalled();
    expect(main.drawImage.mock.calls[0][0]).toBe(samplers[0]);
    const previousArcs = main.arc.mock.calls.length;
    fireEvent.keyDown(control, { key: "ArrowRight" });
    advance();
    expect(main.arc.mock.calls.length).toBeGreaterThan(previousArcs);
    fireEvent.keyDown(control, { key: "Escape" });
    for (let index = 0; index < 35; index++) advance();
    expect(pending.size).toBe(0);
    unmount();
    expect(pending.size).toBe(0);
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
